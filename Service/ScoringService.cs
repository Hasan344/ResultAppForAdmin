using ResultAppForAdmin.Api.Domain.Entities.New;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Application.Services;

public interface IScoringService
{
    Task<byte> CalculateAsync(
        string commissionNo,
        string? kodixtisas,
        int exerciseId,
        byte gender,
        int ageInYears,
        decimal? rawValue,
        bool refused,
        CancellationToken ct = default);

    int CalculateAge(DateOnly birthDate, DateOnly examDate);
}

public class ScoringService : IScoringService
{
    private readonly AppDbContext _db;

    public ScoringService(AppDbContext db) => _db = db;

    /// <summary>
    /// Returns 0 if refused, 0 if no threshold met, else 6–10.
    /// Direction 1 (lower-better): rawValue &lt;= threshold → score
    /// Direction 2 (higher-better): rawValue &gt;= threshold → score
    /// Gymnastics/sport-games (no rules in DB): rawValue itself is the score.
    /// </summary>
    public async Task<byte> CalculateAsync(
        string commissionNo,
        string? kodixtisas,
        int exerciseId,
        byte gender,
        int ageInYears,
        decimal? rawValue,
        bool refused,
        CancellationToken ct = default)
    {
        if (refused || rawValue is null) return 0;

        var exercise = await _db.Exercises.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == exerciseId, ct)
            ?? throw new InvalidOperationException($"Exercise {exerciseId} not found");

        // Subjective exercises (gymnastics, sport_games): rawValue is the score directly.
        // These have no rows in scoring_rules.
        if (exercise.Unit == "score")
        {
            var v = (byte)Math.Clamp((int)Math.Round(rawValue.Value), 0, 10);
            return v;
        }

        // Find applicable rules; pick the BEST score whose threshold is met.
        // Filter on kodixtisas: rule.Kodixtisas == null  → applies to all
        //                       rule.Kodixtisas == student → applies to that subspecialty
        var rules = await _db.ScoringRules.AsNoTracking()
            .Where(r => r.CommissionNo == commissionNo
                     && (r.Kodixtisas == null || r.Kodixtisas == kodixtisas)
                     && r.ExerciseId == exerciseId
                     && r.Gender == gender
                     && r.AgeMin <= ageInYears
                     && r.AgeMax >= ageInYears
                     && r.IsActive)
            .OrderByDescending(r => r.Score)         // try 10 first, then 9, ...
            .ToListAsync(ct);

        if (rules.Count == 0) return 0;

        foreach (var rule in rules)
        {
            bool meets = exercise.Direction == 1
                ? rawValue.Value <= rule.Threshold   // saniyə
                : rawValue.Value >= rule.Threshold;  // sm, dəfə
            if (meets) return rule.Score;
        }
        return 0;
    }

    /// <summary>
    /// Year-based age difference, accounting for whether birthday has passed.
    /// Aligned with how Azerbaijani sport competitions calculate age (full years).
    /// </summary>
    public int CalculateAge(DateOnly birthDate, DateOnly examDate)
    {
        int age = examDate.Year - birthDate.Year;
        if (examDate < birthDate.AddYears(age)) age--;
        return age;
    }
}
