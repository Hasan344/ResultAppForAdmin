using ResultAppForAdmin.Api.Application.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExamsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ExamsController(AppDbContext db) => _db = db;

    /// <summary>List exams with optional filters</summary>
    [HttpGet]
    public async Task<IEnumerable<ExamListDto>> List(
        [FromQuery] string? commissionNo,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int? sectionId,
        CancellationToken ct = default)
    {
        var q = _db.Exams.AsNoTracking()
            .Include(e => e.Section)
            .Include(e => e.ExamBuilding)
            .Include(e => e.ExamCommissions).ThenInclude(ec => ec.Commission)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(commissionNo))
            q = q.Where(e => e.ExamCommissions.Any(ec => ec.Commission.CommissionNo == commissionNo));
        if (from.HasValue) q = q.Where(e => e.ExamDate >= from.Value);
        if (to.HasValue)   q = q.Where(e => e.ExamDate <= to.Value);
        if (sectionId.HasValue) q = q.Where(e => e.SectionId == sectionId.Value);

        return await q.OrderByDescending(e => e.ExamDate)
            .Select(e => new ExamListDto(
                e.Id, e.Name, e.ExamDate,
                e.ExamBuilding != null ? e.ExamBuilding.Name : null,
                e.Section != null ? e.Section.Name : null,
                e.StudentCount,
                e.ExamCommissions.Select(ec => ec.Commission.CommissionNo).ToArray()))
            .ToListAsync(ct);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ExamDetailDto>> Get(int id, CancellationToken ct)
    {
        var e = await _db.Exams.AsNoTracking()
            .Include(x => x.Section)
            .Include(x => x.ExamBuilding)
            .Include(x => x.ExamCommissions).ThenInclude(ec => ec.Commission)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (e is null) return NotFound();

        var expertCount  = await _db.ExamExperts.CountAsync(x => x.ExamId == id, ct);
        var monitorCount = await _db.ExamMonitors.CountAsync(x => x.ExamId == id, ct);
        var repCount     = await _db.ExamRepresentatives.CountAsync(x => x.ExamId == id, ct);
        var studCount    = await _db.Students.CountAsync(x => x.ExamId == id, ct);

        return new ExamDetailDto(
            e.Id, e.Name, e.ExamDate,
            e.ExamBuilding?.Name, e.Section?.Name,
            e.StartTime, e.EndTime, e.Shift, e.StudentCount,
            e.ExamCommissions.Select(ec => ec.Commission.CommissionNo).ToArray(),
            expertCount, monitorCount, repCount, studCount);
    }

    [HttpGet("{id:int}/experts")]
    public async Task<IEnumerable<object>> Experts(int id, CancellationToken ct) =>
        await _db.ExamExperts.AsNoTracking()
            .Where(x => x.ExamId == id)
            .Select(x => new {
                x.Expert.Id, x.Expert.Name, x.Expert.Surname, x.Expert.Fname,
                x.Expert.Profession, x.Expert.FinCode
            })
            .ToListAsync(ct);

    [HttpGet("{id:int}/monitors")]
    public async Task<IEnumerable<object>> Monitors(int id, CancellationToken ct) =>
        await _db.ExamMonitors.AsNoTracking()
            .Where(x => x.ExamId == id)
            .Select(x => new {
                x.Monitor.Id, x.Monitor.Name, x.Monitor.Surname, x.Monitor.Fname,
                x.Monitor.FinCode, x.RoomId, x.IsAttended
            })
            .ToListAsync(ct);

    [HttpGet("{id:int}/representatives")]
    public async Task<IEnumerable<object>> Representatives(int id, CancellationToken ct) =>
        await _db.ExamRepresentatives.AsNoTracking()
            .Where(x => x.ExamId == id)
            .Select(x => new {
                x.Representative.Id, x.Representative.Name,
                x.Representative.Surname, x.Representative.Fname,
                x.Representative.FinCode
            })
            .ToListAsync(ct);
}
