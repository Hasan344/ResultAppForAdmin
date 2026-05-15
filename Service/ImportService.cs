using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Domain.Entities.New;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Application.Services;

public interface IImportService
{
    Task<ImportResult> ImportStudentsAsync(
        Stream xlsxStream,
        string fileName,
        string commissionNo,
        DateOnly examDate,
        string? importedBy,
        CancellationToken ct = default);
}

public record ImportResult(
    int BatchId,
    int Total,
    int Success,
    int Failed,
    List<ImportRowError> Errors);

public record ImportRowError(int Row, string Error);

public class ImportService : IImportService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ImportService> _log;

    public ImportService(AppDbContext db, ILogger<ImportService> log)
    {
        _db = db; _log = log;
    }

    public async Task<ImportResult> ImportStudentsAsync(
        Stream xlsxStream,
        string fileName,
        string commissionNo,
        DateOnly examDate,
        string? importedBy,
        CancellationToken ct = default)
    {
        // 1) Resolve exam_id via Exam_Commissions M:M
        var exam = await _db.Exams
            .Where(e => e.ExamDate == examDate
                     && e.ExamCommissions.Any(ec => ec.Commission.CommissionNo == commissionNo))
            .OrderBy(e => e.Id)
            .FirstOrDefaultAsync(ct)
            ?? throw new InvalidOperationException(
                $"No exam found for commission {commissionNo} on {examDate:yyyy-MM-dd}. " +
                "Make sure Exam_Commissions has the link.");

        // 2) Open workbook
        using var wb = new XLWorkbook(xlsxStream);
        var ws = wb.Worksheet(1);
        var range = ws.RangeUsed();
        if (range is null) throw new InvalidOperationException("Empty worksheet");

        // 3) Header row → column index map (case-insensitive)
        var headerRow = range.FirstRow();
        var col = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var c in headerRow.Cells())
            col[c.GetString().Trim()] = c.Address.ColumnNumber;

        int Need(string name) => col.TryGetValue(name, out var i)
            ? i : throw new InvalidOperationException($"Missing column: {name}");

        int cImtYeri    = Need("IMTYERI_NAME");
        int cImtTarix   = Need("imt_tarix");
        int cQrupNum    = Need("QRUP_NUM");
        int cKodixtisas = Need("KODIXTISAS");
        int cIxtisas    = Need("IXTISAS");
        int cAltNov     = col.GetValueOrDefault("alt nov", 0);  // optional
        int cSNomer     = Need("S_NOMER");
        int cIsN        = Need("is_n");
        int cSoy        = Need("soy");
        int cAdi        = Need("adi");
        int cAta        = Need("ata");
        int cTev        = Need("tev");
        int cCinsi      = Need("cinsi");
        int cFennKod    = col.GetValueOrDefault("FENN_KOD", 0); // optional

        // 4) Create batch first (so failed rows still have audit log)
        var batch = new ImportBatch
        {
            ExamId = exam.Id,
            CommissionNo = commissionNo,
            FileName = fileName,
            ImportedBy = importedBy,
            ImportedAt = DateTime.UtcNow
        };
        _db.ImportBatches.Add(batch);
        await _db.SaveChangesAsync(ct);

        // 5) Iterate data rows
        var errors = new List<ImportRowError>();
        var students = new List<Student>();
        int total = 0, success = 0, failed = 0;

        // Pre-load existing is_n's for this exam to skip duplicates
        var existing = (await _db.Students
    .Where(s => s.ExamId == exam.Id)
    .Select(s => s.IsN)
    .ToListAsync(ct))
    .ToHashSet();

        foreach (var row in range.RowsUsed().Skip(1)) // skip header
        {
            total++;
            int rowNum = row.RowNumber();
            try
            {
                string isN = row.Cell(cIsN).GetString().Trim();
                if (string.IsNullOrWhiteSpace(isN))
                    throw new Exception("is_n boşdur");

                if (existing.Contains(isN))
                {
                    errors.Add(new(rowNum, $"is_n={isN} artıq mövcuddur (duplicate)"));
                    failed++;
                    continue;
                }

                var imtTarixRaw = row.Cell(cImtTarix).GetDateTime();
                var tev = row.Cell(cTev).GetDateTime();
                var cinsi = row.Cell(cCinsi).GetString().Trim().ToLowerInvariant();
                byte gender = cinsi switch
                {
                    "kişi" or "kisi" or "k" or "male" => 1,
                    "qadın" or "qadin" or "q" or "female" => 2,
                    _ => throw new Exception($"Naməlum cinsi: '{cinsi}'")
                };

                var s = new Student
                {
                    ExamId          = exam.Id,
                    ImportBatchId   = batch.Id,
                    SNomer          = (int)row.Cell(cSNomer).GetDouble(),
                    IsN             = isN,
                    Surname         = row.Cell(cSoy).GetString().Trim(),
                    Name            = row.Cell(cAdi).GetString().Trim(),
                    FatherName      = row.Cell(cAta).GetString().Trim(),
                    BirthDate       = DateOnly.FromDateTime(tev),
                    Gender          = gender,
                    QrupNum         = (int)row.Cell(cQrupNum).GetDouble(),
                    Kodixtisas      = row.Cell(cKodixtisas).GetString().Trim(),
                    IxtisasName     = row.Cell(cIxtisas).GetString().Trim(),
                    AltNov          = cAltNov > 0 ? row.Cell(cAltNov).GetString().Trim() : null,
                    FennKod         = cFennKod > 0 && !row.Cell(cFennKod).IsEmpty()
                                        ? (int)row.Cell(cFennKod).GetDouble() : null,
                    ImtYeriName     = row.Cell(cImtYeri).GetString().Trim(),
                    ImtTarixRaw     = imtTarixRaw,
                    Shift           = ResolveShift(imtTarixRaw),
                    CommissionNo    = commissionNo,
                    IsAttended      = false,
                    CreatedAt       = DateTime.UtcNow
                };
                students.Add(s);
                existing.Add(isN);
                success++;
            }
            catch (Exception ex)
            {
                errors.Add(new(rowNum, ex.Message));
                failed++;
            }
        }

        // 6) Bulk insert (chunked for very large files)
        const int chunkSize = 500;
        for (int i = 0; i < students.Count; i += chunkSize)
        {
            _db.Students.AddRange(students.Skip(i).Take(chunkSize));
            await _db.SaveChangesAsync(ct);
        }

        // 7) Update batch totals
        batch.TotalRows   = total;
        batch.SuccessRows = success;
        batch.FailedRows  = failed;
        batch.ErrorLog    = errors.Count > 0
            ? JsonSerializer.Serialize(errors)
            : null;
        await _db.SaveChangesAsync(ct);

        return new ImportResult(batch.Id, total, success, failed, errors);
    }

    /// <summary>
    /// Excel'de imt_tarix saat dilimi shift'i belirtir.
    /// 08:00–10:59 → 1, 11:00–15:59 → 2, 16:00+ → 3 (proje konvansiyonu — DB'ye göre değiştir).
    /// </summary>
    private static byte? ResolveShift(DateTime dt)
    {
        var h = dt.TimeOfDay.Hours;
        if (h is >= 8 and <= 10) return 1;
        if (h is >= 11 and <= 15) return 2;
        if (h >= 16) return 3;
        return null;
    }
}
