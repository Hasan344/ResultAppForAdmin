using FluentValidation;
using ResultAppForAdmin.Api.Application.Services;
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

// ─── Controllers ─────────────────
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(o =>
        o.SuppressMapClientErrors = false);

// ✅ NEW FluentValidation registration
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

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCors();
app.UseAuthorization();

app.MapControllers();

app.Run();