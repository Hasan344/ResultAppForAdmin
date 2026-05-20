using System.Globalization;
using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Domain.Entities.New;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Application.Services;

// ── Interface ────────────────────────────────────────────────────────────────
public interface IImportService
{
    /// <summary>
    /// AUTO mod: hər sətir öz KODIXTISAS + imt_tarix-ə görə uyğun exam-a bağlanır.
    /// Bir Excel faylında 25+ komissiya və 10+ tarix ola bilər.
    /// </summary>
    Task<ImportResult> ImportStudentsAutoAsync(
        Stream xlsxStream,
        string fileName,
        string? importedBy,
        CancellationToken ct = default);

    /// <summary>
    /// MANUAL mod: tək commissionNo + examDate ilə. Legacy endpoint üçün saxlanır.
    /// </summary>
    Task<ImportResult> ImportStudentsAsync(
        Stream xlsxStream,
        string fileName,
        string commissionNo,
        DateOnly examDate,
        string? importedBy,
        CancellationToken ct = default);
}

// ── DTOs ─────────────────────────────────────────────────────────────────────
public record ImportResult(
    int BatchId,
    int Total,
    int Success,
    int Failed,
    List<ImportRowError> Errors,
    Dictionary<string, int> SuccessByCommission);

public record ImportRowError(int Row, string Error);

// ── Service ───────────────────────────────────────────────────────────────────
public class ImportService : IImportService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ImportService> _log;

    public ImportService(AppDbContext db, ILogger<ImportService> log)
    {
        _db = db;
        _log = log;
    }

    // ════════════════════════════════════════════════════════════════════════
    // AUTO MOD
    // ════════════════════════════════════════════════════════════════════════
    public async Task<ImportResult> ImportStudentsAutoAsync(
        Stream xlsxStream,
        string fileName,
        string? importedBy,
        CancellationToken ct = default)
    {
        using var wb = new XLWorkbook(xlsxStream);
        var ws = wb.Worksheet(1);
        var range = ws.RangeUsed()
            ?? throw new InvalidOperationException("Excel faylı boşdur");

        var col = BuildHeaderMap(range);

        // Exam cache: (commissionNo, examDate) → examId
        // Eyni gündə 2 növbə varsa ikisini də saxla, sonra saat ilə ayır
        var allExams = await _db.Exams.AsNoTracking()
            .Include(e => e.ExamCommissions).ThenInclude(ec => ec.Commission)
            .Select(e => new ExamInfo(
                e.Id,
                e.ExamDate,
                e.StartTime,
                e.ExamCommissions.Select(ec => ec.Commission.CommissionNo).ToArray()))
            .ToListAsync(ct);

        // Bina cache: normalize(name) → id
        // Duplicate adlara dözümlü: eyni ada sahib bina varsa ilk match-i götür
        var buildingCache = (await _db.ExamBuildings.AsNoTracking()
                .Select(b => new { b.Id, b.Name })
                .ToListAsync(ct))
            .GroupBy(b => NormalizeText(b.Name))
            .Where(g => !string.IsNullOrEmpty(g.Key))
            .ToDictionary(g => g.Key, g => g.First().Id);

        // Hər examId üçün ayrıca batch + is_n set-i
        var batches = new Dictionary<int, ImportBatch>();
        var existingIsN = new Dictionary<int, HashSet<string>>();

        var errors = new List<ImportRowError>();
        var students = new List<Student>();
        var successByCommission = new Dictionary<string, int>();
        int total = 0, success = 0, failed = 0;

        foreach (var row in range.RowsUsed().Skip(1))
        {
            total++;
            int rowNum = row.RowNumber();
            try
            {
                // ── Sahələri oxu ───────────────────────────────────────────
                string isN = CellString(row, col, "is_n", required: true);
                string kodixtisas = CellString(row, col, "KODIXTISAS", required: true);
                string imtYeri = CellString(row, col, "IMTYERI_NAME");
                DateTime imtTarix = CellDateTime(row, col, "imt_tarix");
                int qrupNum = CellInt(row, col, "QRUP_NUM");
                int? sNomer = CellOptInt(row, col, "S_NOMER");   // nullable
                string ixtisas = CellString(row, col, "IXTISAS");
                string? altNov = CellOptString(row, col, "alt nov");
                string ata = CellString(row, col, "ata");
                string soy = CellString(row, col, "soy", required: true);
                string adi = CellString(row, col, "adi", required: true);
                DateTime? tev = CellOptDateTime(row, col, "tev");
                string cinsi = CellString(row, col, "cinsi").ToLowerInvariant();
                int? fennKod = CellOptInt(row, col, "FENN_KOD");

                // ── Exam tapma ────────────────────────────────────────────
                var examDate = DateOnly.FromDateTime(imtTarix);
                var examTime = TimeOnly.FromDateTime(imtTarix);
                int examId = ResolveExamId(allExams, kodixtisas, examDate, examTime);

                // ── Batch lazımdırsa yarat ────────────────────────────────
                if (!batches.TryGetValue(examId, out var batch))
                {
                    batch = new ImportBatch
                    {
                        ExamId = examId,
                        CommissionNo = kodixtisas,
                        FileName = fileName,
                        ImportedBy = importedBy,
                        ImportedAt = DateTime.UtcNow
                    };
                    _db.ImportBatches.Add(batch);
                    await _db.SaveChangesAsync(ct);
                    batches[examId] = batch;

                    existingIsN[examId] = (await _db.Students
                        .Where(s => s.ExamId == examId)
                        .Select(s => s.IsN)
                        .ToListAsync(ct))
                        .ToHashSet(StringComparer.OrdinalIgnoreCase);
                }

                // ── Duplicate ─────────────────────────────────────────────
                if (existingIsN[examId].Contains(isN))
                {
                    errors.Add(new(rowNum, $"is_n={isN} bu exam üçün artıq mövcuddur"));
                    failed++;
                    continue;
                }

                // ── Bina (optional, xəta vermir) ──────────────────────────
                buildingCache.TryGetValue(NormalizeText(imtYeri), out int buildingId);

                // ── Gender ────────────────────────────────────────────────
                byte gender = ParseGender(cinsi);

                // ── Student ───────────────────────────────────────────────
                var s = new Student
                {
                    ExamId = examId,
                    ImportBatchId = batch.Id,
                    SNomer = sNomer,
                    IsN = isN,
                    Surname = soy.Trim(),
                    Name = adi.Trim(),
                    FatherName = NullIfEmpty(ata),
                    BirthDate = tev.HasValue ? DateOnly.FromDateTime(tev.Value) : null,
                    Gender = gender,
                    QrupNum = qrupNum,
                    Kodixtisas = kodixtisas,
                    IxtisasName = ixtisas.Trim(),
                    AltNov = altNov,
                    FennKod = fennKod,
                    ImtYeriName = NullIfEmpty(imtYeri),
                    ImtTarixRaw = imtTarix,
                    Shift = ResolveShift(imtTarix),
                    CommissionNo = kodixtisas,
                    IsAttended = false,
                    CreatedAt = DateTime.UtcNow
                };

                students.Add(s);
                existingIsN[examId].Add(isN);
                success++;
                successByCommission[kodixtisas] =
                    successByCommission.GetValueOrDefault(kodixtisas) + 1;
            }
            catch (Exception ex)
            {
                errors.Add(new(rowNum, ex.Message));
                failed++;
                _log.LogDebug("Row {Row} error: {Err}", rowNum, ex.Message);
            }
        }

        // ── Toplu insert ──────────────────────────────────────────────────
        await BulkInsert(students, ct);

        // ── Batch totallarını yenilə ──────────────────────────────────────
        foreach (var b in batches.Values)
        {
            b.SuccessRows = students.Count(s => s.ImportBatchId == b.Id);
            b.TotalRows = b.SuccessRows;
        }
        if (errors.Count > 0 && batches.Count > 0)
            batches.Values.First().ErrorLog = JsonSerializer.Serialize(errors);

        await _db.SaveChangesAsync(ct);

        int primaryBatch = batches.Values.FirstOrDefault()?.Id ?? 0;
        return new ImportResult(primaryBatch, total, success, failed, errors, successByCommission);
    }

    // ════════════════════════════════════════════════════════════════════════
    // MANUAL MOD
    // ════════════════════════════════════════════════════════════════════════
    public async Task<ImportResult> ImportStudentsAsync(
        Stream xlsxStream,
        string fileName,
        string commissionNo,
        DateOnly examDate,
        string? importedBy,
        CancellationToken ct = default)
    {
        var exam = await _db.Exams
            .Where(e => e.ExamDate == examDate
                     && e.ExamCommissions.Any(ec => ec.Commission.CommissionNo == commissionNo))
            .OrderBy(e => e.Id)
            .FirstOrDefaultAsync(ct)
            ?? throw new InvalidOperationException(
                $"{commissionNo} komissiyası üçün {examDate:yyyy-MM-dd} tarixində " +
                "Exam_Commissions-da imtahan tapılmadı.");

        using var wb = new XLWorkbook(xlsxStream);
        var ws = wb.Worksheet(1);
        var range = ws.RangeUsed()
                          ?? throw new InvalidOperationException("Excel faylı boşdur");
        var col = BuildHeaderMap(range);

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

        var existing = (await _db.Students
            .Where(s => s.ExamId == exam.Id)
            .Select(s => s.IsN)
            .ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var errors = new List<ImportRowError>();
        var students = new List<Student>();
        int total = 0, success = 0, failed = 0;

        foreach (var row in range.RowsUsed().Skip(1))
        {
            total++;
            int rowNum = row.RowNumber();
            try
            {
                string isN = CellString(row, col, "is_n", required: true);
                string soy = CellString(row, col, "soy", required: true);
                string adi = CellString(row, col, "adi", required: true);
                string ata = CellString(row, col, "ata");
                string cinsi = CellString(row, col, "cinsi").ToLowerInvariant();
                DateTime imtT = CellDateTime(row, col, "imt_tarix");
                DateTime? tev = CellOptDateTime(row, col, "tev");

                if (existing.Contains(isN))
                {
                    errors.Add(new(rowNum, $"is_n={isN} artıq mövcuddur"));
                    failed++;
                    continue;
                }

                var s = new Student
                {
                    ExamId = exam.Id,
                    ImportBatchId = batch.Id,
                    SNomer = CellOptInt(row, col, "S_NOMER"),
                    IsN = isN,
                    Surname = soy.Trim(),
                    Name = adi.Trim(),
                    FatherName = NullIfEmpty(ata),
                    BirthDate = tev.HasValue ? DateOnly.FromDateTime(tev.Value) : null,
                    Gender = ParseGender(cinsi),
                    QrupNum = CellInt(row, col, "QRUP_NUM"),
                    Kodixtisas = CellString(row, col, "KODIXTISAS"),
                    IxtisasName = CellString(row, col, "IXTISAS"),
                    AltNov = CellOptString(row, col, "alt nov"),
                    FennKod = CellOptInt(row, col, "FENN_KOD"),
                    ImtYeriName = NullIfEmpty(CellString(row, col, "IMTYERI_NAME")),
                    ImtTarixRaw = imtT,
                    Shift = ResolveShift(imtT),
                    CommissionNo = commissionNo,
                    IsAttended = false,
                    CreatedAt = DateTime.UtcNow
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

        await BulkInsert(students, ct);

        batch.TotalRows = total;
        batch.SuccessRows = success;
        batch.FailedRows = failed;
        batch.ErrorLog = errors.Count > 0 ? JsonSerializer.Serialize(errors) : null;
        await _db.SaveChangesAsync(ct);

        return new ImportResult(
            batch.Id, total, success, failed, errors,
            new Dictionary<string, int> { [commissionNo] = success });
    }

    // ════════════════════════════════════════════════════════════════════════
    // KÖMƏKÇI METODLAR
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Header sətirini oxuyub sütun adı → index map-i qaytar.
    /// </summary>
    private static Dictionary<string, int> BuildHeaderMap(IXLRange range)
    {
        var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var c in range.FirstRow().Cells())
        {
            var name = c.GetString().Trim();
            if (!string.IsNullOrEmpty(name) && !map.ContainsKey(name))
                map[name] = c.Address.ColumnNumber;
        }
        return map;
    }

    /// <summary>
    /// Hər hansı tipde olan hüceyrəni string kimi oxu (int, double, text fərq etmir).
    /// </summary>
    private static string CellString(IXLRangeRow row, Dictionary<string, int> col,
        string field, bool required = false)
    {
        if (!col.TryGetValue(field, out var idx))
        {
            if (required) throw new InvalidOperationException($"'{field}' sütunu tapılmadı");
            return "";
        }
        var cell = row.Cell(idx);
        if (cell.IsEmpty())
        {
            if (required) throw new Exception($"'{field}' boşdur");
            return "";
        }
        // CachedValue.ToString() int, double, datetime, text — hamısını string qaytarır
        return cell.CachedValue.ToString().Trim();
    }

    private static string? CellOptString(IXLRangeRow row, Dictionary<string, int> col, string field)
    {
        var v = CellString(row, col, field);
        return string.IsNullOrWhiteSpace(v) ? null : v;
    }

    private static int CellInt(IXLRangeRow row, Dictionary<string, int> col, string field)
    {
        if (!col.TryGetValue(field, out var idx))
            throw new InvalidOperationException($"'{field}' sütunu tapılmadı");
        var cell = row.Cell(idx);
        if (cell.IsEmpty()) throw new Exception($"'{field}' boşdur");
        if (cell.DataType == XLDataType.Number) return (int)cell.GetDouble();
        var str = cell.CachedValue.ToString().Trim();
        if (int.TryParse(str, NumberStyles.Any, CultureInfo.InvariantCulture, out var v)) return v;
        throw new Exception($"'{field}' rəqəm deyil: '{str}'");
    }

    private static int? CellOptInt(IXLRangeRow row, Dictionary<string, int> col, string field)
    {
        if (!col.TryGetValue(field, out var idx)) return null;
        var cell = row.Cell(idx);
        if (cell.IsEmpty()) return null;
        if (cell.DataType == XLDataType.Number) return (int)cell.GetDouble();
        var str = cell.CachedValue.ToString().Trim();
        return int.TryParse(str, NumberStyles.Any, CultureInfo.InvariantCulture, out var v) ? v : null;
    }

    private static DateTime CellDateTime(IXLRangeRow row, Dictionary<string, int> col, string field)
    {
        if (!col.TryGetValue(field, out var idx))
            throw new InvalidOperationException($"'{field}' sütunu tapılmadı");
        var cell = row.Cell(idx);
        if (cell.IsEmpty()) throw new Exception($"'{field}' boşdur");
        try { return cell.GetDateTime(); }
        catch { throw new Exception($"'{field}' tarix formatında deyil: '{cell.CachedValue}'"); }
    }

    private static DateTime? CellOptDateTime(IXLRangeRow row, Dictionary<string, int> col, string field)
    {
        if (!col.TryGetValue(field, out var idx)) return null;
        var cell = row.Cell(idx);
        if (cell.IsEmpty()) return null;
        try { return cell.GetDateTime(); }
        catch { return null; }
    }

    /// <summary>
    /// KODIXTISAS + tarix + saat ilə uyğun examId tapır.
    /// </summary>
    private static int ResolveExamId(
        List<ExamInfo> all, string commissionNo, DateOnly date, TimeOnly time)
    {
        var candidates = all
            .Where(e => e.ExamDate == date && e.CommissionNos.Contains(commissionNo))
            .ToList();

        if (candidates.Count == 0)
            throw new InvalidOperationException(
                $"Komissiya {commissionNo} üçün {date:yyyy-MM-dd} tarixində " +
                "Exam_Commissions-da imtahan tapılmadı. " +
                "ForQab-da Exam_Commissions cədvəlini yoxlayın.");

        if (candidates.Count == 1)
            return candidates[0].Id;

        // Eyni gündə birdən çox imtahan → saata ən yaxın startTime-ı seç
        var best = candidates
            .Where(e => e.StartTime.HasValue)
            .OrderBy(e => Math.Abs(
                (e.StartTime!.Value.ToTimeSpan() - time.ToTimeSpan()).TotalMinutes))
            .FirstOrDefault();

        return (best ?? candidates[0]).Id;
    }

    private static byte ParseGender(string cinsi) => cinsi switch
    {
        "kişi" or "kisi" or "k" or "male" => 1,
        "qadın" or "qadin" or "q" or "female" => 2,
        _ => throw new Exception($"Naməlum cinsi dəyəri: '{cinsi}'")
    };

    private static byte? ResolveShift(DateTime dt) => dt.Hour switch
    {
        >= 0 and < 11 => 1,
        >= 11 and < 15 => 2,
        _ => 3
    };

    private static string NormalizeText(string? s) =>
        string.IsNullOrWhiteSpace(s) ? "" :
        System.Text.RegularExpressions.Regex
            .Replace(s.Trim(), @"\s+", " ")
            .ToLowerInvariant();

    private static string? NullIfEmpty(string? s) =>
        string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private async Task BulkInsert(List<Student> students, CancellationToken ct)
    {
        const int chunk = 500;
        for (int i = 0; i < students.Count; i += chunk)
        {
            _db.Students.AddRange(students.Skip(i).Take(chunk));
            await _db.SaveChangesAsync(ct);
        }
    }

    // ── Köməkçi record ────────────────────────────────────────────────────
    private record ExamInfo(int Id, DateOnly ExamDate, TimeOnly? StartTime, string[] CommissionNos);
}