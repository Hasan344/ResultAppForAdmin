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
    private readonly AppDbContext _db;

    public ResultsController(IResultsService svc, AppDbContext db)
    {
        _svc = svc; _db = db;
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
}
