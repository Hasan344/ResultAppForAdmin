using ResultAppForAdmin.Api.Application.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Infrastructure.Persistence;
using ResultAppForAdmin.Api.Application.Services;

namespace ResultAppForAdmin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExamsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IResultFileExportService _export;
    public ExamsController(AppDbContext db, IResultFileExportService export)
    {
        _db = db;
        _export = export;
    }

    /// <summary>List exams with optional filters (commissionNo, from, to, sectionId)</summary>
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

        var expertCount  = await _db.ExamExpertSubProfessions.CountAsync(x => x.ExamId == id, ct);

        // ── Monitors: role-bazlı count'lar ───────────────────────────────
        // Role: 1=İmtahan rəhbəri, 2=Nəzarətçi, 4=Könüllü, 5=Digər işçilər
        var monitorCountsByRole = await _db.ExamMonitors.AsNoTracking()
            .Where(x => x.ExamId == id)
            .GroupBy(x => x.Monitor.Role)
            .Select(g => new { Role = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        int monitorTotal = monitorCountsByRole.Sum(x => x.Count);
        int leaderCount   = monitorCountsByRole.FirstOrDefault(x => x.Role == 1)?.Count ?? 0;
        int monitorCount  = monitorCountsByRole.FirstOrDefault(x => x.Role == 2)?.Count ?? 0;
        int volunteerCount = monitorCountsByRole.FirstOrDefault(x => x.Role == 4)?.Count ?? 0;
        int otherStaffCount = monitorCountsByRole.FirstOrDefault(x => x.Role == 5)?.Count ?? 0;

        var repCount     = await _db.ExamRepresentatives.CountAsync(x => x.ExamId == id, ct);
        var studCount    = await _db.Students.CountAsync(x => x.ExamId == id, ct);

        return new ExamDetailDto(
            e.Id, e.Name, e.ExamDate,
            e.ExamBuilding?.Name, e.Section?.Name,
            e.StartTime, e.EndTime, e.Shift, e.StudentCount,
            e.ExamCommissions.Select(ec => ec.Commission.CommissionNo).ToArray(),
            expertCount,
            monitorTotal,
            leaderCount,
            monitorCount,
            volunteerCount,
            otherStaffCount,
            repCount, studCount,
            e.SectionId);
    }

    [HttpGet("{id:int}/experts")]
    public async Task<IEnumerable<object>> Experts(int id, CancellationToken ct) =>
        await _db.ExamExpertSubProfessions.AsNoTracking()
            .Where(x => x.ExamId == id)
            .Select(x => new {
                x.Expert.Id, x.Expert.Name, x.Expert.Surname, x.Expert.Fname,
                x.Expert.Profession, x.Expert.FinCode
            })
            .ToListAsync(ct);

    /// <summary>
    /// Exam-a bağlı monitor-lar.
    /// Optional `role` parametri ilə filtrlənir:
    ///   1 = İmtahan rəhbəri
    ///   2 = Nəzarətçi
    ///   4 = Könüllü
    ///   5 = Digər işçilər
    /// </summary>
    [HttpGet("{id:int}/monitors")]
    public async Task<IEnumerable<object>> Monitors(
        int id,
        [FromQuery] byte? role,
        CancellationToken ct = default)
    {
        var q = _db.ExamMonitors.AsNoTracking()
            .Where(x => x.ExamId == id);

        if (role.HasValue)
            q = q.Where(x => x.Monitor.Role == role.Value);

        return await q
            .OrderBy(x => x.Monitor.Surname).ThenBy(x => x.Monitor.Name)
            .Select(x => new {
                x.Monitor.Id,
                x.Monitor.Name,
                x.Monitor.Surname,
                x.Monitor.Fname,
                x.Monitor.FinCode,
                Role = x.Monitor.Role,
                x.RoomId,
                x.IsAttended
            })
            .ToListAsync(ct);
    }

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

    [HttpGet("{examId:int}/result-file")]
    public async Task<IActionResult> ExportResultFile(
    int examId,
    [FromQuery] int? qrupNum,
    [FromQuery] string? commissionNo,
    CancellationToken ct)
    {
        var exists = await _db.Exams.AnyAsync(e => e.Id == examId, ct);
        if (!exists) return NotFound($"examId={examId} tapılmadı");

        var bytes = await _export.ExportAsync(examId, qrupNum, commissionNo, ct);
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"netice_exam{examId}.xlsx");
    }
}
