// ============================================================================
// ExportDtos.cs
// ----------------------------------------------------------------------------
// Hədəf SQLite layihəsinin sxemına uyğun export DTO-ları.
// Hər DTO hədəf cədvəlin sütun adlarını snake_case ilə qaytarır
// (JSON serializer-də [JsonPropertyName] ilə) — beləcə import script-i
// üçün təkrar mapping lazım deyil.
// ============================================================================

using System.Text.Json.Serialization;

namespace ResultAppForAdmin.Api.Application.DTOs.Export;

// ─── sections ────────────────────────────────────────────────────────────
public record SectionExportDto(
    [property: JsonPropertyName("id")]        int Id,
    [property: JsonPropertyName("name")]      string Name,
    [property: JsonPropertyName("sect_code")] string? SectCode);

// ─── exercises ───────────────────────────────────────────────────────────
public record ExerciseExportDto(
    [property: JsonPropertyName("id")]            int Id,
    [property: JsonPropertyName("code")]          string Code,
    [property: JsonPropertyName("name")]          string Name,
    [property: JsonPropertyName("unit")]          string Unit,
    [property: JsonPropertyName("direction")]     int Direction,
    [property: JsonPropertyName("display_order")] int DisplayOrder,
    [property: JsonPropertyName("notes")]         string? Notes);

// ─── commissions ─────────────────────────────────────────────────────────
public record CommissionExportDto(
    [property: JsonPropertyName("id")]            int Id,
    [property: JsonPropertyName("commission_no")] string CommissionNo,
    [property: JsonPropertyName("name")]          string Name,
    [property: JsonPropertyName("section_id")]    int SectionId);

// ─── commission_exercises ────────────────────────────────────────────────
// Bu cədvəl ResultsApp-da fiziki olaraq YOXDUR; scoring_rules-dan törədilir
// (bir komissiya üçün hansı exercise-lərə qayda varsa, o komissiyanın
// hərəkətləridir). display_order — exercises.display_order-dan götürülür.
public record CommissionExerciseExportDto(
    [property: JsonPropertyName("commission_no")] string CommissionNo,
    [property: JsonPropertyName("exercise_code")] string ExerciseCode,
    [property: JsonPropertyName("display_order")] int DisplayOrder);

// ─── exams ───────────────────────────────────────────────────────────────
// Qeyd: notes sütunu hədəfdə var, ResultsApp-da yoxdur → null göndərilir.
public record ExamExportDto(
    [property: JsonPropertyName("id")]         int Id,
    [property: JsonPropertyName("name")]       string Name,
    [property: JsonPropertyName("exam_date")]  string ExamDate,    // ISO 'yyyy-MM-dd'
    [property: JsonPropertyName("section_id")] int? SectionId,
    [property: JsonPropertyName("notes")]      string? Notes,
    [property: JsonPropertyName("createdAt")]  string? CreatedAt); // ISO datetime

// ─── exam_commissions ────────────────────────────────────────────────────
public record ExamCommissionExportDto(
    [property: JsonPropertyName("exam_id")]       int ExamId,
    [property: JsonPropertyName("commission_no")] string CommissionNo);

public record ExpertExportDto(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("surname")] string Surname,
    [property: JsonPropertyName("fname")] string Fname,
    [property: JsonPropertyName("fin_code")] string? FinCode,
    [property: JsonPropertyName("section_id")] int? SectionId,
    [property: JsonPropertyName("gender")] byte? Gender);


public record ExamExpertSubprofessionExportDto(
    [property: JsonPropertyName("exam_id")] int ExamId,
    [property: JsonPropertyName("expert_id")] int ExpertId);
// ─── students ────────────────────────────────────────────────────────────
// photo_path hədəfdə var, ResultsApp-da yoxdur → null göndərilir.
public record StudentExportDto(
    [property: JsonPropertyName("id")]            int Id,
    [property: JsonPropertyName("exam_id")]       int ExamId,
    [property: JsonPropertyName("s_nomer")]       int? SNomer,
    [property: JsonPropertyName("is_n")]          string IsN,
    [property: JsonPropertyName("surname")]       string Surname,
    [property: JsonPropertyName("name")]          string Name,
    [property: JsonPropertyName("father_name")]   string? FatherName,
    [property: JsonPropertyName("birth_date")]    string? BirthDate,   // ISO 'yyyy-MM-dd'
    [property: JsonPropertyName("gender")]        int? Gender,
    [property: JsonPropertyName("qrup_num")]      int? QrupNum,
    [property: JsonPropertyName("kodixtisas")]    string? Kodixtisas,
    [property: JsonPropertyName("ixtisas_name")]  string? IxtisasName,
    [property: JsonPropertyName("alt_nov")]       string? AltNov,
    [property: JsonPropertyName("commission_no")] string CommissionNo,
    [property: JsonPropertyName("photo_path")]    string? PhotoPath);

// ─── Toplu snapshot ──────────────────────────────────────────────────────
public record SnapshotExportDto(
    [property: JsonPropertyName("exported_at")]          string ExportedAt,
    [property: JsonPropertyName("source")]               string Source,
    [property: JsonPropertyName("filters")]              Dictionary<string, object?> Filters,
    [property: JsonPropertyName("sections")]             List<SectionExportDto> Sections,
    [property: JsonPropertyName("exercises")]            List<ExerciseExportDto> Exercises,
    [property: JsonPropertyName("commissions")]          List<CommissionExportDto> Commissions,
    [property: JsonPropertyName("commission_exercises")] List<CommissionExerciseExportDto> CommissionExercises,
    [property: JsonPropertyName("exams")]                List<ExamExportDto> Exams,
    [property: JsonPropertyName("exam_commissions")]     List<ExamCommissionExportDto> ExamCommissions,
    [property: JsonPropertyName("students")]             List<StudentExportDto> Students,
    [property: JsonPropertyName("experts")]               IEnumerable<ExpertExportDto> Experts,
    [property: JsonPropertyName("exam_expert_subprofessions")] IEnumerable<ExamExpertSubprofessionExportDto> ExamExpertSubprofessions);
