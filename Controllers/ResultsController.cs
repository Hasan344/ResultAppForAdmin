using ResultAppForAdmin.Api.Application.DTOs;
using ResultAppForAdmin.Api.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ResultsController : ControllerBase
{
    private readonly IResultsService _svc;
    private readonly IScoringService _scoring;
    private readonly AppDbContext _db;

    public ResultsController(IResultsService svc, IScoringService scoring, AppDbContext db)
    {
        _svc = svc; _scoring = scoring; _db = db;
    }

    /// <summary>Get all results for one student</summary>
    [HttpGet("by-student/{studentId:int}")]
    public async Task<IEnumerable<ResultDto>> ByStudent(int studentId, CancellationToken ct) =>
        await _db.StudentExamResults.AsNoTracking()
            .Include(r => r.Exercise)
            .Where(r => r.StudentId == studentId)
            .Select(r => new ResultDto(
                r.Id, r.StudentId, r.ExerciseId, r.Exercise.Code,
                r.RawValue, r.CalculatedScore, r.FinalScore,
                r.IsRefused, r.Notes, r.RecordedAt))
            .ToListAsync(ct);

    /// <summary>Insert or update a single result</summary>
    [HttpPost]
    public async Task<ResultDto> Upsert([FromBody] UpsertResultDto dto, CancellationToken ct)
    {
        var saved = await _svc.UpsertAsync(dto with { RecordedBy = dto.RecordedBy ?? User?.Identity?.Name }, ct);
        var exCode = await _db.Exercises.Where(x => x.Id == saved.ExerciseId)
            .Select(x => x.Code).FirstAsync(ct);
        return new ResultDto(saved.Id, saved.StudentId, saved.ExerciseId, exCode,
            saved.RawValue, saved.CalculatedScore, saved.FinalScore,
            saved.IsRefused, saved.Notes, saved.RecordedAt);
    }

    /// <summary>Bulk upsert (used by external systems / Excel import of results)</summary>
    [HttpPost("bulk")]
    public async Task<BulkUpsertResult> Bulk([FromBody] List<UpsertResultDto> dtos, CancellationToken ct)
        => await _svc.BulkUpsertAsync(dtos, ct);

    /// <summary>Recalculate calculated_score for all results in an exam (after rule changes)</summary>
    [HttpPost("recalculate/{examId:int}")]
    public async Task<IActionResult> Recalculate(int examId, CancellationToken ct)
    {
        var changed = await _svc.RecalculateForExamAsync(examId, ct);
        return Ok(new { changed });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 62-ci komissiya: ALT-İXTİSAS BAL KIRILIMI (UFH/ABT/KSI)
    //
    // Tələbənin EYNİ ham dəyərlərini komissiyanın hər alt-ixtisası üçün ayrı-ayrı
    // puanlayır. Hər hareket üçün rəsmi ScoringService.CalculateAsync çağırılır,
    // beləliklə puanlama sistemin qalanı ilə birebir eyni olur (imtina → yalnız o
    // hərəkət 0; unit=="score" → ham dəyər passthrough; əks halda scoring_rules).
    //
    // Keçid həddi 62 üçün sabit 24 baldır. Kırılım RAW-dan hesablanır, apellyasiya
    // override-larını nəzərə almır (B yorumu: ham performansın 3 normativ qarşısı).
    // ────────────────────────────────────────────────────────────────────────

    private const int PassThreshold62 = 24; // 62-ci komissiya: bütün alt-ixtisaslar
    private static readonly string[] SubProfOrder = { "UFH", "ABT", "KSI" };

    [HttpGet("by-student/{studentId:int}/subprofession-breakdown")]
    public async Task<ActionResult<SubProfessionBreakdownDto>> SubProfessionBreakdown(
        int studentId, CancellationToken ct)
    {
        // 1. Tələbə + imtahan tarixi
        var student = await _db.Students.AsNoTracking()
            .Where(s => s.Id == studentId)
            .Select(s => new
            {
                s.Id,
                s.IsN,
                s.Name,
                s.Surname,
                s.FatherName,
                s.Gender,
                s.BirthDate,
                s.CommissionNo,
                s.ExamId,
                s.AltNov
            })
            .FirstOrDefaultAsync(ct);

        if (student is null) return NotFound();

        var examDate = await _db.Exams.AsNoTracking()
            .Where(e => e.Id == student.ExamId)
            .Select(e => (DateOnly?)e.ExamDate)
            .FirstOrDefaultAsync(ct);

        int age = (student.BirthDate is null || examDate is null)
            ? 0
            : _scoring.CalculateAge(student.BirthDate.Value, examDate.Value);

        // 2. Tələbənin gerçəkdən verdiyi nəticələr (hareket başına RAW)
        var results = await _db.StudentExamResults.AsNoTracking()
            .Include(r => r.Exercise)
            .Where(r => r.StudentId == studentId)
            .Select(r => new
            {
                r.ExerciseId,
                r.RawValue,
                r.IsRefused,
                Code = r.Exercise.Code,
                Name = r.Exercise.Name,
                DisplayOrder = r.Exercise.DisplayOrder
            })
            .ToListAsync(ct);

        var orderedResults = results.OrderBy(r => r.DisplayOrder).ToList();

        // 3. Alt-ixtisaslar = bu komissiyanın aktiv qaydalarındakı fərqli kodixtisas-lar
        var subProfs = await _db.ScoringRules.AsNoTracking()
            .Where(r => r.CommissionNo == student.CommissionNo && r.IsActive && r.Kodixtisas != null)
            .Select(r => r.Kodixtisas!)
            .Distinct()
            .ToListAsync(ct);

        subProfs = subProfs
            .OrderBy(k =>
            {
                var i = Array.IndexOf(SubProfOrder, k);
                return i < 0 ? int.MaxValue : i;
            })
            .ThenBy(k => k)
            .ToList();

        var exercises = orderedResults
            .Select(r => new BreakdownExerciseDto(r.ExerciseId, r.Code, r.Name, r.DisplayOrder))
            .ToList();

        // 4. Hər alt-ixtisas üçün rəsmi per-hareket puanlama (CalculateAsync) + cəm + 24
        var subProfResults = new List<SubProfessionScoreDto>();
        foreach (var k in subProfs)
        {
            var cells = new List<BreakdownCellDto>();
            int total = 0;

            foreach (var ex in orderedResults)
            {
                byte score = await _scoring.CalculateAsync(
                    student.CommissionNo, k, ex.ExerciseId,
                    student.Gender, age, ex.RawValue, ex.IsRefused, ct);

                total += score;

                double? raw = ex.RawValue.HasValue ? (double?)Convert.ToDouble(ex.RawValue.Value) : null;
                cells.Add(new BreakdownCellDto(ex.ExerciseId, raw, score, ex.IsRefused));
            }

            subProfResults.Add(new SubProfessionScoreDto(
                Kodixtisas: k,
                IsOwn: string.Equals(k, student.AltNov, StringComparison.OrdinalIgnoreCase),
                Cells: cells,
                Total: total,
                IsPassed: total >= PassThreshold62));
        }

        var fullName = string.Join(" ", new[] { student.Surname, student.Name, student.FatherName }
            .Where(x => !string.IsNullOrWhiteSpace(x)));

        return new SubProfessionBreakdownDto(
            StudentId: student.Id,
            IsN: Convert.ToString(student.IsN) ?? "",
            FullName: fullName,
            Gender: Convert.ToInt32(student.Gender),
            AgeAtExam: age,
            OwnKodixtisas: student.AltNov,
            Exercises: exercises,
            SubProfessions: subProfResults);
    }
}