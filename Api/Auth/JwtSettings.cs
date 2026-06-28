namespace ResultAppForAdmin.Api.Auth;

public sealed class JwtSettings
{
    public string Key { get; set; } = default!;
    public string Issuer { get; set; } = default!;
    public string Audience { get; set; } = default!;
    public int ExpireHours { get; set; } = 8;
}