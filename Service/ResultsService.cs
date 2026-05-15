using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Domain.Entities.New;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Application.Services;

public interface IResultsService
{
    Task<StudentExamResult> UpsertAsync(UpsertResultDto dto, CancellationToken ct = default);
    Task<BulkUpsertResult> BulkUpsertAsync(IEnumerable<UpsertResultDto> dtos, CancellationToken ct = default);
    Task<int> RecalculateForExamAsync(int examId, CancellationToken ct = default);
}

public record UpsertResultDto(
    int StudentId,
    int ExerciseId,
    decimal? RawValue,
    bool IsRefused,
    byte? FinalScoreOverride,    // expert override; null → use calculated
    string? Notes,
    string? RecordedBy);

public record BulkUpsertResult(int Inserted, int Updated, int Failed, List<string> Errors);

public class ResultsService : IResultsService
{
    private readonly AppDbContext _db;
    private readonly IScoringService _scoring;

    public ResultsService(AppDbContext db, IScoringService scoring)
    {
        _db = db; _scoring = scoring;
    }

    public async Task<StudentExamResult> UpsertAsync(UpsertResultDto dto, CancellationToken ct = default)
    {
        var student = await _db.Students
            .Include(s => s.Exam)
            .FirstOrDefaultAsync(s => s.Id == dto.StudentId, ct)
            ?? throw new InvalidOperationException($"Student {dto.StudentId} not found");

        var examDate = student.Exam.ExamDate;
        int age = student.BirthDate is null ? 0
            : _scoring.CalculateAge(student.BirthDate.Value, examDate);

        var calculated = await _scoring.CalculateAsync(
            student.CommissionNo,
            student.AltNov,                  // alt_nov holds subspecialty (UFH/ABT/KSI)
            dto.ExerciseId,
            student.Gender,
            age,
            dto.RawValue,
            dto.IsRefused,
            ct);

        byte final = dto.FinalScoreOverride ?? calculated;

        var existing = await _db.StudentExamResults
            .FirstOrDefaultAsync(r => r.StudentId == dto.StudentId
                                   && r.ExerciseId == dto.ExerciseId, ct);

        if (existing is null)
        {
            existing = new StudentExamResult
            {
                StudentId = dto.StudentId,
                ExamId = student.ExamId,
                ExerciseId = dto.ExerciseId,
                RecordedAt = DateTime.UtcNow
            };
            _db.StudentExamResults.Add(existing);
        }

        existing.RawValue        = dto.RawValue;
        existing.IsRefused       = dto.IsRefused;
        existing.CalculatedScore = calculated;
        existing.FinalScore      = final;
        existing.Notes           = dto.Notes;
        existing.RecordedBy      = dto.RecordedBy;
        existing.UpdatedAt       = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return existing;
    }

    public async Task<BulkUpsertResult> BulkUpsertAsync(
        IEnumerable<UpsertResultDto> dtos,
        CancellationToken ct = default)
    {
        int ins = 0, upd = 0, fail = 0;
        var errs = new List<string>();
        foreach (var d in dtos)
        {
            try
            {
                var existedBefore = await _db.StudentExamResults
                    .AnyAsync(r => r.StudentId == d.StudentId && r.ExerciseId == d.ExerciseId, ct);
                await UpsertAsync(d, ct);
                if (existedBefore) upd++; else ins++;
            }
            catch (Exception ex)
            {
                fail++;
                errs.Add($"student={d.StudentId} exercise={d.ExerciseId}: {ex.Message}");
            }
        }
        return new BulkUpsertResult(ins, upd, fail, errs);
    }

    /// <summary>
    /// Useful when scoring_rules change — recompute calculated_score for all results in an exam.
    /// final_score is NOT overwritten if it diverges (manual override preserved).
    /// </summary>
    public async Task<int> RecalculateForExamAsync(int examId, CancellationToken ct = default)
    {
        var rows = await _db.StudentExamResults
            .Include(r => r.Student).ThenInclude(s => s.Exam)
            .Where(r => r.ExamId == examId)
            .ToListAsync(ct);

        int changed = 0;
        foreach (var r in rows)
        {
            int age = r.Student.BirthDate is null ? 0
                : _scoring.CalculateAge(r.Student.BirthDate.Value, r.Student.Exam.ExamDate);

            var newCalc = await _scoring.CalculateAsync(
                r.Student.CommissionNo,
                r.Student.AltNov,
                r.ExerciseId,
                r.Student.Gender,
                age,
                r.RawValue,
                r.IsRefused,
                ct);

            if (newCalc != r.CalculatedScore)
            {
                // Only sync final_score if it was equal to old calculated (i.e. no manual override)
                if (r.FinalScore == r.CalculatedScore)
                    r.FinalScore = newCalc;
                r.CalculatedScore = newCalc;
                r.UpdatedAt = DateTime.UtcNow;
                changed++;
            }
        }
        if (changed > 0) await _db.SaveChangesAsync(ct);
        return changed;
    }
}
