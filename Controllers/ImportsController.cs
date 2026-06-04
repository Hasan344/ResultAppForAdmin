using ResultAppForAdmin.Api.Application.Services;
using Microsoft.AspNetCore.Mvc;
using ClosedXML.Excel;
using ResultAppForAdmin.Api.Infrastructure.Persistence;
using System.Data.Entity;

namespace ResultAppForAdmin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ImportsController : ControllerBase
{
    private readonly IImportService _import;
    private readonly ILogger<ImportsController> _log;
    private readonly IResultsImportService _results;
    private readonly AppDbContext _db;

    public ImportsController(IImportService import, ILogger<ImportsController> log, IResultsImportService results, AppDbContext db)
    {
        _import = import;
        _log = log;
        _results = results;
        _db = db;
    }

    /// <summary>
    /// AUTO-DETECT: Excel-dəki KODIXTISAS + imt_tarix sütunlarına görə avtomatik bağlayır.
    /// </summary>
    [HttpPost("students/auto")]
    [RequestSizeLimit(50_000_000)]
    public async Task<IActionResult> ImportStudentsAuto(
        IFormFile file,
        CancellationToken ct = default)
    {
        if (file is null || file.Length == 0)
            return BadRequest(Error("Fayl boşdur və ya seçilməyib."));

        if (!Path.GetExtension(file.FileName).Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(Error("Yalnız .xlsx formatı dəstəklənir."));

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await _import.ImportStudentsAutoAsync(
                stream, file.FileName, User?.Identity?.Name, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            // İş qaydası xətaları — istifadəçiyə göstər
            _log.LogWarning(ex, "Import business error: {File}", file.FileName);
            return BadRequest(Error(ex.Message));
        }
        catch (Exception ex)
        {
            // Texniki xəta — tam stack trace-i log-la, istifadəçiyə qısa xəbər ver
            _log.LogError(ex, "Import failed unexpectedly: {File}", file.FileName);
            return StatusCode(500, Error(
                $"Server xətası: {ex.GetType().Name}: {ex.Message}",
                ex.InnerException?.Message));
        }
    }

    /// <summary>
    /// MANUAL: commissionNo + examDate ilə import. Legacy.
    /// </summary>
    [HttpPost("students")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> ImportStudents(
        IFormFile file,
        [FromForm] string commissionNo,
        [FromForm] DateOnly examDate,
        CancellationToken ct = default)
    {
        if (file is null || file.Length == 0)
            return BadRequest(Error("Fayl boşdur."));

        if (!Path.GetExtension(file.FileName).Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(Error("Yalnız .xlsx formatı dəstəklənir."));

        if (string.IsNullOrWhiteSpace(commissionNo))
            return BadRequest(Error("commissionNo boşdur."));

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await _import.ImportStudentsAsync(
                stream, file.FileName, commissionNo, examDate,
                User?.Identity?.Name, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _log.LogWarning(ex, "Import business error: {Com} {Date}", commissionNo, examDate);
            return BadRequest(Error(ex.Message));
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Import failed: {Com} {Date}", commissionNo, examDate);
            return StatusCode(500, Error(
                $"Server xətası: {ex.GetType().Name}: {ex.Message}",
                ex.InnerException?.Message));
        }
    }

    [HttpPost("results/auto")]
    [RequestSizeLimit(50_000_000)]
    public async Task<IActionResult> ImportResultsAuto(
        IFormFile file,
        [FromForm] bool overwrite = false,
        CancellationToken ct = default)
    {
        if (file is null || file.Length == 0)
            return BadRequest(Error("Fayl boşdur."));
        if (!Path.GetExtension(file.FileName).Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(Error("Yalnız .xlsx formatı dəstəklənir."));

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await _results.ImportResultsAutoAsync(
                stream, file.FileName, overwrite, User?.Identity?.Name, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _log.LogWarning(ex, "Results import business error: {File}", file.FileName);
            return BadRequest(Error(ex.Message));
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Results import failed: {File}", file.FileName);
            return StatusCode(500, Error(
                $"Server xətası: {ex.GetType().Name}: {ex.Message}",
                ex.InnerException?.Message));
        }
    }
    [HttpGet("results/template")]
    public IActionResult DownloadResultsTemplate()
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Nəticələr");

        // Header
        ws.Cell(1, 1).Value = "is_n";
        ws.Cell(1, 2).Value = "exercise_code";
        ws.Cell(1, 3).Value = "raw_value";
        ws.Cell(1, 4).Value = "is_refused";
        ws.Cell(1, 5).Value = "notes";
        ws.Cell(1, 6).Value = "appeal_score";       // 0-10, doldurulsa apellyasiya yaranır
        ws.Cell(1, 7).Value = "appeal_raw_value";   // opsional ölçü
        ws.Cell(1, 8).Value = "appeal_decision";    // accepted | partially | rejected
        ws.Cell(1, 9).Value = "appeal_notes";
        ws.Range(1, 1, 1, 9).Style.Font.Bold = true;
        ws.Range(1, 1, 1, 9).Style.Fill.BackgroundColor = XLColor.LightBlue;

        // Nümunə sətrlər
        ws.Cell(2, 1).Value = "134518";
        ws.Cell(2, 2).Value = "sprint_100m";
        ws.Cell(2, 3).Value = 13.4;

        ws.Cell(3, 1).Value = "134518";
        ws.Cell(3, 2).Value = "cross_1000m";
        ws.Cell(3, 3).Value = 245;
        ws.Cell(3, 5).Value = "saniyə ilə";

        ws.Cell(4, 1).Value = "134518";
        ws.Cell(4, 2).Value = "long_jump";
        ws.Cell(4, 4).Value = true;
        ws.Cell(4, 5).Value = "imtina etdi";

        // Apellyasiya nümunəsi: orijinal + apellyasiya birlikdə
        ws.Cell(5, 1).Value = "134518";
        ws.Cell(5, 2).Value = "pull_up";
        ws.Cell(5, 3).Value = 8;
        ws.Cell(5, 6).Value = 9;            // apellyasiya balı
        ws.Cell(5, 8).Value = "accepted";
        ws.Cell(5, 9).Value = "apellyasiya qəbul olundu";

        // Yalnız apellyasiya (orijinal nəticə artıq mövcuddur)
        ws.Cell(6, 1).Value = "134519";
        ws.Cell(6, 2).Value = "sprint_100m";
        ws.Cell(6, 6).Value = 7;
        ws.Cell(6, 8).Value = "partially";

        ws.Columns().AdjustToContents();

        // Köməkçi sheet — exercise kodları
        var helpWs = wb.Worksheets.Add("exercise_codes");
        helpWs.Cell(1, 1).Value = "exercise_code";
        helpWs.Cell(1, 2).Value = "Adı (azərbaycanca)";
        helpWs.Cell(1, 3).Value = "Vahid";
        helpWs.Range(1, 1, 1, 3).Style.Font.Bold = true;

        var exercises = _db.Exercises.AsNoTracking()
            .OrderBy(e => e.DisplayOrder)
            .Select(e => new { e.Code, e.Name, e.Unit })
            .ToList();
        int r = 2;
        foreach (var ex in exercises)
        {
            helpWs.Cell(r, 1).Value = ex.Code;
            helpWs.Cell(r, 2).Value = ex.Name;
            helpWs.Cell(r, 3).Value = ex.Unit;
            r++;
        }
        helpWs.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"nəticələr_şablon_{DateTime.UtcNow:yyyyMMdd}.xlsx");
    }

    // ── Standart xəta cavab strukturu ────────────────────────────────────────
    private static object Error(string message, string? detail = null) =>
        new { error = message, detail };


}