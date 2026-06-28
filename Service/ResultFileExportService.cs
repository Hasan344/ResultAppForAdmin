using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Application.Services;

public interface IResultFileExportService
{
    /// <summary>
    /// Bir imtahan üçün rəsmi nəticə Excel-ini byte[] kimi qaytarır.
    /// qrupNum / commissionNo / altNov opsional filtrlərdir.
    /// altNov verilərsə yalnız həmin alt-ixtisasın tələbələri daxil olunur.
    /// </summary>
    Task<byte[]> ExportAsync(
    int examId,
    int? qrupNum = null,
    string? commissionNo = null,
    string? rescoreKodixtisas = null,   
    string? subProfessionLabel = null,  
    int? fennKod = null,                
    CancellationToken ct = default);
}

public class ResultFileExportService : IResultFileExportService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ResultFileExportService> _log;
    private readonly IScoringService _scoring;

    public ResultFileExportService(AppDbContext db, ILogger<ResultFileExportService> log, IScoringService scoring)
    {
        _db = db;
        _log = log;
        _scoring = scoring;
    }

    private const string AttHeader = "İmt.İştirak(\n1-gəlməyib,\n5-gəlib)";
    private const string ResHeader = "Nəticə\n(true/false)";

    public async Task<byte[]> ExportAsync(
        int examId,
    int? qrupNum = null,
    string? commissionNo = null,
    string? rescoreKodixtisas = null,
    string? subProfessionLabel = null,
    int? fennKod = null,
        CancellationToken ct = default)
    {
        // ── Tələbələr ────────────────────────────────────────────────────────
        var q = _db.Students.AsNoTracking().Where(s => s.ExamId == examId);
        if (qrupNum.HasValue) q = q.Where(s => s.QrupNum == qrupNum.Value);
        if (!string.IsNullOrEmpty(commissionNo)) q = q.Where(s => s.CommissionNo == commissionNo);
      
        var students = await q
            .OrderBy(s => s.QrupNum).ThenBy(s => s.SNomer)
            .ToListAsync(ct);

        if (students.Count == 0)
            throw new InvalidOperationException(
                $"examId={examId} üçün (filtrlərlə) tələbə tapılmadı");

        // ── Keç/qal map-i (view → StudentId → IsPassed) ──────────────────────
        var passMap = new Dictionary<int, bool>(students.Count);
        foreach (var s in students)
        {
            var fr = rescoreKodixtisas is null
                ? await _scoring.CalculateFinalScoreAsync(s.Id, examId, ct)
                : await _scoring.CalculateFinalScoreAsync(s.Id, examId, rescoreKodixtisas, ct);
            passMap[s.Id] = fr.Passed;
        }

        var studentIds = students.Select(s => s.Id).ToList();

        var hasResult = (await _db.StudentExamResults.AsNoTracking()
            .Where(r => r.ExamId == examId && studentIds.Contains(r.StudentId))
            .Select(r => r.StudentId)
            .Distinct()
            .ToListAsync(ct))
            .ToHashSet();

        // ── Workbook ─────────────────────────────────────────────────────────
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Sheet1");

        string[] headers =
        {
            "IMTYERI_NAME", "imt_tarix", "QRUP_NUM", "KODIXTISAS", "IXTISAS",
            "alt nov", "S_NOMER", "is_n", "soy", "adi", "ata", "tev", "cinsi",
            "FENN_KOD", AttHeader, ResHeader
        };
        for (int i = 0; i < headers.Length; i++)
            ws.Cell(1, i + 1).Value = headers[i];
        ws.Row(1).Style.Alignment.WrapText = true;
        ws.Row(1).Style.Font.Bold = true;

        int r = 2;
        foreach (var s in students)
        {
            bool attended = hasResult.Contains(s.Id);
            bool passed = attended && passMap.GetValueOrDefault(s.Id, false);

            ws.Cell(r, 1).Value = s.ImtYeriName;
            ws.Cell(r, 2).Value = s.ImtTarixRaw?.ToString("dd.MM.yyyy HH:mm");
            ws.Cell(r, 3).Value = s.QrupNum;
            ws.Cell(r, 4).Value = s.Kodixtisas;
            ws.Cell(r, 5).Value = s.IxtisasName;
            ws.Cell(r, 6).Value = subProfessionLabel ?? s.AltNov;
            ws.Cell(r, 7).Value = s.SNomer;
            ws.Cell(r, 8).Value = s.IsN;
            ws.Cell(r, 9).Value = s.Surname;
            ws.Cell(r, 10).Value = s.Name;
            ws.Cell(r, 11).Value = s.FatherName;
            ws.Cell(r, 12).Value = s.BirthDate?.ToString("dd.MM.yyyy");
            ws.Cell(r, 13).Value = GenderText(s.Gender);
            ws.Cell(r, 14).Value = fennKod ?? s.FennKod;
            ws.Cell(r, 15).Value = attended ? 5 : 1;
            ws.Cell(r, 16).Value = passed ? 1 : 0;
            r++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);

        _log.LogInformation(
            "ResultFile export: examId={ExamId} qrup={Qrup} comm={Comm} kodixtisas={AltNov} rows={Rows}",
            examId, qrupNum, commissionNo, fennKod, students.Count);

        return ms.ToArray();
    }

    private static string GenderText(byte g) => g switch
    {
        1 => "kişi",
        2 => "qadın",
        _ => ""
    };
}