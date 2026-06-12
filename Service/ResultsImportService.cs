using System.Globalization;
using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Domain.Entities.Existing;
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
    /// Opsional apellyasiya sütunları:
    ///   appeal_score | appeal_raw_value | appeal_decision | appeal_notes
    /// appeal_score VƏ YA appeal_raw_value doldurulduğu sətirlərdə
    /// student_appeal_results-a upsert edilir.
    ///   • appeal_score verilibsə      → ekspert override (0-10).
    ///   • yalnız appeal_raw_value isə → orijinal nəticələr kimi ScoringService
    ///                                    xam dəyər → bal hesablayır.
    /// Tələbə (is_n, commission_no) cütü ilə tapılır.
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
    int Duplicates,                              // overwriteExisting=false zamanı skip edilən orijinal nəticələr
    int AppealsInserted,                         // yeni yaradılan apellyasiya nəticələri
    int AppealsUpdated,                          // yenilənən apellyasiya nəticələri
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
    private readonly IScoringService _scoring;
    private readonly ILogger<ResultsImportService> _log;

    public ResultsImportService(
        AppDbContext db,
        IResultsService results,
        IScoringService scoring,
        ILogger<ResultsImportService> log)
    {
        _db = db;
        _results = results;
        _scoring = scoring;
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
        // is_n → student. Apellyasiya balını avtomatik hesablamaq üçün
        // Gender / BirthDate / AltNov / ExamDate də lazımdır (ScoringService).
        var studentsByIsN = await _db.Students.AsNoTracking()
            .Select(s => new
            {
                s.Id,
                s.IsN,
                s.ExamId,
                s.CommissionNo,
                s.Gender,
                s.BirthDate,
                s.AltNov,
                ExamDate = s.Exam.ExamDate
            })
            .ToListAsync(ct);

        // Bileşik anahtar: (is_n, commission_no)
        var studentLookup = studentsByIsN
            .GroupBy(s => (IsN: s.IsN, Comm: s.CommissionNo.Trim()))
            .ToDictionary(g => g.Key, g => g.First());

        // Artık duplicate uyarısı da bileşik anahtara göre olmalı
        var dupKeys = studentsByIsN
            .GroupBy(s => (s.IsN, s.CommissionNo.Trim()))
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();
        if (dupKeys.Count > 0)
            _log.LogWarning("Duplicate (is_n, commission_no): {Count}", dupKeys.Count);

        // exercise_code → id
        var exerciseLookup = await _db.Exercises.AsNoTracking()
            .ToDictionaryAsync(e => e.Code.ToLowerInvariant(), e => e.Id, ct);

        // Mövcud orijinal nəticələr — həm duplicate yoxlaması, həm də apellyasiya
        // previous_score üçün final_score lazımdır.
        var existingResults = await _db.StudentExamResults.AsNoTracking()
            .Select(r => new { r.StudentId, r.ExerciseId, r.FinalScore })
            .ToListAsync(ct);

        var existingPairs = existingResults
            .Select(x => (x.StudentId, x.ExerciseId))
            .ToHashSet();

        // (studentId, exerciseId) → orijinal final_score (apellyasiya previous_score üçün)
        var originalScoreLookup = existingResults
            .GroupBy(x => (x.StudentId, x.ExerciseId))
            .ToDictionary(g => g.Key, g => (byte?)g.First().FinalScore);

        // ─── İterasiya ───────────────────────────────────────────────────────
        var errors = new List<ResultsImportRowError>();
        var successByCommission = new Dictionary<string, int>();
        int total = 0, inserted = 0, updated = 0, failed = 0, duplicates = 0;
        int appealsInserted = 0, appealsUpdated = 0;

        foreach (var row in range.RowsUsed().Skip(1))
        {
            total++;
            int rowNum = row.RowNumber();
            try
            {
                // ── Əsas sahələri oxu ────────────────────────────────────────
                string isN = CellString(row, col, "is_n", required: true);
                string code = CellString(row, col, "exercise_code", required: true).ToLowerInvariant();
                string commissionNo = CellString(row, col, "commission_no", required: true).Trim();

                decimal? rawValue = CellOptDecimal(row, col, "raw_value");
                bool isRefused = CellOptBool(row, col, "is_refused") ?? false;
                string? notes = CellOptString(row, col, "notes");

                // ── Apellyasiya sahələri (opsional) ──────────────────────────
                // appeal_score → ekspert override (0-10). appeal_raw_value → xam ölçü
                // (məs. 100 m-də 12.98 san) → bal avtomatik hesablanır.
                byte? appealScoreManual = CellOptScore(row, col, "appeal_score");
                decimal? appealRaw = CellOptDecimal(row, col, "appeal_raw_value");
                string? appealDecision = CellOptString(row, col, "appeal_decision");
                string? appealNotes = CellOptString(row, col, "appeal_notes");

                if (!studentLookup.TryGetValue((isN, commissionNo), out var student))
                    throw new Exception($"is_n={isN}, commission_no={commissionNo} students cədvəlində tapılmadı");

                // ── Exercise-i tap ───────────────────────────────────────────
                if (!exerciseLookup.TryGetValue(code, out var exerciseId))
                    throw new Exception($"exercise_code='{code}' tapılmadı");

                bool hasOriginal = isRefused || rawValue is not null;
                bool hasAppeal = appealScoreManual is not null || appealRaw is not null;

                if (!hasOriginal && !hasAppeal)
                    throw new Exception(
                        "Bu sətirdə nə nəticə (raw_value / is_refused) " +
                        "nə də apellyasiya (appeal_score / appeal_raw_value) datası var");

                // Eyni sətirdə yeni import edilən orijinal balı (apellyasiya previous_score üçün)
                byte? freshFinalScore = null;

                // ════ ORİJİNAL NƏTİCƏ ════════════════════════════════════════
                if (hasOriginal)
                {
                    bool alreadyExists = existingPairs.Contains((student.Id, exerciseId));
                    if (alreadyExists && !overwriteExisting)
                    {
                        // Orijinal əzilmir, amma apellyasiya yenə də emal olunur (aşağıda).
                        duplicates++;
                        errors.Add(new(rowNum,
                            $"Skip: is_n={isN}, exercise={code} — nəticə artıq mövcuddur"));
                    }
                    else
                    {
                        var saved = await _results.UpsertAsync(new UpsertResultDto(
                            StudentId: student.Id,
                            ExerciseId: exerciseId,
                            RawValue: rawValue,
                            IsRefused: isRefused,
                            FinalScoreOverride: null,           // həmişə avtomatik
                            Notes: notes,
                            RecordedBy: importedBy
                        ), ct);

                        freshFinalScore = (byte?)saved.FinalScore;

                        if (alreadyExists) updated++;
                        else
                        {
                            inserted++;
                            existingPairs.Add((student.Id, exerciseId));
                        }

                        successByCommission[student.CommissionNo] =
                            successByCommission.GetValueOrDefault(student.CommissionNo) + 1;
                    }
                }

                // ════ APELLYASİYA NƏTİCƏSİ ═══════════════════════════════════
                if (hasAppeal)
                {
                    // Apellyasiya balını təyin et:
                    //   • appeal_score açıq verilibsə → ekspert override (0-10)
                    //   • yalnız appeal_raw_value verilibsə → orijinal nəticələr kimi
                    //     ScoringService ilə xam dəyər → bal hesabla.
                    byte appealFinal;
                    if (appealScoreManual is not null)
                    {
                        appealFinal = appealScoreManual.Value;
                    }
                    else
                    {
                        int age = student.BirthDate is null ? 0
                            : _scoring.CalculateAge(student.BirthDate.Value, student.ExamDate);

                        appealFinal = await _scoring.CalculateAsync(
                            student.CommissionNo,
                            student.AltNov,
                            exerciseId,
                            student.Gender,
                            age,
                            appealRaw,
                            refused: false,
                            ct);
                    }

                    // previous_score: əvvəlcə bu importda hesablanan bal, yoxdursa mövcud orijinal bal
                    byte? prev = freshFinalScore
                        ?? (originalScoreLookup.TryGetValue((student.Id, exerciseId), out var fs) ? fs : null);

                    var appeal = await _db.StudentAppealResults
                        .FirstOrDefaultAsync(r => r.StudentId == student.Id && r.ExerciseId == exerciseId, ct);

                    if (appeal is null)
                    {
                        _db.StudentAppealResults.Add(new StudentAppealResult
                        {
                            StudentId = student.Id,
                            ExamId = student.ExamId,
                            ExerciseId = exerciseId,
                            RawValue = appealRaw,
                            AppealScore = appealFinal,
                            PreviousScore = prev,
                            Decision = ResolveDecision(appealDecision, appealFinal, prev),
                            Notes = appealNotes,
                            RecordedBy = importedBy,
                            RecordedAt = DateTime.UtcNow
                        });
                        appealsInserted++;
                    }
                    else
                    {
                        appeal.RawValue = appealRaw;
                        appeal.AppealScore = appealFinal;
                        appeal.Decision = ResolveDecision(appealDecision, appealFinal, prev);
                        appeal.Notes = appealNotes;
                        if (prev is not null) appeal.PreviousScore = prev;
                        appeal.RecordedBy = importedBy;
                        appeal.UpdatedAt = DateTime.UtcNow;
                        appealsUpdated++;
                    }

                    await _db.SaveChangesAsync(ct);
                }
            }
            catch (Exception ex)
            {
                failed++;
                var msg = ex.GetBaseException().Message;   // asıl SQL hatası burada
                errors.Add(new(rowNum, msg));
                _log.LogWarning(ex, "Row {Row} error", rowNum);   // Debug yerine Warning
            }
        }

        return new ResultsImportResult(
            total, inserted, updated, failed, duplicates,
            appealsInserted, appealsUpdated,
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

    /// <summary>
    /// Apellyasiya balını oxu (0-10 aralığı). Boşdursa null qaytarır.
    /// QEYD: bu yalnız appeal_score sütunu üçündür — bu sütun BALdır (0-10),
    /// xam ölçü deyil. Xam dəyər (məs. 12.98 san) appeal_raw_value sütununa yazılır.
    /// </summary>
    private static byte? CellOptScore(IXLRangeRow row, Dictionary<string, int> col, string field)
    {
        var d = CellOptDecimal(row, col, field);
        if (d is null) return null;

        var v = (int)Math.Round(d.Value, MidpointRounding.AwayFromZero);
        if (v < 0 || v > 10)
            throw new Exception($"'{field}' 0-10 aralığında olmalıdır: '{d}'");
        return (byte)v;
    }

    /// <summary>
    /// Qərarı normalize et → dəyişdi | dəyişmədi.
    /// Açıq dəyər verilibsə onu götürür; boşdursa apellyasiya balı ilə əvvəlki
    /// balı müqayisə edib avtomatik təyin edir (fərqlidirsə "dəyişdi").
    /// </summary>
    private static string ResolveDecision(string? raw, byte appealScore, byte? previousScore)
    {
        if (!string.IsNullOrWhiteSpace(raw))
        {
            var v = raw.Trim().ToLowerInvariant();
            if (v is "dəyişdi" or "deyisdi" or "changed" or "accepted"
                  or "1" or "true" or "bəli" or "beli" or "var")
                return "dəyişdi";
            if (v is "dəyişmədi" or "deyismedi" or "unchanged" or "rejected"
                  or "0" or "false" or "xeyr" or "yox")
                return "dəyişmədi";
            // tanınmayan dəyər → aşağıdakı avtomatik məntiqə düş
        }

        // Avtomatik: əvvəlki bal yoxdursa və ya apellyasiya balı fərqlidirsə "dəyişdi"
        if (previousScore is null) return "dəyişdi";
        return appealScore != previousScore.Value ? "dəyişdi" : "dəyişmədi";
    }
}