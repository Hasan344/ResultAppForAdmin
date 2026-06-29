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

    // ════════════════════════════════════════════════════════════════════════
    // I MƏRHƏLƏ (ÜFH) normativ kodları — netice (mərhələ-1) faylının avtomatik
    // aşkarlanması üçün. ScoringService.Stage1UfhCodes ilə eyni saxlanmalıdır.
    // ════════════════════════════════════════════════════════════════════════
    private static readonly string[] Stage1UfhCodes =
    {
        "sprint_100m", "cross_1000m", "sprint_400m", "pull_up", "long_jump",
    };

    // Komissiya iki-mərhələli qapılıdırsa VƏ bu imtahanda hələ II mərhələ nəticəsi
    // yoxdursa → netice faylı mərhələ-1 qapısını göstərməlidir (stage1Only=true).
    // 62 kimi qapısız komissiyalarda və ya II mərhələ artıq daxil olunubsa → false.
    private async Task<bool> UseStage1GateAsync(string commissionNo, int examId, CancellationToken ct)
    {
        var rule = await _db.CommissionStageRules.AsNoTracking()
            .FirstOrDefaultAsync(x => x.CommissionNo == commissionNo, ct);
        if (rule is null || rule.Stage1Required <= 0) return false;

        var sids = await _db.Students.AsNoTracking()
            .Where(s => s.ExamId == examId && s.CommissionNo == commissionNo)
            .Select(s => s.Id)
            .ToListAsync(ct);
        if (sids.Count == 0) return false;

        // ÜFH normativlərindən kənar hər hansı nəticə = II mərhələ daxil olunub.
        bool hasStage2 = await _db.StudentExamResults.AsNoTracking()
            .Where(r => sids.Contains(r.StudentId))
            .AnyAsync(r => !Stage1UfhCodes.Contains(r.Exercise.Code), ct);

        return !hasStage2;
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
        if (to.HasValue) q = q.Where(e => e.ExamDate <= to.Value);
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

        var expertCount = await _db.ExamExpertSubProfessions.CountAsync(x => x.ExamId == id, ct);

        // ── Monitors: role-bazlı count'lar ───────────────────────────────
        // Role: 1=İmtahan rəhbəri, 2=Nəzarətçi, 4=Könüllü, 5=Digər işçilər
        var monitorCountsByRole = await _db.ExamMonitors.AsNoTracking()
            .Where(x => x.ExamId == id)
            .GroupBy(x => x.Monitor.Role)
            .Select(g => new { Role = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        int monitorTotal = monitorCountsByRole.Sum(x => x.Count);
        int leaderCount = monitorCountsByRole.FirstOrDefault(x => x.Role == 1)?.Count ?? 0;
        int monitorCount = monitorCountsByRole.FirstOrDefault(x => x.Role == 2)?.Count ?? 0;
        int volunteerCount = monitorCountsByRole.FirstOrDefault(x => x.Role == 4)?.Count ?? 0;
        int otherStaffCount = monitorCountsByRole.FirstOrDefault(x => x.Role == 5)?.Count ?? 0;

        var repCount = await _db.ExamRepresentatives.CountAsync(x => x.ExamId == id, ct);
        var studCount = await _db.Students.CountAsync(x => x.ExamId == id, ct);

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
        .OrderBy(x => x.Expert.Surname).ThenBy(x => x.Expert.Name)
        .Select(x => new {
            x.Expert.Id,
            x.Expert.Name,
            x.Expert.Surname,
            x.Expert.Fname,
            x.Expert.FinCode,
            Profession = x.Expert.Profession,
            SubProfession = x.SubProfession != null ? x.SubProfession.Name : null,
            x.RoomId,
            RoomName = _db.ExamRooms
                .Where(r => r.Id == x.RoomId)
                .Select(r => r.Name)
                .FirstOrDefault(),
            x.IsAttended
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
                x.Representative.Id,
                x.Representative.Name,
                x.Representative.Surname,
                x.Representative.Fname,
                x.Representative.FinCode
            })
            .ToListAsync(ct);

    [HttpGet("{examId:int}/result-file")]
    public async Task<IActionResult> ExportResultFile(
    int examId,
    [FromQuery] int? qrupNum,
    [FromQuery] string? commissionNo,
    [FromQuery] bool? stage1Only,
    CancellationToken ct)
    {
        var exists = await _db.Exams.AnyAsync(e => e.Id == examId, ct);
        if (!exists) return NotFound($"examId={examId} tapılmadı");

        // stage1Only verilməyibsə: komissiya filtri varsa avtomatik aşkarla, yoxsa false.
        bool s1 = stage1Only ??
            (!string.IsNullOrWhiteSpace(commissionNo) && await UseStage1GateAsync(commissionNo, examId, ct));

        var bytes = await _export.ExportAsync(
            examId, qrupNum, commissionNo,
            rescoreKodixtisas: null, subProfessionLabel: null, fennKod: null,
            stage1Only: s1, ct: ct);
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"netice_exam{examId}.xlsx");
    }


    [HttpGet("{examId:int}/result-file/split")]
    public async Task<IActionResult> ExportResultFilesSplit(
     int examId,
     [FromQuery] string? commissionNo,
     [FromQuery] int? qrupNum,
     [FromQuery] bool? stage1Only,
     CancellationToken ct)
    {
        if (!await _db.Exams.AnyAsync(e => e.Id == examId, ct))
            return NotFound($"examId={examId} tapılmadı");

        // Komissiyalar: filter verilibsə onu, yoxsa imtahandakı tələbələrdən götür
        List<string> commissions;
        if (!string.IsNullOrWhiteSpace(commissionNo))
            commissions = new() { commissionNo };
        else
            commissions = await _db.Students.AsNoTracking()
                .Where(s => s.ExamId == examId && (!qrupNum.HasValue || s.QrupNum == qrupNum.Value))
                .Select(s => s.CommissionNo)
                .Distinct().OrderBy(x => x).ToListAsync(ct);

        // Çıxarılacaq fayllar: hər komissiya üçün ya tək fayl, ya alt-ixtisas başına bir fayl
        var plan = new List<(string comm, string? kod, string? label, int? fenn, string suffix)>();
        foreach (var comm in commissions)
        {
            var kods = await _db.ScoringRules.AsNoTracking()
                .Where(r => r.CommissionNo == comm && r.Kodixtisas != null)
                .Select(r => r.Kodixtisas!).Distinct().OrderBy(x => x).ToListAsync(ct);

            if (kods.Count < 2)
                plan.Add((comm, null, null, null, $"kom{comm}"));   // tək alt-ixtisas → saxlanılan ballar
            else
                foreach (var kod in kods)
                {
                    var (label, fenn) = SubProfessionMeta(kod);
                    plan.Add((comm, kod, label, fenn, $"kom{comm}_{kod}"));
                }
        }

        // Hər komissiya üçün stage1Only: override verilibsə onu, yoxsa avtomatik aşkarla.
        async Task<bool> ResolveStage1(string comm) =>
            stage1Only ?? await UseStage1GateAsync(comm, examId, ct);

        // Tək fayl → birbaşa xlsx
        if (plan.Count == 1)
        {
            var f = plan[0];
            bool s1 = await ResolveStage1(f.comm);
            var bytes = await _export.ExportAsync(
                examId, qrupNum, f.comm, f.kod, f.label, f.fenn, stage1Only: s1, ct: ct);
            return File(bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"netice_exam{examId}.xlsx");
        }

        // Çox fayl → ZIP (446: kom62_UFH, kom62_ABT, kom62_KSI — hər biri 240 tələbə)
        using var zipStream = new MemoryStream();
        using (var zip = new System.IO.Compression.ZipArchive(
            zipStream, System.IO.Compression.ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var f in plan)
            {
                bool s1 = await ResolveStage1(f.comm);
                var bytes = await _export.ExportAsync(
                    examId, qrupNum, f.comm, f.kod, f.label, f.fenn, stage1Only: s1, ct: ct);
                var safe = f.suffix;
                foreach (var c in Path.GetInvalidFileNameChars()) safe = safe.Replace(c, '_');
                var entry = zip.CreateEntry($"netice_exam{examId}_{safe}.xlsx",
                    System.IO.Compression.CompressionLevel.Optimal);
                using var es = entry.Open();
                es.Write(bytes, 0, bytes.Length);
            }
        }
        zipStream.Position = 0;
        return File(zipStream.ToArray(), "application/zip", $"netice_exam{examId}.zip");
    }

    private static (string label, int? fennKod) SubProfessionMeta(string kodixtisas) => kodixtisas switch
    {
        "UFH" => ("Ümumi fiziki hazırlıq", 33),
        "ABT" => ("Adaptiv bədən tərbiyəsi", 34),
        "KSI" => ("Kütləvi sağlamlaşdırıcı idman", 35),
        _ => (kodixtisas, null)
    };

}