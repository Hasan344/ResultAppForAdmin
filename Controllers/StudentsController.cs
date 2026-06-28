using ResultAppForAdmin.Api.Application.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StudentsController : ControllerBase
{
    private readonly AppDbContext _db;
    public StudentsController(AppDbContext db) => _db = db;

    /// <summary>List students of an exam, optionally filtered by qrup_num</summary>
    [HttpGet]
    public async Task<IEnumerable<StudentDto>> List(
        [FromQuery] int examId,
        [FromQuery] int? qrupNum,
        [FromQuery] string? commissionNo,
        CancellationToken ct = default)
    {
        var q = _db.Students.AsNoTracking().Where(s => s.ExamId == examId);
        if (qrupNum.HasValue) q = q.Where(s => s.QrupNum == qrupNum.Value);
        if (!string.IsNullOrEmpty(commissionNo)) q = q.Where(s => s.CommissionNo == commissionNo);

        return await q.OrderBy(s => s.QrupNum).ThenBy(s => s.SNomer)
            .Select(s => new StudentDto(
                s.Id, s.SNomer, s.IsN, s.Surname, s.Name, s.FatherName,
                s.BirthDate, s.Gender, s.QrupNum, s.Kodixtisas, s.IxtisasName,
                s.AltNov, s.CommissionNo, s.IsAttended))
            .ToListAsync(ct);
    }

    /// <summary>
    /// Ümumi bazadan tələbə axtarışı — ad / soyad / iş № (is_n) üzrə.
    /// Hər nəticə sətri = bir imtahan iştirakı. ?sectionId verilsə cari bölmə
    /// ilə məhdudlaşır. Maksimum 100 nəticə.
    /// </summary>
    [HttpGet("search")]
    public async Task<IEnumerable<object>> Search(
        [FromQuery] string q,
        [FromQuery] int? sectionId,
        CancellationToken ct = default)
    {
        var term = (q ?? "").Trim();
        if (term.Length < 2) return Array.Empty<object>();

        var query = _db.Students.AsNoTracking()
            .Where(s =>
                EF.Functions.Like(s.Surname, $"%{term}%") ||
                EF.Functions.Like(s.Name, $"%{term}%") ||
                EF.Functions.Like(s.IsN, $"%{term}%"));

        if (sectionId.HasValue)
            query = query.Where(s => s.Exam.SectionId == sectionId.Value);

        return await query
            .OrderBy(s => s.Surname).ThenBy(s => s.Name).ThenByDescending(s => s.ExamId)
            .Take(100)
            .Select(s => new {
                s.Id,
                s.ExamId,
                ExamName = s.Exam.Name,
                ExamDate = s.Exam.ExamDate,
                s.IsN,
                s.Surname,
                s.Name,
                s.FatherName,
                s.Gender,
                s.QrupNum,
                s.CommissionNo,
                s.Kodixtisas,
                s.IxtisasName,
                s.AltNov,
                s.IsAttended
            })
            .ToListAsync(ct);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<StudentDto>> Get(int id, CancellationToken ct)
    {
        var s = await _db.Students.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return s is null ? NotFound()
            : new StudentDto(s.Id, s.SNomer, s.IsN, s.Surname, s.Name, s.FatherName,
                s.BirthDate, s.Gender, s.QrupNum, s.Kodixtisas, s.IxtisasName,
                s.AltNov, s.CommissionNo, s.IsAttended);
    }

    [HttpPatch("{id:int}/attendance")]
    public async Task<IActionResult> SetAttendance(int id, [FromBody] bool attended, CancellationToken ct)
    {
        var s = await _db.Students.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (s is null) return NotFound();
        s.IsAttended = attended;
        s.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}