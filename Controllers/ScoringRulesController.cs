using ResultAppForAdmin.Api.Application.DTOs;
using ResultAppForAdmin.Api.Domain.Entities.New;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScoringRulesController : ControllerBase
{
    private readonly AppDbContext _db;
    public ScoringRulesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IEnumerable<ScoringRuleDto>> List(
        [FromQuery] string? commissionNo,
        [FromQuery] int? exerciseId,
        [FromQuery] byte? gender,
        [FromQuery] int? sectionId,          // ← YENİ
        CancellationToken ct = default)
    {
        var q = _db.ScoringRules.AsNoTracking()
            .Include(r => r.Exercise)
            .AsQueryable();

        if (!string.IsNullOrEmpty(commissionNo))
            q = q.Where(r => r.CommissionNo == commissionNo);

        if (exerciseId.HasValue)
            q = q.Where(r => r.ExerciseId == exerciseId.Value);

        if (gender.HasValue)
            q = q.Where(r => r.Gender == gender.Value);

        // sectionId filtrini commission_no üzərindən tətbiq et:
        // scoring_rules-da section_id yoxdur, amma commission.section_id var
        if (sectionId.HasValue)
        {
            var commissionNosInSection = await _db.Commissions.AsNoTracking()
                .Where(c => c.SectionId == sectionId.Value)
                .Select(c => c.CommissionNo)
                .ToListAsync(ct);

            q = q.Where(r => commissionNosInSection.Contains(r.CommissionNo));
        }

        return await q
            .OrderBy(r => r.CommissionNo)
            .ThenBy(r => r.ExerciseId)
            .ThenBy(r => r.Gender)
            .ThenBy(r => r.AgeMin)
            .ThenByDescending(r => r.Score)
            .Select(r => new ScoringRuleDto(
                r.Id, r.CommissionNo, r.Kodixtisas, r.ExerciseId, r.Exercise.Code,
                r.Gender, r.AgeMin, r.AgeMax, r.Threshold, r.Score, r.IsActive))
            .ToListAsync(ct);
    }

    [HttpPost]
    public async Task<ActionResult<ScoringRuleDto>> Create(
        [FromBody] CreateScoringRuleRequest req, CancellationToken ct)
    {
        var rule = new ScoringRule
        {
            CommissionNo = req.CommissionNo,
            Kodixtisas = req.Kodixtisas,
            ExerciseId = req.ExerciseId,
            Gender = req.Gender,
            AgeMin = req.AgeMin,
            AgeMax = req.AgeMax,
            Threshold = req.Threshold,
            Score = req.Score,
            IsActive = true,
            ValidFrom = DateOnly.FromDateTime(DateTime.UtcNow)
        };
        _db.ScoringRules.Add(rule);
        await _db.SaveChangesAsync(ct);

        var ex = await _db.Exercises.FirstAsync(x => x.Id == rule.ExerciseId, ct);
        return new ScoringRuleDto(rule.Id, rule.CommissionNo, rule.Kodixtisas,
            rule.ExerciseId, ex.Code, rule.Gender, rule.AgeMin, rule.AgeMax,
            rule.Threshold, rule.Score, rule.IsActive);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id, [FromBody] CreateScoringRuleRequest req, CancellationToken ct)
    {
        var r = await _db.ScoringRules.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (r is null) return NotFound();

        r.CommissionNo = req.CommissionNo;
        r.Kodixtisas = req.Kodixtisas;
        r.ExerciseId = req.ExerciseId;
        r.Gender = req.Gender;
        r.AgeMin = req.AgeMin;
        r.AgeMax = req.AgeMax;
        r.Threshold = req.Threshold;
        r.Score = req.Score;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var r = await _db.ScoringRules.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (r is null) return NotFound();
        r.IsActive = false;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}