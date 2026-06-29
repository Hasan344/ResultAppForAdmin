using ResultAppForAdmin.Api.Domain.Entities.New;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Application.Services;

public interface IScoringService
{
    Task<byte> CalculateAsync(
        string commissionNo, string? kodixtisas, int exerciseId,
        byte gender, int ageInYears, decimal? rawValue, bool refused,
        CancellationToken ct = default);

    int CalculateAge(DateOnly birthDate, DateOnly examDate);

    // Saxlanılan FinalScore-a görə (manual override-lar qorunur)
    Task<FinalScoreResult> CalculateFinalScoreAsync(
        int studentId, int examId, CancellationToken ct = default);

    // RAW dəyəri verilən alt-ixtisasın (kodixtisas) normativinə görə YENİDƏN puanlayır.
    // 62 kimi çox-alt-ixtisaslı komissiyalarda hər alt-ixtisas üçün ayrı nəticə almaq üçün.
    Task<FinalScoreResult> CalculateFinalScoreAsync(
        int studentId, int examId, string? kodixtisas, CancellationToken ct = default);

    // YALNIZ I MƏRHƏLƏ QAPISI — netice (mərhələ-1) faylı üçün.
    // II mərhələ (umumi_total_xal / texniki normativlər) nəzərə alınmır.
    Task<FinalScoreResult> EvaluateStage1Async(
        int studentId, int examId, string? kodixtisas = null, CancellationToken ct = default);
}

public class ScoringService : IScoringService
{
    private readonly AppDbContext _db;
    private const int LegacyPassThreshold = 24;

    public ScoringService(AppDbContext db) => _db = db;

    // Aggregation üçün daxili sadə model (StudentExamResult və ya re-score eyni yola düşür)
    private readonly record struct ScoredResult(string ExerciseCode, byte Score, bool IsRefused);

    // ════════════════════════════════════════════════════════════════════════
    // I MƏRHƏLƏ (ÜMUMİ FİZİKİ HAZIRLIQ) NORMATİVLƏRİNİN KODLARI
    // Yalnız bunlar mərhələ-1 qapısı (stage-1 gate) sayımına daxildir. II mərhələ
    // normativləri (umumi_total_xal, texniki bacarıqlar: ex24-27, ex69-76 və s.)
    // bura DAXİL DEYİL — netice (mərhələ-1) faylında onlar qiymətə təsir etməməlidir.
    // Yeni ÜFH normativi əlavə olunarsa (məs. başqa kross/sprint kodu) BURAYA əlavə et.
    // ════════════════════════════════════════════════════════════════════════
    private static readonly HashSet<string> Stage1UfhCodes = new(StringComparer.OrdinalIgnoreCase)
    {
        "sprint_100m",
        "cross_1000m",
        "sprint_400m",
        "pull_up",
        "long_jump",
    };

    // ════════════════════════════════════════════════════════════════════════
    // mm.ss FORMATLI HƏRƏKƏTLƏR
    // Bu hərəkətlərdə raw_value DƏQİQƏ.SANİYƏ kimi gəlir: 4.07 = 4 dəq 07 san = 247 san.
    // Saniyə hissəsi HƏMİŞƏ 2 rəqəmdir (4.7 GƏLMİR, yalnız 4.07).
    // Yeni mesafeli koşu əlavə olunarsa (məs. cross_400m, cross_500m) onun code-unu
    // BURAYA əlavə et — əks halda eyni hesablama xətası onda da olar.
    // ════════════════════════════════════════════════════════════════════════
    private static readonly HashSet<string> MmssExercises = new(StringComparer.OrdinalIgnoreCase)
    {
        "cross_1000m",
        "sprint_400m",
    };

    // mm.ss → ümumi saniyə. mm.ss olmayan hərəkətlər üçün dəyəri olduğu kimi qaytarır.
    private static decimal NormalizeRaw(string code, decimal raw)
    {
        if (!MmssExercises.Contains(code)) return raw;

        int minutes = (int)Math.Floor(raw);
        int seconds = (int)Math.Round((raw - minutes) * 100m, MidpointRounding.AwayFromZero);
        return minutes * 60 + seconds;
    }

    // ════════════════════════════════════════════════════════════════════════
    // Tək normativ üçün xam dəyər → bal (6–10)
    // imtina/null → 0 (yalnız HƏMİN hərəkətin balı sıfır olur)
    // ════════════════════════════════════════════════════════════════════════
    public async Task<byte> CalculateAsync(
        string commissionNo, string? kodixtisas, int exerciseId,
        byte gender, int ageInYears, decimal? rawValue, bool refused,
        CancellationToken ct = default)
    {
        if (refused || rawValue is null) return 0;

        var exercise = await _db.Exercises.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == exerciseId, ct)
            ?? throw new InvalidOperationException($"Exercise {exerciseId} not found");

        if (exercise.Unit == "score")
            return (byte)Math.Clamp((int)Math.Round(rawValue.Value), 0, 10);

        // mm.ss formatlı hərəkətlərdə əvvəlcə saniyəyə çevir (4.07 → 247)
        decimal value = NormalizeRaw(exercise.Code, rawValue.Value);

        var rules = await _db.ScoringRules.AsNoTracking()
            .Where(r => r.CommissionNo == commissionNo
                     && (r.Kodixtisas == null || r.Kodixtisas == kodixtisas)
                     && r.ExerciseId == exerciseId
                     && r.Gender == gender
                     && r.AgeMin <= ageInYears
                     && r.AgeMax >= ageInYears
                     && r.IsActive)
            .OrderByDescending(r => r.Score)
            .ToListAsync(ct);

        if (rules.Count == 0) return 0;

        foreach (var rule in rules)
        {
            bool meets = exercise.Direction == 1
                ? value <= rule.Threshold     // saniyə: kiçik = yaxşı
                : value >= rule.Threshold;    // sm/dəfə: böyük = yaxşı
            if (meets) return rule.Score;
        }
        return 0;
    }

    public int CalculateAge(DateOnly birthDate, DateOnly examDate)
        => examDate.Year - birthDate.Year;

    // ════════════════════════════════════════════════════════════════════════
    // YEKUN bal — saxlanılan FinalScore (manual override-lar daxil)
    // ════════════════════════════════════════════════════════════════════════
    public async Task<FinalScoreResult> CalculateFinalScoreAsync(
        int studentId, int examId, CancellationToken ct = default)
    {
        var student = await _db.Students.AsNoTracking().FirstAsync(s => s.Id == studentId, ct);

        var results = await _db.StudentExamResults.AsNoTracking()
            .Include(r => r.Exercise)
            .Where(r => r.StudentId == studentId)
            .ToListAsync(ct);

        if (results.Count == 0)
            return new FinalScoreResult(null, "Nəticə yoxdur", false);

        var appeals = await _db.StudentAppealResults.AsNoTracking()
            .Where(a => a.StudentId == studentId)
            .ToDictionaryAsync(a => a.ExerciseId, a => a.AppealScore, ct);

        var scored = results.Select(r =>
        {
            byte score = r.FinalScore;
            bool refused = r.IsRefused;
            if (appeals.TryGetValue(r.ExerciseId, out var ap)) { score = ap; refused = false; }
            return new ScoredResult(r.Exercise.Code, score, refused);
        }).ToList();

        var rule = await _db.Set<CommissionStageRule>().AsNoTracking()
            .FirstOrDefaultAsync(r => r.CommissionNo == student.CommissionNo, ct);

        return Aggregate(scored, rule);
    }

    // ════════════════════════════════════════════════════════════════════════
    // YEKUN bal — RAW dəyəri verilən kodixtisas-a görə YENİDƏN hesablayır
    // (çox-alt-ixtisaslı komissiyalar üçün; manual override-ları NƏZƏRƏ ALMIR — aşağı qeydə bax)
    // ════════════════════════════════════════════════════════════════════════
    public async Task<FinalScoreResult> CalculateFinalScoreAsync(
        int studentId, int examId, string? kodixtisas, CancellationToken ct = default)
    {
        var student = await _db.Students.AsNoTracking().FirstAsync(s => s.Id == studentId, ct);
        var exam = await _db.Exams.AsNoTracking().FirstAsync(e => e.Id == examId, ct);
        int age = student.BirthDate is null ? 0 : CalculateAge(student.BirthDate.Value, exam.ExamDate);

        var results = await _db.StudentExamResults.AsNoTracking()
            .Include(r => r.Exercise)
            .Where(r => r.StudentId == studentId)
            .ToListAsync(ct);

        if (results.Count == 0)
            return new FinalScoreResult(null, "Nəticə yoxdur", false);

        var appeals = await _db.StudentAppealResults.AsNoTracking()
            .Where(a => a.StudentId == studentId)
            .ToDictionaryAsync(a => a.ExerciseId, a => a.AppealScore, ct);

        var scored = new List<ScoredResult>(results.Count);
        foreach (var r in results)
        {
            byte score;
            bool refused = r.IsRefused;
            if (appeals.TryGetValue(r.ExerciseId, out var ap))
            {
                score = ap; refused = false;            // apellyasiya balı (alt-ixtisasdan asılı deyil)
            }
            else
            {
                score = await CalculateAsync(
                    student.CommissionNo, kodixtisas, r.ExerciseId,
                    student.Gender, age, r.RawValue, r.IsRefused, ct);
            }
            scored.Add(new ScoredResult(r.Exercise.Code, score, refused));
        }

        var rule = await _db.Set<CommissionStageRule>().AsNoTracking()
            .FirstOrDefaultAsync(r => r.CommissionNo == student.CommissionNo, ct);

        return Aggregate(scored, rule);
    }

    // ════════════════════════════════════════════════════════════════════════
    // YALNIZ I MƏRHƏLƏ QAPISI — netice (mərhələ-1) faylı üçün.
    //
    // "Nəticə" = abituriyent I mərhələni keçdimi (→ II mərhələyə buraxılır)?
    // II mərhələ normativləri (umumi_total_xal / texniki bacarıqlar) NƏZƏRƏ ALINMIR,
    // çünki mərhələ-1 günü onlar hələ mövcud deyil. Tam yekun üçün → CalculateFinalScoreAsync.
    //
    // Qayda (commission_stage_rules) varsa: meeting >= stage1_required.
    // Qayda yoxdursa (və ya stage1_required<=0): MÖVCUD bütün I mərhələ normativləri
    // keçilməlidir (təhlükəsiz default — kimsə yanlışlıqla "məqbul" görünməsin).
    //
    // kodixtisas verilərsə RAW-dan həmin alt-ixtisasa görə yenidən puanlanır;
    // null isə saxlanılan FinalScore istifadə olunur (manual override qorunur).
    // ════════════════════════════════════════════════════════════════════════
    public async Task<FinalScoreResult> EvaluateStage1Async(
        int studentId, int examId, string? kodixtisas = null, CancellationToken ct = default)
    {
        var student = await _db.Students.AsNoTracking().FirstAsync(s => s.Id == studentId, ct);
        var exam = await _db.Exams.AsNoTracking().FirstAsync(e => e.Id == examId, ct);
        int age = student.BirthDate is null ? 0 : CalculateAge(student.BirthDate.Value, exam.ExamDate);

        var results = await _db.StudentExamResults.AsNoTracking()
            .Include(r => r.Exercise)
            .Where(r => r.StudentId == studentId)
            .ToListAsync(ct);

        if (results.Count == 0)
            return new FinalScoreResult(null, "Nəticə yoxdur", false);

        var appeals = await _db.StudentAppealResults.AsNoTracking()
            .Where(a => a.StudentId == studentId)
            .ToDictionaryAsync(a => a.ExerciseId, a => a.AppealScore, ct);

        // Yalnız I mərhələ (ÜFH) normativləri; II mərhələ kodları xaric.
        var stage1 = new List<ScoredResult>();
        foreach (var rr in results)
        {
            if (!Stage1UfhCodes.Contains(rr.Exercise.Code)) continue;

            byte score;
            bool refused = rr.IsRefused;
            if (appeals.TryGetValue(rr.ExerciseId, out var ap)) { score = ap; refused = false; }
            else if (kodixtisas is null) score = rr.FinalScore;
            else score = await CalculateAsync(
                student.CommissionNo, kodixtisas, rr.ExerciseId,
                student.Gender, age, rr.RawValue, rr.IsRefused, ct);

            stage1.Add(new ScoredResult(rr.Exercise.Code, score, refused));
        }

        if (stage1.Count == 0)
            return new FinalScoreResult(null, "I mərhələ normativi yoxdur", false);

        var rule = await _db.Set<CommissionStageRule>().AsNoTracking()
            .FirstOrDefaultAsync(r => r.CommissionNo == student.CommissionNo, ct);

        int minScore = rule?.MinimumScore ?? 6;
        int required = (rule is not null && rule.Stage1Required > 0) ? rule.Stage1Required : stage1.Count;
        int total = (rule is not null && rule.Stage1Total > 0) ? rule.Stage1Total : stage1.Count;

        int meeting = stage1.Count(r => r.Score >= minScore);
        bool passed = meeting >= required;

        return new FinalScoreResult(
            (byte)Math.Clamp(meeting, 0, 255),
            passed ? null : $"I mərhələ: {meeting}/{total} ≥{minScore} (tələb {required})",
            passed);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Ortaq aggregation
    //
    // QEYD: İmtina yekun nəticəni avtomatik "qeyri-məqbul" ETMİR. İmtina yalnız
    // həmin hərəkətin balını 0 edir; 0 normal qaydada cəmə/ortalamaya daxil olur.
    // ════════════════════════════════════════════════════════════════════════
    private static FinalScoreResult Aggregate(List<ScoredResult> scored, CommissionStageRule? rule)
    {
        if (rule is null)
        {
            int total = scored.Sum(r => r.Score);
            bool passed = total >= LegacyPassThreshold;
            return new FinalScoreResult((byte)Math.Clamp(total, 0, 255),
                passed ? null : $"Cəm {total} < {LegacyPassThreshold}", passed);
        }

        var stage1 = scored.Where(r => !r.ExerciseCode.EndsWith("_total_xal")).ToList();
        var totalXal = scored.Where(r => r.ExerciseCode.EndsWith("_total_xal")).ToList();

        return rule.FinalMethod switch
        {
            "single" => HandleSingle(stage1, rule),
            "avg" => HandleAvg(stage1, rule),
            "sum" or "total_xal" or "stage2_total_xal" => HandleTotalXal(stage1, totalXal, rule),
            "stage2_avg" => HandleStage2Avg(stage1, totalXal, rule),
            "chained_avg" => HandleChainedAvg(stage1, totalXal, rule),
            _ => new FinalScoreResult(null, $"Bilinməyən metod: {rule.FinalMethod}", false)
        };
    }

    private static FinalScoreResult? Stage1Gate(List<ScoredResult> stage1, CommissionStageRule rule)
    {
        if (rule.Stage1Required <= 0 || stage1.Count == 0) return null;
        int meetingMin = stage1.Count(r => r.Score >= rule.MinimumScore);
        if (meetingMin < rule.Stage1Required)
            return new FinalScoreResult(0,
                $"I mərhələ tələbi: {rule.Stage1Required}/{rule.Stage1Total} " +
                $"≥{rule.MinimumScore}; faktiki: {meetingMin}", false);
        return null;
    }

    private static FinalScoreResult HandleSingle(List<ScoredResult> s1, CommissionStageRule rule)
    {
        if (s1.Count == 0) return new(null, "Normativ yoxdur", false);
        var score = s1.First().Score;
        var passed = score >= rule.MinimumScore;
        return new(score, passed ? null : $"Bal < {rule.MinimumScore}", passed);
    }

    private static FinalScoreResult HandleAvg(List<ScoredResult> s1, CommissionStageRule rule)
    {
        if (s1.Count == 0) return new(null, "Normativ yoxdur", false);
        if (Stage1Gate(s1, rule) is { } gateFail) return gateFail;
        var avg = (byte)Math.Round(s1.Average(r => (decimal)r.Score), MidpointRounding.AwayFromZero);
        return new(avg, null, avg >= rule.MinimumScore);
    }

    private static FinalScoreResult HandleTotalXal(
        List<ScoredResult> stage1, List<ScoredResult> totalXal, CommissionStageRule rule)
    {
        if (Stage1Gate(stage1, rule) is { } gateFail) return gateFail;
        if (totalXal.Count == 0) return new(null, "Ümumi xal nəticəsi hələ yoxdur", false);
        var score = totalXal.Max(r => r.Score);
        return new(score, null, score >= rule.MinimumScore);
    }

    private static FinalScoreResult HandleStage2Avg(
        List<ScoredResult> s1, List<ScoredResult> s2, CommissionStageRule rule)
    {
        if (Stage1Gate(s1, rule) is { } gateFail) return gateFail;
        if (s2.Count == 0) return new(null, "II mərhələ nəticəsi yoxdur", false);
        var avg = (byte)Math.Round(s2.Average(r => (decimal)r.Score), MidpointRounding.AwayFromZero);
        return new(avg, null, avg >= rule.MinimumScore);
    }

    private static FinalScoreResult HandleChainedAvg(
        List<ScoredResult> s1, List<ScoredResult> s2, CommissionStageRule rule)
    {
        if (s1.Count == 0) return new(null, "Birinci normativ yoxdur", false);
        if (s1[0].Score < rule.MinimumScore)
            return new(0, $"1-ci normativ < {rule.MinimumScore} → 2-ci normativə buraxılmır", false);
        if (s2.Count == 0) return new(null, "2-ci normativ hələ yoxdur", false);
        var all = s1.Concat(s2).ToList();
        var avg = (byte)Math.Round(all.Average(r => (decimal)r.Score), MidpointRounding.AwayFromZero);
        return new(avg, null, avg >= rule.MinimumScore);
    }
}