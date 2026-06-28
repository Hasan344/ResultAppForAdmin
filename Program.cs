using FluentValidation;
using ResultAppForAdmin.Api.Application.Services;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResultAppForAdmin.Api.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// ─── DB ─────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("ResultsApp"))
       .EnableSensitiveDataLogging(builder.Environment.IsDevelopment()));

// ─── Services ────────────────────
builder.Services.AddScoped<IScoringService, ScoringService>();
builder.Services.AddScoped<IImportService, ImportService>();
builder.Services.AddScoped<IResultsService, ResultsService>();
builder.Services.AddScoped<IResultsImportService, ResultsImportService>();
builder.Services.AddScoped<IResultFileExportService, ResultFileExportService>();

// ─── Controllers ─────────────────
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(o =>
        o.SuppressMapClientErrors = false);

// ─── FluentValidation ────────────
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// ─── Swagger ─────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ─── CORS ────────────────────────
builder.Services.AddCors(opt => opt.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()));

builder.Services.AddProblemDetails();
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseExceptionHandler(errApp => errApp.Run(async ctx =>
{
    var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    var isDev = app.Environment.IsDevelopment();
    ctx.Response.ContentType = "application/json";
    ctx.Response.StatusCode = ex is InvalidOperationException ? 400 : 500;
    var problem = new
    {
        error = ex?.Message ?? "Server xətası",
        detail = isDev ? ex?.ToString() : ex?.InnerException?.Message,
        type = isDev ? ex?.GetType().FullName : null
    };
    await ctx.Response.WriteAsJsonAsync(problem);
}));
app.UseStatusCodePages();
app.UseCors();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");
app.Run();