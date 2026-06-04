using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LookupController : ControllerBase
{
    private readonly AppDbContext _db;
    public LookupController(AppDbContext db) => _db = db;

    [HttpGet("sections")]
    public async Task<IEnumerable<object>> Sections(CancellationToken ct) =>
        await _db.Sections.AsNoTracking()
            .OrderBy(s => s.Name)
            .Select(s => new { s.Id, s.Name, s.SectCode })
            .ToListAsync(ct);

    [HttpGet("genders")]
    public async Task<IEnumerable<object>> Genders(CancellationToken ct) =>
        await _db.Genders.AsNoTracking()
            .Select(g => new { g.Id, g.Name })
            .ToListAsync(ct);

    [HttpGet("exercises")]
    public async Task<IEnumerable<object>> Exercises(
    [FromQuery] int? sectionId,          // ← YENİ
    CancellationToken ct = default)
    {
        var q = _db.Exercises.AsNoTracking().AsQueryable();

        // NULL olan egzersizlər hər bölmədə görünür;
        // SectionId olan egzersizlər yalnız o bölmədə
        if (sectionId.HasValue)
            q = q.Where(e => e.SectionId == null || e.SectionId == sectionId.Value);

        return await q
            .OrderBy(e => e.DisplayOrder)
            .Select(e => new { e.Id, e.Code, e.Name, e.Unit, e.Direction, e.SectionId })
            .ToListAsync(ct);
    }
    /// <summary>
    /// Komissiya siyahısı.
    /// ?sectionId=N verilsə yalnız o bölmənin komissiyaları qaytarılır.
    /// </summary>
    [HttpGet("commissions")]
    public async Task<IEnumerable<object>> Commissions(
        [FromQuery] int? sectionId,
        CancellationToken ct = default)
    {
        var q = _db.Commissions.AsNoTracking();

        if (sectionId.HasValue)
            q = q.Where(c => c.SectionId == sectionId.Value);

        return await q
            .OrderBy(c => c.CommissionNo)
            .Select(c => new { c.Id, c.CommissionNo, c.Name, c.SectionId })
            .ToListAsync(ct);
    }
}