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

    // Yekun bal + keç/qal — komissiya stage rule-una (yoxdursa köhnə cəm eşiyinə) görə.
    Task<FinalScoreResult> CalculateFinalScoreAsync(
        int studentId, int examId, CancellationToken ct = default);
}

public class ScoringService : IScoringService
{
    private readonly AppDbContext _db;

    // Stage rule-u olmayan komissiyalar üçün köhnə (view) davranışı: cəm >= bu eşik.
    private const int LegacyPassThreshold = 24;

    public ScoringService(AppDbContext db) => _db = db;

    // ════════════════════════════════════════════════════════════════════════
    // Tək normativ üçün xam dəyər → bal (6–10)
    // ════════════════════════════════════════════════════════════════════════
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
        // QEYD: "_total_xal" normativləri də (qılıncoynatma cəmi, II mərhələ ümumi xal)
        // adətən Unit == "score" olur — yəni xam dəyər birbaşa baldır.
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
    => examDate.Year - birthDate.Year;
    // ════════════════════════════════════════════════════════════════════════
    // YEKUN bal — komissiyanın FinalMethod-una görə
    // Apellyasiya balı (varsa) orijinal balı/imtinanı override edir.
    // Stage rule yoxdursa köhnə (view) davranışına — sadə cəm >= eşik — düşür.
    // ════════════════════════════════════════════════════════════════════════
    public async Task<FinalScoreResult> CalculateFinalScoreAsync(
        int studentId, int examId, CancellationToken ct = default)
    {
        var student = await _db.Students.AsNoTracking()
            .FirstAsync(s => s.Id == studentId, ct);

        // Bu tələbə üçün bütün nəticələr
        var results = await _db.StudentExamResults.AsNoTracking()
            .Include(r => r.Exercise)
            .Where(r => r.StudentId == studentId)
            .ToListAsync(ct);

        if (results.Count == 0)
            return new FinalScoreResult(null, "Nəticə yoxdur", false);

        // ── Apellyasiya override: appeal varsa orijinal balı (və imtinanı) əvəz edir ──
        var appeals = await _db.StudentAppealResults.AsNoTracking()
            .Where(a => a.StudentId == studentId)
            .ToDictionaryAsync(a => a.ExerciseId, a => a.AppealScore, ct);

        if (appeals.Count > 0)
            foreach (var r in results)
                if (appeals.TryGetValue(r.ExerciseId, out var appealScore))
                {
                    r.FinalScore = appealScore;   // əsas bal artıq apellyasiya balıdır
                    r.IsRefused = false;         // apellyasiya imtinanı da ləğv edir
                }

        var rule = await _db.Set<CommissionStageRule>().AsNoTracking()
            .FirstOrDefaultAsync(r => r.CommissionNo == student.CommissionNo, ct);

        // ── Stage rule yoxdursa: köhnə (view) davranışı — sadə cəm eşiyi ──
        // (məs. komissiya 63 — fərdi normativlərin cəmi >= 24)
        if (rule is null)
        {
            if (results.Any(r => r.IsRefused))
                return new FinalScoreResult(0, "Normativdə imtina", false);

            int total = results.Sum(r => r.FinalScore);
            bool passed = total >= LegacyPassThreshold;
            return new FinalScoreResult(
                (byte)Math.Clamp(total, 0, 255),
                passed ? null : $"Cəm {total} < {LegacyPassThreshold}",
                passed);
        }

        // I mərhələ və II/ümumi xal ayrılması:
        // Konvensiya: exercise.code "_total_xal" ilə bitirsə → ümumi xal (stage2);
        // əks halda I mərhələ (stage1).
        var stage1 = results.Where(r => !r.Exercise.Code.EndsWith("_total_xal")).ToList();
        var totalXal = results.Where(r => r.Exercise.Code.EndsWith("_total_xal")).ToList();

        // İmtina edənlər (refuse) avtomatik qeyri-məqbul
        if (results.Any(r => r.IsRefused))
            return new FinalScoreResult(0, "Bir və ya bir neçə normativdə imtina", false);

        return rule.FinalMethod switch
        {
            "single" => HandleSingle(stage1, rule),
            "avg" => HandleAvg(stage1, rule),

            // ── Ümumi xal: girişi həmişə eyni tipdir (bir "_total_xal" normativi),
            //    yalnız komissiyaya görə dəyişir. Hamısı tək handler-ə yönəlir. ──
            "sum"
              or "total_xal"
              or "stage2_total_xal" => HandleTotalXal(stage1, totalXal, rule),

            "stage2_avg" => HandleStage2Avg(stage1, totalXal, rule),
            "chained_avg" => HandleChainedAvg(stage1, totalXal, rule),

            _ => new FinalScoreResult(null, $"Bilinməyən metod: {rule.FinalMethod}", false)
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    // Ortaq köməkçi: I mərhələ minimum gate (data-driven)
    // ════════════════════════════════════════════════════════════════════════
    /// <summary>
    /// I mərhələ minimum tələbini yoxlayır. Keçərsə <c>null</c> qaytarır,
    /// keçməzsə uğursuz <see cref="FinalScoreResult"/> qaytarır.
    /// Komissiyaya görə dəyişən hər şey (Stage1Required / Stage1Total / MinimumScore)
    /// data-dadır — bu metod heç bir komissiyanı hardcode etmir.
    /// </summary>
    private static FinalScoreResult? Stage1Gate(
        List<StudentExamResult> stage1, CommissionStageRule rule)
    {
        if (rule.Stage1Required <= 0 || stage1.Count == 0)
            return null;

        int meetingMin = stage1.Count(r => r.FinalScore >= rule.MinimumScore);
        if (meetingMin < rule.Stage1Required)
            return new FinalScoreResult(0,
                $"I mərhələ tələbi: {rule.Stage1Required}/{rule.Stage1Total} " +
                $"≥{rule.MinimumScore}; faktiki: {meetingMin}",
                false);

        return null;
    }

    // ── single: tək normativ birbaşa bal verir ──────────────────────────────
    private static FinalScoreResult HandleSingle(
        List<StudentExamResult> s1, CommissionStageRule rule)
    {
        if (s1.Count == 0) return new(null, "Normativ yoxdur", false);
        var score = s1.First().FinalScore;
        var passed = score >= rule.MinimumScore;
        return new(score, passed ? null : $"Bal < {rule.MinimumScore}", passed);
    }

    // ── avg: I mərhələ normativlərinin ortası ───────────────────────────────
    private static FinalScoreResult HandleAvg(
        List<StudentExamResult> s1, CommissionStageRule rule)
    {
        if (s1.Count == 0) return new(null, "Normativ yoxdur", false);

        if (Stage1Gate(s1, rule) is { } gateFail) return gateFail;

        var avg = (byte)Math.Round(
            s1.Average(r => (decimal)r.FinalScore), MidpointRounding.AwayFromZero);
        return new(avg, null, avg >= rule.MinimumScore);
    }

    // ════════════════════════════════════════════════════════════════════════
    // ÜMUMİ XAL — birləşdirilmiş handler
    // Əvvəlki HandleSum (qılıncoynatma) + HandleStage2Only (II mərhələ ümumi xal)
    // burada birləşir.
    // Hər ikisinin məntiqi eynidir:
    //   1) (varsa) I mərhələ minimum gate
    //   2) "_total_xal" normativinin FinalScore-u (artıq lookup ilə hesablanıb)
    //   3) >= MinimumScore → məqbul
    // ════════════════════════════════════════════════════════════════════════
    private static FinalScoreResult HandleTotalXal(
        List<StudentExamResult> stage1,
        List<StudentExamResult> totalXal,
        CommissionStageRule rule)
    {
        if (Stage1Gate(stage1, rule) is { } gateFail) return gateFail;

        if (totalXal.Count == 0)
            return new(null, "Ümumi xal nəticəsi hələ yoxdur", false);

        // Adətən tək "_total_xal" sətri olur; bir neçə olsa ən yüksəyini götürürük.
        var score = totalXal.Max(r => r.FinalScore);
        return new(score, null, score >= rule.MinimumScore);
    }

    // ── stage2_avg: II mərhələ normativlərinin ortası ───────────────────────
    private static FinalScoreResult HandleStage2Avg(
        List<StudentExamResult> s1, List<StudentExamResult> s2, CommissionStageRule rule)
    {
        if (Stage1Gate(s1, rule) is { } gateFail) return gateFail;

        if (s2.Count == 0) return new(null, "II mərhələ nəticəsi yoxdur", false);

        var avg = (byte)Math.Round(
            s2.Average(r => (decimal)r.FinalScore), MidpointRounding.AwayFromZero);
        return new(avg, null, avg >= rule.MinimumScore);
    }

    // ── chained_avg: 1-ci normativ ≥ minimum olarsa S1+S2 ortası ────────────
    private static FinalScoreResult HandleChainedAvg(
        List<StudentExamResult> s1, List<StudentExamResult> s2, CommissionStageRule rule)
    {
        if (s1.Count == 0) return new(null, "Birinci normativ yoxdur", false);

        // 1-ci normativ minimumu yoxla (bu gate digərlərindən fərqlidir:
        // yalnız İLK normativə baxır, sayğaca yox).
        if (s1[0].FinalScore < rule.MinimumScore)
            return new(0,
                $"1-ci normativ < {rule.MinimumScore} → 2-ci normativə buraxılmır",
                false);

        if (s2.Count == 0)
            return new(null, "2-ci normativ hələ yoxdur", false);

        var all = s1.Concat(s2).ToList();
        var avg = (byte)Math.Round(
            all.Average(r => (decimal)r.FinalScore), MidpointRounding.AwayFromZero);
        return new(avg, null, avg >= rule.MinimumScore);
    }
}