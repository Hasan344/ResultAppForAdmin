// ============================================================================
// CommissionsController.cs — Results endpoint yenilənməsi
// `totalScore >= 24` sabit məntiqi əvəzinə commission_stage_rules-a görə
// ScoringService.CalculateFinalScoreAsync çağırılır.
// ============================================================================

using ResultAppForAdmin.Api.Application.DTOs;
using ResultAppForAdmin.Api.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommissionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ScoringService _scoring;
    public CommissionsController(AppDbContext db, ScoringService scoring)
    {
        _db = db;
        _scoring = scoring;
    }

    [HttpGet]
    public async Task<IEnumerable<object>> List(
        [FromQuery] int? sectionId, CancellationToken ct = default)
    {
        var q = _db.Commissions.AsNoTracking().AsQueryable();
        if (sectionId.HasValue) q = q.Where(c => c.SectionId == sectionId.Value);
        return await q.OrderBy(c => c.CommissionNo)
            .Select(c => new { c.Id, c.CommissionNo, c.Name, c.SectionId })
            .ToListAsync(ct);
    }

    [HttpGet("{commissionNo}/results")]
    public async Task<object> Results(
        string commissionNo,
        [FromQuery] int examId,
        [FromQuery] int? qrupNum,
        CancellationToken ct = default)
    {
        // ScoringRules-da bu komissiya üçün hansı exercise-lər istifadə olunur,
        // hamısını dinamik tap (artıq hardcoded `commissionNo switch` istifadə etmirik)
        var ruleExerciseIds = await _db.ScoringRules.AsNoTracking()
            .Where(r => r.CommissionNo == commissionNo && r.IsActive)
            .Select(r => r.ExerciseId)
            .Distinct()
            .ToListAsync(ct);

        var exercises = await _db.Exercises.AsNoTracking()
            .Where(e => ruleExerciseIds.Contains(e.Id))
            .OrderBy(e => e.DisplayOrder)
            .ToListAsync(ct);

        var students = await _db.Students.AsNoTracking()
            .Where(s => s.ExamId == examId
                     && s.CommissionNo == commissionNo
                     && (!qrupNum.HasValue || s.QrupNum == qrupNum.Value))
            .OrderBy(s => s.QrupNum).ThenBy(s => s.SNomer)
            .ToListAsync(ct);

        var studentIds = students.Select(s => s.Id).ToList();
        var results = await _db.StudentExamResults.AsNoTracking()
            .Include(r => r.Exercise)
            .Where(r => studentIds.Contains(r.StudentId))
            .ToListAsync(ct);

        // Yekun bal — hər tələbə üçün ScoringService çağırılır
        var rows = new List<CommissionResultRowDto>();
        foreach (var s in students)
        {
            var byCode = new Dictionary<string, ResultDto?>();
            foreach (var ex in exercises)
            {
                var r = results.FirstOrDefault(x => x.StudentId == s.Id && x.ExerciseId == ex.Id);
                byCode[ex.Code] = r is null ? null : new ResultDto(
                    r.Id, r.StudentId, r.ExerciseId, ex.Code,
                    r.RawValue, r.CalculatedScore, r.FinalScore,
                    r.IsRefused, r.Notes, r.RecordedAt);
            }

            // YEKUN bal — yeni!
            var final = await _scoring.CalculateFinalScoreAsync(s.Id, examId, ct);

            rows.Add(new CommissionResultRowDto(
                s.Id, s.QrupNum, s.SNomer, s.IsN,
                $"{s.Surname} {s.Name} {s.FatherName}".Trim(),
                s.Gender, s.Kodixtisas, s.AltNov,
                byCode,
                final.Score.HasValue ? (int)final.Score.Value : null,
                final.Passed));
        }

        return new
        {
            commissionNo,
            examId,
            exercises = exercises.Select(e => new {
                e.Id,
                e.Code,
                e.Name,
                e.Unit,
                e.Direction,
                e.DisplayOrder
            }),
            rows,
            summary = new
            {
                total = rows.Count,
                passed = rows.Count(r => r.IsPassed),
                failed = rows.Count(r => r.TotalScore.HasValue && !r.IsPassed),
                pending = rows.Count(r => !r.TotalScore.HasValue)
            }
        };
    }
}