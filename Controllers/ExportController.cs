

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Application.DTOs.Export;
using ResultAppForAdmin.Api.Domain.Entities.Existing;
using ResultAppForAdmin.Api.Infrastructure.Persistence;
using System.Linq;

namespace ResultAppForAdmin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExportController : ControllerBase
{
    private readonly AppDbContext _db;
    public ExportController(AppDbContext db) => _db = db;

    [HttpGet("sections")]
    public async Task<IEnumerable<SectionExportDto>> Sections(CancellationToken ct) =>
        await _db.Sections.AsNoTracking()
            .OrderBy(s => s.Id)
            .Select(s => new SectionExportDto(
                s.Id,
                s.Name,
                s.SectCode.HasValue ? s.SectCode.Value.ToString() : null))
            .ToListAsync(ct);

    [HttpGet("exercises")]
    public async Task<IEnumerable<ExerciseExportDto>> Exercises(CancellationToken ct) =>
        await _db.Exercises.AsNoTracking()
            .OrderBy(e => e.DisplayOrder).ThenBy(e => e.Id)
            .Select(e => new ExerciseExportDto(
                e.Id, e.Code, e.Name, e.Unit, e.Direction, e.DisplayOrder, null))
            .ToListAsync(ct);

    [HttpGet("commissions")]
    public async Task<IEnumerable<CommissionExportDto>> Commissions(
        [FromQuery] int? sectionId, CancellationToken ct = default)
    {
        var q = _db.Commissions.AsNoTracking().AsQueryable();
        if (sectionId.HasValue) q = q.Where(c => c.SectionId == sectionId.Value);

        return await q
            .OrderBy(c => c.CommissionNo)
            .Select(c => new CommissionExportDto(c.Id, c.CommissionNo, c.Name, c.SectionId))
            .ToListAsync(ct);
    }

    [HttpGet("commission-exercises")]
    public async Task<IEnumerable<CommissionExerciseExportDto>> CommissionExercises(
        [FromQuery] string? commissionNo, CancellationToken ct = default)
    {
        var rulesQ = _db.ScoringRules.AsNoTracking().Where(r => r.IsActive);
        if (!string.IsNullOrWhiteSpace(commissionNo))
            rulesQ = rulesQ.Where(r => r.CommissionNo == commissionNo);

        // (commission_no, exercise_id) cüt-lərini distinct çək, exercises ilə join
        var pairs = await rulesQ
             .Select(r => new { r.CommissionNo, r.ExerciseId })
             .ToListAsync(ct);

        var exercises = await _db.Exercises.AsNoTracking()
            .Select(e => new { e.Id, e.Code, e.DisplayOrder })
            .ToListAsync(ct);
        var exMap = exercises.ToDictionary(e => e.Id);

        return pairs
            .Distinct()
            .Where(p => exMap.ContainsKey(p.ExerciseId))
            .Select(p => new CommissionExerciseExportDto(
                p.CommissionNo,
                exMap[p.ExerciseId].Code,
                exMap[p.ExerciseId].DisplayOrder))
            .OrderBy(x => x.CommissionNo).ThenBy(x => x.DisplayOrder)
            .ToList();
    }

    // ────────────────────────────────────────────────────────────────────
    // EXAMS
    // ────────────────────────────────────────────────────────────────────
    [HttpGet("exams")]
    public async Task<IEnumerable<ExamExportDto>> Exams(
        [FromQuery] int? sectionId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] string? commissionNo,
        CancellationToken ct = default)
    {
        var q = _db.Exams.AsNoTracking()
            .Include(e => e.ExamCommissions).ThenInclude(ec => ec.Commission)
            .AsQueryable();

        if (sectionId.HasValue) q = q.Where(e => e.SectionId == sectionId.Value);
        if (from.HasValue)      q = q.Where(e => e.ExamDate >= from.Value);
        if (to.HasValue)        q = q.Where(e => e.ExamDate <= to.Value);
        if (!string.IsNullOrWhiteSpace(commissionNo))
            q = q.Where(e => e.ExamCommissions.Any(ec => ec.Commission.CommissionNo == commissionNo));

        return await q.OrderByDescending(e => e.ExamDate).ThenBy(e => e.Id)
            .Select(e => new ExamExportDto(
                e.Id,
                e.Name,
                e.ExamDate.ToString("yyyy-MM-dd"),
                e.SectionId == 0 ? (int?)null : e.SectionId,
                null,                       // notes — ResultsApp-da yoxdur
                null))                      // createdAt — ResultsApp-da yoxdur
            .ToListAsync(ct);
    }

    // ────────────────────────────────────────────────────────────────────
    // EXAM_COMMISSIONS
    // ────────────────────────────────────────────────────────────────────
    [HttpGet("exam-commissions")]
    public async Task<IEnumerable<ExamCommissionExportDto>> ExamCommissions(
        [FromQuery] int? examId,
        [FromQuery] int? sectionId,
        CancellationToken ct = default)
    {
        var q = _db.ExamCommissions.AsNoTracking()
            .Include(ec => ec.Commission)
            .Include(ec => ec.Exam)
            .AsQueryable();

        if (examId.HasValue)    q = q.Where(ec => ec.ExamId == examId.Value);
        if (sectionId.HasValue) q = q.Where(ec => ec.Exam.SectionId == sectionId.Value);

        return await q
            .OrderBy(ec => ec.ExamId).ThenBy(ec => ec.Commission.CommissionNo)
            .Select(ec => new ExamCommissionExportDto(ec.ExamId, ec.Commission.CommissionNo))
            .ToListAsync(ct);
    }

    // ────────────────────────────────────────────────────────────────────
    // STUDENTS
    // ────────────────────────────────────────────────────────────────────
    [HttpGet("students")]
    public async Task<IEnumerable<StudentExportDto>> Students(
        [FromQuery] int? examId,
        [FromQuery] string? commissionNo,
        [FromQuery] int? sectionId,
        CancellationToken ct = default)
    {
        var q = _db.Students.AsNoTracking().AsQueryable();

        if (examId.HasValue) q = q.Where(s => s.ExamId == examId.Value);
        if (!string.IsNullOrWhiteSpace(commissionNo))
            q = q.Where(s => s.CommissionNo == commissionNo);
        if (sectionId.HasValue)
            q = q.Where(s => s.Exam.SectionId == sectionId.Value);

        return await q
            .OrderBy(s => s.ExamId)
            .ThenBy(s => s.CommissionNo)
            .ThenBy(s => s.QrupNum)
            .ThenBy(s => s.SNomer)
            .Select(s => new StudentExportDto(
                s.Id,
                s.ExamId,
                s.SNomer,
                s.IsN,
                s.Surname,
                s.Name,
                s.FatherName,
                s.BirthDate.HasValue ? s.BirthDate.Value.ToString("yyyy-MM-dd") : null,
                s.Gender,
                s.QrupNum,
                s.Kodixtisas,
                s.IxtisasName,
                s.AltNov,
                s.CommissionNo,
                null))                    // photo_path — ResultsApp-da yoxdur
            .ToListAsync(ct);
    }

    [HttpGet("snapshot")]
    public async Task<SnapshotExportDto> Snapshot(
        [FromQuery] int? examId,
        [FromQuery] int? sectionId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] string? commissionNo,
        [FromQuery] int? districtId,
        CancellationToken ct = default)
    {
        // 1. Exams (filter tətbiq olunur)
        var examsQ = _db.Exams.AsNoTracking()
            .Include(e => e.ExamCommissions).ThenInclude(ec => ec.Commission)
            .AsQueryable();

        if (examId.HasValue) examsQ = examsQ.Where(e => e.Id == examId.Value);
        if (sectionId.HasValue) examsQ = examsQ.Where(e => e.SectionId == sectionId.Value);
        if (from.HasValue) examsQ = examsQ.Where(e => e.ExamDate >= from.Value);
        if (to.HasValue) examsQ = examsQ.Where(e => e.ExamDate <= to.Value);
        if (districtId.HasValue) examsQ = examsQ.Where(e => e.DistrictId == districtId.Value);
        if (!string.IsNullOrWhiteSpace(commissionNo))
            examsQ = examsQ.Where(e => e.ExamCommissions.Any(ec => ec.Commission.CommissionNo == commissionNo));

        var examEntities = await examsQ.ToListAsync(ct);
        var examIds = examEntities.Select(e => e.Id).ToList();

        // 2. Filtr edilmiş exam-larla əlaqəli commission_no-lar
        var relatedCommissionNos = examEntities
            .SelectMany(e => e.ExamCommissions.Select(ec => ec.Commission.CommissionNo))
            .Distinct()
            .ToList();

        // Əgər filter yoxdursa bütün komissiyaları al
        var commissionsQ = _db.Commissions.AsNoTracking().AsQueryable();
        if (sectionId.HasValue)
            commissionsQ = commissionsQ.Where(c => c.SectionId == sectionId.Value);
        if (examIds.Any() && (examId.HasValue || !string.IsNullOrWhiteSpace(commissionNo)))
            commissionsQ = commissionsQ.Where(c => relatedCommissionNos.Contains(c.CommissionNo));

        var commissions = await commissionsQ
            .OrderBy(c => c.CommissionNo)
            .Select(c => new CommissionExportDto(c.Id, c.CommissionNo, c.Name, c.SectionId))
            .ToListAsync(ct);

        var commissionNos = commissions.Select(c => c.CommissionNo).ToList();

        // 3. Bu komissiyaların section_id-lərinə əsaslanaraq lazım olan sections
        var sectionIds = commissions.Select(c => c.SectionId).Distinct().ToList();
        var sectionsQ = _db.Sections.AsNoTracking().AsQueryable();
        if (sectionId.HasValue || examId.HasValue || !string.IsNullOrWhiteSpace(commissionNo))
            sectionsQ = sectionsQ.Where(s => sectionIds.Contains(s.Id));

        var sections = await sectionsQ
            .OrderBy(s => s.Id)
            .Select(s => new SectionExportDto(
                s.Id, s.Name,
                s.SectCode.HasValue ? s.SectCode.Value.ToString() : null))
            .ToListAsync(ct);

        // 4. Exercises (hər zaman hamısı — kiçik cədvəldir, scoring_rules-dakı bütün ID-lər referans verə bilər)
        var exercises = await _db.Exercises.AsNoTracking()
            .OrderBy(e => e.DisplayOrder).ThenBy(e => e.Id)
            .Select(e => new ExerciseExportDto(
                e.Id, e.Code, e.Name, e.Unit, e.Direction, e.DisplayOrder, null))
            .ToListAsync(ct);

        // 5. Commission-exercises — scoring_rules-dan törət
        var rulesQ = _db.ScoringRules.AsNoTracking().Where(r => r.IsActive);
        if (commissionNos.Any() && (examId.HasValue || sectionId.HasValue || !string.IsNullOrWhiteSpace(commissionNo)))
            rulesQ = rulesQ.Where(r => commissionNos.Contains(r.CommissionNo));

        var rulePairs = await rulesQ
            .Select(r => new { r.CommissionNo, r.ExerciseId })
            .ToListAsync(ct);

        // exercises siyahısını yuxarıda artıq çəkmişik (4-cü addım).
        // Onun Id→(Code, DisplayOrder) map-ini qururuq.
        var exMapForCe = exercises.ToDictionary(e => e.Id, e => new { e.Code, e.DisplayOrder });

        var commissionExercises = rulePairs
            .Distinct()
            .Where(p => exMapForCe.ContainsKey(p.ExerciseId))
            .Select(p => new CommissionExerciseExportDto(
                p.CommissionNo,
                exMapForCe[p.ExerciseId].Code,
                exMapForCe[p.ExerciseId].DisplayOrder))
            .OrderBy(x => x.CommissionNo).ThenBy(x => x.DisplayOrder)
            .ToList();

        // 6. Exam-commissions
        var examCommissions = examEntities
            .SelectMany(e => e.ExamCommissions.Select(ec =>
                new ExamCommissionExportDto(e.Id, ec.Commission.CommissionNo)))
            .OrderBy(ec => ec.ExamId).ThenBy(ec => ec.CommissionNo)
            .ToList();

        // 7. Exams DTO-larına çevir
        var exams = examEntities
            .OrderByDescending(e => e.ExamDate).ThenBy(e => e.Id)
            .Select(e => new ExamExportDto(
                e.Id, e.Name,
                e.ExamDate.ToString("yyyy-MM-dd"),
                e.SectionId == 0 ? (int?)null : e.SectionId,
                null, null))
            .ToList();

        // 8. Students
        List<StudentExportDto> students;
        if (examIds.Any())
        {
            var studentsQ = _db.Students.AsNoTracking()
                .Where(s => examIds.Contains(s.ExamId));
            if (!string.IsNullOrWhiteSpace(commissionNo))
                studentsQ = studentsQ.Where(s => s.CommissionNo == commissionNo);

            students = await studentsQ
                .OrderBy(s => s.ExamId).ThenBy(s => s.CommissionNo)
                .ThenBy(s => s.QrupNum).ThenBy(s => s.SNomer)
                .Select(s => new StudentExportDto(
                    s.Id, s.ExamId, s.SNomer, s.IsN, s.Surname, s.Name, s.FatherName,
                    s.BirthDate.HasValue ? s.BirthDate.Value.ToString("yyyy-MM-dd") : null,
                    s.Gender, s.QrupNum, s.Kodixtisas, s.IxtisasName, s.AltNov,
                    s.CommissionNo, null))
                .ToListAsync(ct);
        }
        else
        {
            students = new List<StudentExportDto>();
        }

        return new SnapshotExportDto(
            ExportedAt: DateTime.UtcNow.ToString("o"),
            Source: "ResultsApp",
            Filters: new Dictionary<string, object?>
            {
                ["examId"] = examId,
                ["sectionId"] = sectionId,
                ["from"] = from?.ToString("yyyy-MM-dd"),
                ["to"] = to?.ToString("yyyy-MM-dd"),
                ["commissionNo"] = commissionNo
            },
            Sections: sections,
            Exercises: exercises,
            Commissions: commissions,
            CommissionExercises: commissionExercises,
            Exams: exams,
            ExamCommissions: examCommissions,
            Students: students);
    }
}
