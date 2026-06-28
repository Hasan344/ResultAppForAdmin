
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

namespace ResultAppForAdmin.Api.Auth;

public sealed class AdminAuthorizationHandler : AuthorizationHandler<AdminRequirement>
{
    private readonly AppDbContext _db;     
    private readonly IMemoryCache _cache;

    public AdminAuthorizationHandler(AppDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, AdminRequirement requirement)
    {
        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return; // kimliksiz -> fail (Succeed çağırmıyoruz)

        var isAdmin = await _cache.GetOrCreateAsync($"isadmin:{userId}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            return await _db.AppUsers.AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => (bool?)u.IsAdmin)
                .FirstOrDefaultAsync() ?? false;
        });

        if (isAdmin)
            context.Succeed(requirement);
    }
}