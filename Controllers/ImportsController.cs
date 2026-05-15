using ResultAppForAdmin.Api.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace ResultAppForAdmin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ImportsController : ControllerBase
{
    private readonly IImportService _import;
    public ImportsController(IImportService import) => _import = import;

    /// <summary>
    /// Upload an Excel file with student rows and bind them to an exam.
    /// Sends multipart form-data with: file (.xlsx), commissionNo, examDate (YYYY-MM-DD).
    /// </summary>
    [HttpPost("students")]
    [RequestSizeLimit(20_000_000)]   // 20 MB
    public async Task<IActionResult> ImportStudents(
        IFormFile file,
        [FromForm] string commissionNo,
        [FromForm] DateOnly examDate,
        CancellationToken ct = default)
    {
        if (file is null || file.Length == 0)
            return BadRequest("File is required");
        if (!Path.GetExtension(file.FileName).Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Only .xlsx files are supported");

        await using var stream = file.OpenReadStream();
        var result = await _import.ImportStudentsAsync(
            stream, file.FileName, commissionNo, examDate,
            User?.Identity?.Name, ct);

        return Ok(result);
    }
}
