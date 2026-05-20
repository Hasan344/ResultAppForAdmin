using System.Globalization;
using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Domain.Entities.New;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Application.Services;

// ────────────────────────────────────────────────────────────────────────────
// Interface
// ────────────────────────────────────────────────────────────────────────────
public interface IResultsImportService
{
    /// <summary>
    /// Excel-dən nəticələri import edir. Format:
    ///   is_n | exercise_code | raw_value | is_refused | notes
    /// Optional: exam_id (yoxdursa is_n-dən tapılır)
    /// Tələbə is_n vasitəsilə tapılır, ScoringService rawValue → bal hesablayır.
    /// </summary>
    Task<ResultsImportResult> ImportResultsAutoAsync(
        Stream xlsxStream,
        string fileName,
        bool overwriteExisting,
        string? importedBy,
        CancellationToken ct = default);
}

// ────────────────────────────────────────────────────────────────────────────
// DTOs
// ────────────────────────────────────────────────────────────────────────────
public record ResultsImportResult(
    int Total,
    int Inserted,
    int Updated,
    int Failed,
    int Duplicates,                              // overwriteExisting=false zamanı skip edilənlər
    List<ResultsImportRowError> Errors,
    Dictionary<string, int> SuccessByCommission);

public record ResultsImportRowError(int Row, string Error);

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────
public class ResultsImportService : IResultsImportService
{
    private readonly AppDbContext _db;
    private readonly IResultsService _results;
    private readonly ILogger<ResultsImportService> _log;

    public ResultsImportService(
        AppDbContext db,
        IResultsService results,
        ILogger<ResultsImportService> log)
    {
        _db = db;
        _results = results;
        _log = log;
    }

    public async Task<ResultsImportResult> ImportResultsAutoAsync(
        Stream xlsxStream,
        string fileName,
        bool overwriteExisting,
        string? importedBy,
        CancellationToken ct = default)
    {
        using var wb = new XLWorkbook(xlsxStream);
        var ws = wb.Worksheet(1);
        var range = ws.RangeUsed()
            ?? throw new InvalidOperationException("Excel faylı boşdur");

        var col = BuildHeaderMap(range);

        // ─── Lookup cache-lər ────────────────────────────────────────────────
        // is_n → student (bütün is_n-lər unikal olmalıdır; əgər deyilsə xəbərdarlıq)
        var studentsByIsN = await _db.Students.AsNoTracking()
            .Select(s => new { s.Id, s.IsN, s.ExamId, s.CommissionNo })
            .ToListAsync(ct);

        // Duplicate is_n yoxlaması (audit üçün)
        var dupIsN = studentsByIsN
            .GroupBy(s => s.IsN)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToHashSet();
        if (dupIsN.Count > 0)
            _log.LogWarning("Duplicate is_n in students: {Count} entries", dupIsN.Count);

        var studentLookup = studentsByIsN
            .GroupBy(s => s.IsN)
            .ToDictionary(g => g.Key, g => g.First());   // duplicate olarsa ilk match

        // exercise_code → id
        var exerciseLookup = await _db.Exercises.AsNoTracking()
            .ToDictionaryAsync(e => e.Code.ToLowerInvariant(), e => e.Id, ct);

        // Mövcud nəticələr (overwrite=false halında duplicate-ləri tapmaq üçün)
        var existingPairs = (await _db.StudentExamResults.AsNoTracking()
            .Select(r => new { r.StudentId, r.ExerciseId })
            .ToListAsync(ct))
            .Select(x => (x.StudentId, x.ExerciseId))
            .ToHashSet();

        // ─── İterasiya ───────────────────────────────────────────────────────
        var errors = new List<ResultsImportRowError>();
        var successByCommission = new Dictionary<string, int>();
        int total = 0, inserted = 0, updated = 0, failed = 0, duplicates = 0;

        foreach (var row in range.RowsUsed().Skip(1))
        {
            total++;
            int rowNum = row.RowNumber();
            try
            {
                // ── Sahələri oxu ─────────────────────────────────────────────
                string isN = CellString(row, col, "is_n", required: true);
                string code = CellString(row, col, "exercise_code", required: true).ToLowerInvariant();

                decimal? rawValue = CellOptDecimal(row, col, "raw_value");
                bool isRefused = CellOptBool(row, col, "is_refused") ?? false;
                string? notes = CellOptString(row, col, "notes");

                // ── Tələbəni tap ─────────────────────────────────────────────
                if (!studentLookup.TryGetValue(isN, out var student))
                    throw new Exception($"is_n={isN} students cədvəlində tapılmadı");

                // ── Exercise-i tap ───────────────────────────────────────────
                if (!exerciseLookup.TryGetValue(code, out var exerciseId))
                    throw new Exception($"exercise_code='{code}' tapılmadı");

                // ── raw_value yoxlaması ──────────────────────────────────────
                if (!isRefused && rawValue is null)
                    throw new Exception("raw_value boşdur və is_refused=false (ya raw_value verin ya da imtina kimi qeyd edin)");

                // ── Duplicate yoxlaması (overwrite=false-da) ─────────────────
                bool alreadyExists = existingPairs.Contains((student.Id, exerciseId));
                if (alreadyExists && !overwriteExisting)
                {
                    duplicates++;
                    errors.Add(new(rowNum,
                        $"Skip: is_n={isN}, exercise={code} — artıq mövcuddur"));
                    continue;
                }

                // ── Upsert (ResultsService scoring işini görür) ──────────────
                await _results.UpsertAsync(new UpsertResultDto(
                    StudentId: student.Id,
                    ExerciseId: exerciseId,
                    RawValue: rawValue,
                    IsRefused: isRefused,
                    FinalScoreOverride: null,           // həmişə avtomatik
                    Notes: notes,
                    RecordedBy: importedBy
                ), ct);

                if (alreadyExists) updated++;
                else
                {
                    inserted++;
                    existingPairs.Add((student.Id, exerciseId));
                }

                successByCommission[student.CommissionNo] =
                    successByCommission.GetValueOrDefault(student.CommissionNo) + 1;
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add(new(rowNum, ex.Message));
                _log.LogDebug("Row {Row} error: {Err}", rowNum, ex.Message);
            }
        }

        return new ResultsImportResult(
            total, inserted, updated, failed, duplicates,
            errors, successByCommission);
    }

    // ════════════════════════════════════════════════════════════════════════
    // KÖMƏKÇI METODLAR
    // ════════════════════════════════════════════════════════════════════════
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
        return cell.CachedValue.ToString().Trim();
    }

    private static string? CellOptString(IXLRangeRow row, Dictionary<string, int> col, string field)
    {
        var v = CellString(row, col, field);
        return string.IsNullOrWhiteSpace(v) ? null : v;
    }

    private static decimal? CellOptDecimal(IXLRangeRow row, Dictionary<string, int> col, string field)
    {
        if (!col.TryGetValue(field, out var idx)) return null;
        var cell = row.Cell(idx);
        if (cell.IsEmpty()) return null;

        if (cell.DataType == XLDataType.Number)
            return (decimal)cell.GetDouble();

        var str = cell.CachedValue.ToString().Trim()
            .Replace(',', '.');   // vergüllü ondalıqlı dəstək
        return decimal.TryParse(str, NumberStyles.Any, CultureInfo.InvariantCulture, out var v)
            ? v : null;
    }

    private static bool? CellOptBool(IXLRangeRow row, Dictionary<string, int> col, string field)
    {
        if (!col.TryGetValue(field, out var idx)) return null;
        var cell = row.Cell(idx);
        if (cell.IsEmpty()) return null;

        if (cell.DataType == XLDataType.Boolean)
            return cell.GetBoolean();

        var v = cell.CachedValue.ToString().Trim().ToLowerInvariant();
        return v switch
        {
            "1" or "true" or "yes" or "bəli" or "beli" or "həmin" or "imtina" => true,
            "0" or "false" or "no" or "xeyr" or "yox" or "" => false,
            _ => null
        };
    }
}
