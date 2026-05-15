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
        await _db.Sections.AsNoTracking().OrderBy(s => s.Name)
            .Select(s => new { s.Id, s.Name, s.SectCode }).ToListAsync(ct);

    [HttpGet("genders")]
    public async Task<IEnumerable<object>> Genders(CancellationToken ct) =>
        await _db.Genders.AsNoTracking().Select(g => new { g.Id, g.Name }).ToListAsync(ct);

    [HttpGet("exercises")]
    public async Task<IEnumerable<object>> Exercises(CancellationToken ct) =>
        await _db.Exercises.AsNoTracking().OrderBy(e => e.DisplayOrder)
            .Select(e => new { e.Id, e.Code, e.Name, e.Unit, e.Direction }).ToListAsync(ct);

    [HttpGet("commissions")]
    public async Task<IEnumerable<object>> Commissions(CancellationToken ct) =>
        await _db.Commissions.AsNoTracking().OrderBy(c => c.CommissionNo)
            .Select(c => new { c.Id, c.CommissionNo, c.Name, c.SectionId }).ToListAsync(ct);
}
