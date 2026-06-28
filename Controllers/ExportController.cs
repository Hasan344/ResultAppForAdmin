using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Application.DTOs.Export;
using ResultAppForAdmin.Api.Domain.Entities.Existing;
using ResultAppForAdmin.Api.Infrastructure.Persistence;
using System.Linq;

namespace ResultAppForAdmin.Api.Controllers;

// ────────────────────────────────────────────────────────────────────────────
// ExportController — exam-station-app (SQLite) layihəsinin master data-nı
// çəkdiyi ixrac API-si. Station tərəf `GET /api/export/snapshot` çağırıb bütün
// cədvəlləri tək cavabda alır (resultsapp-import.js → fetchSnapshot).
//
// Ekspertlər YALNIZ Exam_Expert_SubProfessions-dan gəlir (alt-ixtisas üzrə
// təyin). Exam_Experts artıq istifadə olunmur.
//
// Bütün DTO-lar snake_case qaytarır (ExportDtos.cs-də [JsonPropertyName] ilə).
// ────────────────────────────────────────────────────────────────────────────
[ApiController]
[Route("api/[controller]")]
public class ExportController : ControllerBase
{
    private readonly AppDbContext _db;
    public ExportController(AppDbContext db) => _db = db;

    // ────────────────────────────────────────────────────────────────────
    // SECTIONS
    // ────────────────────────────────────────────────────────────────────
    [HttpGet("sections")]
    public async Task<IEnumerable<SectionExportDto>> Sections(CancellationToken ct) =>
        await _db.Sections.AsNoTracking()
            .OrderBy(s => s.Id)
            .Select(s => new SectionExportDto(
                s.Id, s.Name,
                s.SectCode.HasValue ? s.SectCode.Value.ToString() : null))
            .ToListAsync(ct);

    // ────────────────────────────────────────────────────────────────────
    // EXERCISES
    // ────────────────────────────────────────────────────────────────────
    [HttpGet("exercises")]
    public async Task<IEnumerable<ExerciseExportDto>> Exercises(CancellationToken ct) =>
        await _db.Exercises.AsNoTracking()
            .OrderBy(e => e.DisplayOrder).ThenBy(e => e.Id)
            .Select(e => new ExerciseExportDto(
                e.Id, e.Code, e.Name, e.Unit, e.Direction, e.DisplayOrder, null))
            .ToListAsync(ct);

    // ────────────────────────────────────────────────────────────────────
    // COMMISSIONS
    // ────────────────────────────────────────────────────────────────────
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

    // ────────────────────────────────────────────────────────────────────
    // COMMISSION_EXERCISES — scoring_rules-dan törədilir
    // ────────────────────────────────────────────────────────────────────
    [HttpGet("commission-exercises")]
    public async Task<IEnumerable<CommissionExerciseExportDto>> CommissionExercises(
        [FromQuery] string? commissionNo, CancellationToken ct = default)
    {
        var rulesQ = _db.ScoringRules.AsNoTracking().Where(r => r.IsActive);
        if (!string.IsNullOrWhiteSpace(commissionNo))
            rulesQ = rulesQ.Where(r => r.CommissionNo == commissionNo);

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
                p.CommissionNo, exMap[p.ExerciseId].Code, exMap[p.ExerciseId].DisplayOrder))
            .OrderBy(x => x.CommissionNo).ThenBy(x => x.DisplayOrder)
            .ToList();
    }

    // ────────────────────────────────────────────────────────────────────
    // EXAMS
    // ────────────────────────────────────────────────────────────────────
    [HttpGet("exams")]
    public async Task<IEnumerable<ExamExportDto>> Exams(
        [FromQuery] int? sectionId,
        [FromQuery] int? districtId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] string? commissionNo,
        CancellationToken ct = default)
    {
        var q = _db.Exams.AsNoTracking()
            .Include(e => e.ExamCommissions).ThenInclude(ec => ec.Commission)
            .AsQueryable();

        if (sectionId.HasValue) q = q.Where(e => e.SectionId == sectionId.Value);
        if (districtId.HasValue) q = q.Where(e => e.DistrictId == districtId.Value);
        if (from.HasValue) q = q.Where(e => e.ExamDate >= from.Value);
        if (to.HasValue) q = q.Where(e => e.ExamDate <= to.Value);
        if (!string.IsNullOrWhiteSpace(commissionNo))
            q = q.Where(e => e.ExamCommissions.Any(ec => ec.Commission.CommissionNo == commissionNo));

        return await q.OrderByDescending(e => e.ExamDate).ThenBy(e => e.Id)
            .Select(e => new ExamExportDto(
                e.Id, e.Name,
                e.ExamDate.ToString("yyyy-MM-dd"),
                e.SectionId == 0 ? (int?)null : e.SectionId,
                null, null))
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

        if (examId.HasValue) q = q.Where(ec => ec.ExamId == examId.Value);
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
            .OrderBy(s => s.ExamId).ThenBy(s => s.CommissionNo)
            .ThenBy(s => s.QrupNum).ThenBy(s => s.SNomer)
            .Select(s => new StudentExportDto(
                s.Id, s.ExamId, s.SNomer, s.IsN, s.Surname, s.Name, s.FatherName,
                s.BirthDate.HasValue ? s.BirthDate.Value.ToString("yyyy-MM-dd") : null,
                s.Gender, s.QrupNum, s.Kodixtisas, s.IxtisasName, s.AltNov,
                s.CommissionNo, null))
            .ToListAsync(ct);
    }

    // ────────────────────────────────────────────────────────────────────
    // EXPERTS — alt-ixtisas (Exam_Expert_SubProfessions) üzrə təyin olunanlar
    // ────────────────────────────────────────────────────────────────────
    [HttpGet("exam-expert-subprofessions")]
    public async Task<IEnumerable<ExamExpertSubprofessionExportDto>> ExamExpertSubprofessions(
        [FromQuery] int? examId,
        [FromQuery] int? sectionId,
        CancellationToken ct = default)
    {
        var q = _db.ExamExpertSubProfessions.AsNoTracking()
            .Include(x => x.Exam)
            .AsQueryable();

        if (examId.HasValue) q = q.Where(x => x.ExamId == examId.Value);
        if (sectionId.HasValue) q = q.Where(x => x.Exam.SectionId == sectionId.Value);

        return await q
            .OrderBy(x => x.ExamId).ThenBy(x => x.ExpertId)
            .Select(x => new ExamExpertSubprofessionExportDto(x.ExamId, x.ExpertId))
            .ToListAsync(ct);
    }

    [HttpGet("photos")]
    public async Task<IEnumerable<PhotoExportDto>> Photos(
    [FromQuery] int? examId,
    [FromQuery] string? commissionNo,
    [FromQuery] int? sectionId,
    CancellationToken ct = default)
    {
        var sQ = _db.Students.AsNoTracking().AsQueryable();
        if (examId.HasValue) sQ = sQ.Where(s => s.ExamId == examId.Value);
        if (!string.IsNullOrWhiteSpace(commissionNo)) sQ = sQ.Where(s => s.CommissionNo == commissionNo);
        if (sectionId.HasValue) sQ = sQ.Where(s => s.Exam.SectionId == sectionId.Value);

        var isNs = await sQ.Select(s => s.IsN).Distinct().ToListAsync(ct);

        // Xam baytları əvvəlcə çək (Convert.ToBase64String SQL-ə tərcümə olunmur)
        var rows = await _db.Photos.AsNoTracking()
            .Where(p => isNs.Contains(p.IsN))
            .OrderBy(p => p.IsN)
            .Select(p => new { p.Id, p.IsN, p.Ad, p.Soyad, p.Ata, p.PhotoBase64 })
            .ToListAsync(ct);

        return rows.Select(p => new PhotoExportDto(
            p.Id, p.IsN, p.Ad, p.Soyad, p.Ata,
            p.PhotoBase64 == null ? null : Convert.ToBase64String(p.PhotoBase64)))
            .ToList();
    }


    [HttpGet("snapshot")]
    public async Task<SnapshotExportDto> Snapshot(
        [FromQuery] int? examId,
        [FromQuery] int? sectionId,
        [FromQuery] int? buildingId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] string? commissionNo,
        CancellationToken ct = default)
    {
        // 1. Exams (filter tətbiq olunur)
        var examsQ = _db.Exams.AsNoTracking()
            .Include(e => e.ExamCommissions).ThenInclude(ec => ec.Commission)
            .AsQueryable();

        if (examId.HasValue) examsQ = examsQ.Where(e => e.Id == examId.Value);
        if (sectionId.HasValue) examsQ = examsQ.Where(e => e.SectionId == sectionId.Value);
        if (buildingId.HasValue) examsQ = examsQ.Where(e => e.ExamBuldingId == buildingId.Value);
        if (from.HasValue) examsQ = examsQ.Where(e => e.ExamDate >= from.Value);
        if (to.HasValue) examsQ = examsQ.Where(e => e.ExamDate <= to.Value);
        if (!string.IsNullOrWhiteSpace(commissionNo))
            examsQ = examsQ.Where(e => e.ExamCommissions.Any(ec => ec.Commission.CommissionNo == commissionNo));

        var examEntities = await examsQ.ToListAsync(ct);
        var examIds = examEntities.Select(e => e.Id).ToList();

        // 2. Əlaqəli commission_no-lar
        var relatedCommissionNos = examEntities
            .SelectMany(e => e.ExamCommissions.Select(ec => ec.Commission.CommissionNo))
            .Distinct()
            .ToList();

        var commissionsQ = _db.Commissions.AsNoTracking().AsQueryable();
        if (sectionId.HasValue)
            commissionsQ = commissionsQ.Where(c => c.SectionId == sectionId.Value);
        if (examIds.Any() && (examId.HasValue || buildingId.HasValue || !string.IsNullOrWhiteSpace(commissionNo)))
            commissionsQ = commissionsQ.Where(c => relatedCommissionNos.Contains(c.CommissionNo));

        var commissions = await commissionsQ
            .OrderBy(c => c.CommissionNo)
            .Select(c => new CommissionExportDto(c.Id, c.CommissionNo, c.Name, c.SectionId))
            .ToListAsync(ct);

        var commissionNos = commissions.Select(c => c.CommissionNo).ToList();

        // 3. Lazım olan sections
        var sectionIds = commissions.Select(c => c.SectionId).Distinct().ToList();
        var sectionsQ = _db.Sections.AsNoTracking().AsQueryable();
        if (sectionId.HasValue || examId.HasValue || buildingId.HasValue || !string.IsNullOrWhiteSpace(commissionNo))
            sectionsQ = sectionsQ.Where(s => sectionIds.Contains(s.Id));

        var sections = await sectionsQ
            .OrderBy(s => s.Id)
            .Select(s => new SectionExportDto(
                s.Id, s.Name,
                s.SectCode.HasValue ? s.SectCode.Value.ToString() : null))
            .ToListAsync(ct);

        // 4. Exercises (hər zaman hamısı)
        var exercises = await _db.Exercises.AsNoTracking()
            .OrderBy(e => e.DisplayOrder).ThenBy(e => e.Id)
            .Select(e => new ExerciseExportDto(
                e.Id, e.Code, e.Name, e.Unit, e.Direction, e.DisplayOrder, null))
            .ToListAsync(ct);

        // 5. Commission-exercises — scoring_rules-dan
        var rulesQ = _db.ScoringRules.AsNoTracking().Where(r => r.IsActive);
        if (commissionNos.Any() && (examId.HasValue || sectionId.HasValue || buildingId.HasValue || !string.IsNullOrWhiteSpace(commissionNo)))
            rulesQ = rulesQ.Where(r => commissionNos.Contains(r.CommissionNo));

        var rulePairs = await rulesQ
            .Select(r => new { r.CommissionNo, r.ExerciseId })
            .ToListAsync(ct);

        var exMapForCe = exercises.ToDictionary(e => e.Id, e => new { e.Code, e.DisplayOrder });

        var commissionExercises = rulePairs
            .Distinct()
            .Where(p => exMapForCe.ContainsKey(p.ExerciseId))
            .Select(p => new CommissionExerciseExportDto(
                p.CommissionNo, exMapForCe[p.ExerciseId].Code, exMapForCe[p.ExerciseId].DisplayOrder))
            .OrderBy(x => x.CommissionNo).ThenBy(x => x.DisplayOrder)
            .ToList();

        // 6. Exam-commissions
        var examCommissions = examEntities
            .SelectMany(e => e.ExamCommissions.Select(ec =>
                new ExamCommissionExportDto(e.Id, ec.Commission.CommissionNo)))
            .OrderBy(ec => ec.ExamId).ThenBy(ec => ec.CommissionNo)
            .ToList();

        // 7. Exams DTO
        var exams = examEntities
            .OrderByDescending(e => e.ExamDate).ThenBy(e => e.Id)
            .Select(e => new ExamExportDto(
                e.Id, e.Name,
                e.ExamDate.ToString("yyyy-MM-dd"),
                e.SectionId == 0 ? (int?)null : e.SectionId,
                null, null))
            .ToList();

        // 8. Students
        var studentsQ = _db.Students.AsNoTracking()
            .Where(s => examIds.Contains(s.ExamId));
        if (!string.IsNullOrWhiteSpace(commissionNo))
            studentsQ = studentsQ.Where(s => s.CommissionNo == commissionNo);

        var students = await studentsQ
            .OrderBy(s => s.ExamId).ThenBy(s => s.CommissionNo)
            .ThenBy(s => s.QrupNum).ThenBy(s => s.SNomer)
            .Select(s => new StudentExportDto(
                s.Id, s.ExamId, s.SNomer, s.IsN, s.Surname, s.Name, s.FatherName,
                s.BirthDate.HasValue ? s.BirthDate.Value.ToString("yyyy-MM-dd") : null,
                s.Gender, s.QrupNum, s.Kodixtisas, s.IxtisasName, s.AltNov,
                s.CommissionNo, null))
            .ToListAsync(ct);

        // 9. Ekspertlər — YALNIZ Exam_Expert_SubProfessions (alt-ixtisas üzrə təyin)
        var subProfLinks = await _db.ExamExpertSubProfessions.AsNoTracking()
            .Where(x => examIds.Contains(x.ExamId))
            .Select(x => new { x.ExamId, x.ExpertId })
            .ToListAsync(ct);

        var examExpertSubprofessions = subProfLinks
            .Select(x => new ExamExpertSubprofessionExportDto(x.ExamId, x.ExpertId))
            .OrderBy(x => x.ExamId).ThenBy(x => x.ExpertId)
            .ToList();

        var expertIds = subProfLinks.Select(x => x.ExpertId).Distinct().ToList();

        var experts = await _db.Experts.AsNoTracking()
            .Where(e => expertIds.Contains(e.Id))
            .OrderBy(e => e.Surname).ThenBy(e => e.Name)
            .Select(e => new ExpertExportDto(
                e.Id, e.Name, e.Surname, e.Fname, e.FinCode, e.SectionId, e.Gender))
            .ToListAsync(ct);

        //10 photos
        var studentIsNs = students.Select(s => s.IsN).Distinct().ToList();

        var photoRows = await _db.Photos.AsNoTracking()
            .Where(p => studentIsNs.Contains(p.IsN))
            .OrderBy(p => p.IsN)
            .Select(p => new { p.Id, p.IsN, p.Ad, p.Soyad, p.Ata, p.PhotoBase64 })
            .ToListAsync(ct);

        var photos = photoRows
            .Select(p => new PhotoExportDto(
                p.Id, p.IsN, p.Ad, p.Soyad, p.Ata,
                p.PhotoBase64 == null ? null : Convert.ToBase64String(p.PhotoBase64)))
            .ToList();



        return new SnapshotExportDto(
            ExportedAt: DateTime.UtcNow.ToString("o"),
            Source: "ResultsApp",
            Filters: new Dictionary<string, object?>
            {
                ["examId"] = examId,
                ["sectionId"] = sectionId,
                ["buildingId"] = buildingId,
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
            Students: students,
            Experts: experts,
            ExamExpertSubprofessions: examExpertSubprofessions,
            Photos: photos);
    }
}