using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Auth;
using ResultAppForAdmin.Api.Domain.Entities.Existing;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtTokenService _jwt;
    private static readonly PasswordHasher<AppUser> _hasher = new();

    public AuthController(AppDbContext db, JwtTokenService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public sealed record LoginDto(string UserName, string Password);

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.UserName) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { error = "İstifadəçi adı və şifrə tələb olunur" });

        var normalized = dto.UserName.Trim().ToUpperInvariant();
        var user = await _db.AppUsers.AsNoTracking()
            .FirstOrDefaultAsync(u => u.NormalizedUserName == normalized);

        // Aynı hata mesajı — kullanıcı var/yok bilgisini sızdırmamak için
        if (user is null || string.IsNullOrEmpty(user.PasswordHash))
            return Unauthorized(new { error = "İstifadəçi adı və ya şifrə yanlışdır" });

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
        if (result == PasswordVerificationResult.Failed)
            return Unauthorized(new { error = "İstifadəçi adı və ya şifrə yanlışdır" });

        var token = _jwt.Create(user);
        return Ok(new
        {
            token,
            user = new { user.Id, user.UserName, user.FirstName, user.LastName, user.IsAdmin }
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var u = await _db.AppUsers.AsNoTracking()
            .Where(x => x.Id == userId)
            .Select(x => new { x.Id, x.UserName, x.FirstName, x.LastName, x.IsAdmin })
            .FirstOrDefaultAsync();

        return u is null ? Unauthorized() : Ok(u);
    }
}