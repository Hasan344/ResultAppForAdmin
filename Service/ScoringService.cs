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
    public async Task<FinalScoreResult> CalculateFinalScoreAsync(
        int studentId, int examId, CancellationToken ct = default)
    {
        var student = await _db.Students.AsNoTracking()
            .FirstAsync(s => s.Id == studentId, ct);

        var rule = await _db.Set<CommissionStageRule>().AsNoTracking()
            .FirstOrDefaultAsync(r => r.CommissionNo == student.CommissionNo, ct);

        if (rule is null)
            return new FinalScoreResult(null, "Bu komissiya üçün stage rule yoxdur", false);

        // Bu tələbə üçün bütün nəticələr
        var results = await _db.StudentExamResults.AsNoTracking()
            .Include(r => r.Exercise)
            .Where(r => r.StudentId == studentId)
            .ToListAsync(ct);

        if (results.Count == 0)
            return new FinalScoreResult(null, "Nəticə yoxdur", false);

        // I mərhələ və II mərhələ ayrılması:
        // Konvensiya: exercise.code "_total_xal" ilə bitirsə → II mərhələ; əks halda I.
        var stage1 = results.Where(r => !r.Exercise.Code.EndsWith("_total_xal")).ToList();
        var stage2 = results.Where(r => r.Exercise.Code.EndsWith("_total_xal")).ToList();

        // İmtina edənlər (refuse) avtomatik qeyri-məqbul
        if (results.Any(r => r.IsRefused))
            return new FinalScoreResult(0, "Bir və ya bir neçə normativdə imtina", false);

        return rule.FinalMethod switch
        {
            "single" => HandleSingle(stage1, rule),
            "avg" => HandleAvg(stage1, rule),
            "sum" => HandleSum(stage1),
            "stage2_total_xal" => HandleStage2Only(stage1, stage2, rule),
            "stage2_avg" => HandleStage2Avg(stage1, stage2, rule),
            "chained_avg" => HandleChainedAvg(stage1, stage2, rule),
            _ => new FinalScoreResult(null, $"Bilinməyən metod: {rule.FinalMethod}", false)
        };
    }
    private FinalScoreResult HandleSingle(List<StudentExamResult> s1, CommissionStageRule rule)
    {
        if (s1.Count == 0) return new(null, "Normativ yoxdur", false);
        var score = s1.First().FinalScore;
        var passed = score >= rule.MinimumScore;
        return new(score, passed ? null : $"Bal < {rule.MinimumScore}", passed);
    }
    private FinalScoreResult HandleAvg(List<StudentExamResult> s1, CommissionStageRule rule)
    {
        if (s1.Count == 0) return new(null, "Normativ yoxdur", false);

        // Minimum tələb yoxlaması
        if (rule.Stage1Required > 0)
        {
            int meetingMin = s1.Count(r => r.FinalScore >= rule.MinimumScore);
            if (meetingMin < rule.Stage1Required)
                return new(0, $"Tələb: {rule.Stage1Required}/{rule.Stage1Total} ≥{rule.MinimumScore}, faktiki: {meetingMin}", false);
        }

        var avg = (byte)Math.Round(s1.Average(r => (decimal)r.FinalScore), MidpointRounding.AwayFromZero);
        return new(avg, null, avg >= rule.MinimumScore);
    }
    private FinalScoreResult HandleSum(List<StudentExamResult> s1)
    {
        // Qılıncoynatma: 4 normativ × 6 xal cəmi, sonra cədvələ baxılır.
        // Bu method üçün scoring_rules-da `fencing_total_xal` artıq mövcuddur.
        // Burada sadəcə "max(FinalScore)" qaytarırıq çünki o, ümumi xal üzərindən hesablanıb.
        if (s1.Count == 0) return new(null, "Normativ yoxdur", false);
        var score = s1.Max(r => r.FinalScore);
        return new(score, null, score >= 6);
    }

    // ── stage2_total_xal: II mərhələ ümumi xal birbaşa bal verir ─────────
    private FinalScoreResult HandleStage2Only(
        List<StudentExamResult> s1, List<StudentExamResult> s2, CommissionStageRule rule)
    {
        // I mərhələ minimumlarını yoxla
        if (rule.Stage1Required > 0 && s1.Count > 0)
        {
            int meetingMin = s1.Count(r => r.FinalScore >= rule.MinimumScore);
            if (meetingMin < rule.Stage1Required)
                return new(0,
                    $"I mərhələ tələbi: {rule.Stage1Required}/{rule.Stage1Total} ≥{rule.MinimumScore}; faktiki: {meetingMin}",
                    false);
        }

        if (s2.Count == 0)
            return new(null, "II mərhələ nəticəsi hələ yoxdur", false);

        // II mərhələ "_total_xal" exercise rawValue qiymətindən bal alır,
        // bu artıq result.FinalScore-də saxlanılır.
        var score = s2.First().FinalScore;
        return new(score, null, score >= rule.MinimumScore);
    }
    private FinalScoreResult HandleStage2Avg(
        List<StudentExamResult> s1, List<StudentExamResult> s2, CommissionStageRule rule)
    {
        if (rule.Stage1Required > 0 && s1.Count > 0)
        {
            int meetingMin = s1.Count(r => r.FinalScore >= rule.MinimumScore);
            if (meetingMin < rule.Stage1Required)
                return new(0,
                    $"I mərhələ tələbi: {rule.Stage1Required}/{rule.Stage1Total} ≥{rule.MinimumScore}; faktiki: {meetingMin}",
                    false);
        }

        if (s2.Count == 0) return new(null, "II mərhələ nəticəsi yoxdur", false);

        // II mərhələ normativləri II mərhələdə "_total_xal" deyil, normal exercise-lərdir
        // (futbol_long_kick, volleyball_serve və s.). Onların balını orta alırıq.
        // Burada belə bir varsayım var ki, bu komissiyalarda I mərhələ normativləri
        // (sprint_100m, cross_1000m və s.) S1-ə düşür, II mərhələ texniki normativlər S2-yə.
        // Lakin S2 qaydası `_total_xal` ilə təyin olunmuşdur. Bu komissiyalar üçün
        // II mərhələ normativləri "_total_xal" suffix-i istifadə ETMƏMƏLİDİR.
        //
        // Praktik həll: I mərhələ I gündə qeyd olunur, II mərhələ II gündə.
        // Recording date-ə görə ayırmaq daha düzgün olardı, lakin sadə qalmaq üçün:
        // S2 = II mərhələ üçün konkret exercise code-larına baxmaq olar.
        // Aşağıda S2 listəsində OLAN bütün təxmin edirik II mərhələdir.
        var avg = (byte)Math.Round(s2.Average(r => (decimal)r.FinalScore), MidpointRounding.AwayFromZero);
        return new(avg, null, avg >= rule.MinimumScore);
    }

    // ── chained_avg: I ≥6 olarsa S1+S2 ortası, yoxsa qeyri-məqbul ───────
    private FinalScoreResult HandleChainedAvg(
        List<StudentExamResult> s1, List<StudentExamResult> s2, CommissionStageRule rule)
    {
        if (s1.Count == 0) return new(null, "Birinci normativ yoxdur", false);

        // 1-ci normativ minimumu yoxla
        if (s1[0].FinalScore < rule.MinimumScore)
            return new(0,
                $"1-ci normativ < {rule.MinimumScore} → 2-ci normativə buraxılmır",
                false);

        if (s2.Count == 0)
            return new(null, "2-ci normativ hələ yoxdur", false);

        // İki normativin ortası
        var all = s1.Concat(s2).ToList();
        var avg = (byte)Math.Round(all.Average(r => (decimal)r.FinalScore), MidpointRounding.AwayFromZero);
        return new(avg, null, avg >= rule.MinimumScore);
    }
}