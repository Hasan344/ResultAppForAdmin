using ResultAppForAdmin.Api.Application.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommissionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public CommissionsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IEnumerable<object>> List(CancellationToken ct) =>
        await _db.Commissions.AsNoTracking()
            .OrderBy(c => c.CommissionNo)
            .Select(c => new { c.Id, c.CommissionNo, c.Name, c.SectionId })
            .ToListAsync(ct);

    /// <summary>
    /// Komissiya bazlı sonuç tablosu — bir sınavdaki tüm öğrenciler,
    /// her exercise için ayrı kolon, total + passed flag
    /// </summary>
    [HttpGet("{commissionNo}/results")]
    public async Task<object> Results(
        string commissionNo,
        [FromQuery] int examId,
        [FromQuery] int? qrupNum,
        CancellationToken ct = default)
    {
        // Get exercises that this commission uses (any rule rows, plus subjective ones)
        // Heuristic: 62-ci → 4 ölçülen hareket; 63/6401/152 → sürət, sürət-güc, gimnastika, idman oyunları
        var exerciseCodes = commissionNo switch
        {
            "62" => new[] { "sprint_100m", "cross_1000m", "pull_up", "long_jump" },
            "63" or "6401" or "152" => new[] { "sprint_100m", "long_jump", "gymnastics", "sport_games" },
            _ => Array.Empty<string>()
        };

        var exercises = await _db.Exercises.AsNoTracking()
            .Where(e => exerciseCodes.Contains(e.Code))
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

        var rows = students.Select(s =>
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

            int? total = byCode.Values.All(v => v is not null)
                ? byCode.Values.Sum(v => (int)v!.FinalScore)
                : null;

            return new CommissionResultRowDto(
                s.Id, s.QrupNum, s.SNomer, s.IsN,
                $"{s.Surname} {s.Name} {s.FatherName}".Trim(),
                s.Gender, s.Kodixtisas, s.AltNov,
                byCode, total, total is >= 24);
        }).ToList();

        return new
        {
            commissionNo,
            examId,
            exercises = exercises.Select(e => new { e.Id, e.Code, e.Name, e.Unit, e.Direction, e.DisplayOrder }),
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
