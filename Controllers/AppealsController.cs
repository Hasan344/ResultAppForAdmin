using ResultAppForAdmin.Api.Domain.Entities.New;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AppealsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<AppealsController> _log;

    public AppealsController(AppDbContext db, ILogger<AppealsController> log)
    {
        _db  = db;
        _log = log;
    }

    // ── GET /api/appeals?examId=N&commissionNo=X&qrupNum=Y ─────────────────
    /// <summary>
    /// Bir imtahandakı apellyasiya nəticələrini qaytarır.
    /// Tələbə siyahısı + hər tələbənin mövcud apellyasiya qeydləri.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int examId,
        [FromQuery] string? commissionNo,
        [FromQuery] int? qrupNum,
        CancellationToken ct = default)
    {
        if (examId == 0) return BadRequest(new { error = "examId tələb olunur" });

        var studentsQ = _db.Students.AsNoTracking()
            .Where(s => s.ExamId == examId);

        if (!string.IsNullOrWhiteSpace(commissionNo))
            studentsQ = studentsQ.Where(s => s.CommissionNo == commissionNo);
        if (qrupNum.HasValue)
            studentsQ = studentsQ.Where(s => s.QrupNum == qrupNum.Value);

        var students = await studentsQ
            .OrderBy(s => s.QrupNum).ThenBy(s => s.SNomer)
            .Select(s => new
            {
                s.Id, s.SNomer, s.IsN, s.Surname, s.Name, s.FatherName,
                s.Gender, s.QrupNum, s.Kodixtisas, s.AltNov, s.CommissionNo
            })
            .ToListAsync(ct);

        var studentIds = students.Select(s => s.Id).ToList();

        // Mövcud nəticələr (original)
        var originalResults = await _db.StudentExamResults.AsNoTracking()
            .Where(r => studentIds.Contains(r.StudentId))
            .Select(r => new
            {
                r.StudentId, r.ExerciseId,
                ExerciseCode = r.Exercise.Code,
                ExerciseName = r.Exercise.Name,
                r.RawValue, r.FinalScore, r.IsRefused
            })
            .ToListAsync(ct);

        // Apellyasiya nəticələri
        var appealResults = await _db.StudentAppealResults.AsNoTracking()
            .Where(r => r.ExamId == examId && studentIds.Contains(r.StudentId))
            .Select(r => new
            {
                r.StudentId, r.ExerciseId, r.Id,
                ExerciseCode = r.Exercise.Code,
                r.RawValue, r.AppealScore, r.PreviousScore,
                r.Decision, r.Notes, r.RecordedAt, r.UpdatedAt
            })
            .ToListAsync(ct);

        var rows = students.Select(s => new
        {
            s.Id, s.SNomer, s.IsN,
            FullName = $"{s.Surname} {s.Name} {s.FatherName}".Trim(),
            s.Gender, s.QrupNum, s.Kodixtisas, s.AltNov, s.CommissionNo,
            OriginalResults = originalResults
                .Where(r => r.StudentId == s.Id)
                .Select(r => new
                {
                    r.ExerciseId, r.ExerciseCode, r.ExerciseName,
                    r.RawValue, r.FinalScore, r.IsRefused
                }),
            AppealResults = appealResults
                .Where(r => r.StudentId == s.Id)
                .Select(r => new
                {
                    r.Id, r.ExerciseId, r.ExerciseCode,
                    r.RawValue, r.AppealScore, r.PreviousScore,
                    r.Decision, r.Notes, r.RecordedAt, r.UpdatedAt
                })
        });

        // Mövcud exercises (bu exam-dakı komissiyaların exercise-ləri)
        var commissionNos = students.Select(s => s.CommissionNo).Distinct().ToList();
        var exerciseIds = originalResults.Select(r => r.ExerciseId).Distinct().ToList();
        var exercises = await _db.Exercises.AsNoTracking()
            .Where(e => exerciseIds.Contains(e.Id))
            .OrderBy(e => e.DisplayOrder)
            .Select(e => new { e.Id, e.Code, e.Name, e.Unit })
            .ToListAsync(ct);

        return Ok(new
        {
            examId,
            commissionNo,
            exercises,
            rows
        });
    }

    // ── PUT /api/appeals/{studentId}/{exerciseId} ──────────────────────────
    /// <summary>
    /// Apellyasiya nəticəsini manual daxil et (yoxdursa yarat, varsa yenilə).
    /// </summary>
    [HttpPut("{studentId:int}/{exerciseId:int}")]
    public async Task<IActionResult> Upsert(
        int studentId,
        int exerciseId,
        [FromBody] AppealUpsertRequest req,
        CancellationToken ct = default)
    {
        // Tələbəni yoxla
        var student = await _db.Students.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == studentId, ct);
        if (student is null)
            return NotFound(new { error = "Tələbə tapılmadı" });

        // Original balı tap (previousScore üçün)
        var original = await _db.StudentExamResults.AsNoTracking()
            .FirstOrDefaultAsync(r => r.StudentId == studentId && r.ExerciseId == exerciseId, ct);

        var existing = await _db.StudentAppealResults
            .FirstOrDefaultAsync(r => r.StudentId == studentId && r.ExerciseId == exerciseId, ct);

        if (existing is null)
        {
            var appeal = new StudentAppealResult
            {
                StudentId     = studentId,
                ExamId        = student.ExamId,
                ExerciseId    = exerciseId,
                RawValue      = req.RawValue,
                AppealScore   = req.AppealScore,
                PreviousScore = (byte?)original?.FinalScore,
                Decision      = req.Decision ?? ((byte?)original?.FinalScore != req.AppealScore ? "dəyişdi" : "dəyişmədi"),
                Notes         = req.Notes,
                RecordedBy    = User?.Identity?.Name,
                RecordedAt    = DateTime.UtcNow
            };
            _db.StudentAppealResults.Add(appeal);
        }
        else
        {
            existing.RawValue    = req.RawValue;
            existing.AppealScore = req.AppealScore;
            existing.Decision    = req.Decision ?? existing.Decision;
            existing.Notes       = req.Notes;
            existing.RecordedBy  = User?.Identity?.Name;
            existing.UpdatedAt   = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);

        _log.LogInformation(
            "Appeal upsert: student={S} exercise={E} score={Score} decision={D}",
            studentId, exerciseId, req.AppealScore, req.Decision);

        return Ok(new
        {
            studentId,
            exerciseId,
            appealScore   = req.AppealScore,
            previousScore = original?.FinalScore,
            Decision = req.Decision ?? ((byte?)original?.FinalScore != req.AppealScore ? "dəyişdi" : "dəyişmədi"),
        });
    }

    // ── DELETE /api/appeals/{studentId}/{exerciseId} ───────────────────────
    [HttpDelete("{studentId:int}/{exerciseId:int}")]
    public async Task<IActionResult> Delete(
        int studentId, int exerciseId, CancellationToken ct = default)
    {
        var existing = await _db.StudentAppealResults
            .FirstOrDefaultAsync(r => r.StudentId == studentId && r.ExerciseId == exerciseId, ct);

        if (existing is null) return NotFound();

        _db.StudentAppealResults.Remove(existing);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}

// ── Request DTO ──────────────────────────────────────────────────────────────
public record AppealUpsertRequest(
    byte AppealScore,               // 0-10
    decimal? RawValue,              // opsional ölçü
    string? Decision,               // dəyişdi | dəyişmədi
    string? Notes);
