namespace ResultAppForAdmin.Api.Application.DTOs;

// ─── Exams ───────────────────────────────────────────────────────────────
public record ExamListDto(
    int Id,
    string Name,
    DateOnly ExamDate,
    string? BuildingName,
    string? SectionName,
    int? StudentCount,
    string[] CommissionNos);

public record ExamDetailDto(
    int Id,
    string Name,
    DateOnly ExamDate,
    string? BuildingName,
    string? SectionName,
    TimeOnly? StartTime,
    TimeOnly? EndTime,
    byte? Shift,
    int? StudentCount,
    string[] CommissionNos,
    int ExpertCount,
    // Monitor counts by role (1=leader, 2=monitor, 4=volunteer, 5=other staff)
    int MonitorTotalCount,
    int LeaderCount,
    int MonitorCount,
    int VolunteerCount,
    int OtherStaffCount,
    int RepresentativeCount,
    int RegisteredStudentCount,
    int? SectionId);

// ─── Students ────────────────────────────────────────────────────────────
public record StudentDto(
    int Id,
    int? SNomer,                      // ← nullable
    string IsN,
    string Surname,
    string Name,
    string? FatherName,
    DateOnly? BirthDate,
    byte Gender,
    int QrupNum,
    string Kodixtisas,
    string IxtisasName,
    string? AltNov,
    string CommissionNo,
    bool IsAttended);

public record CommissionResultRowDto(
    int StudentId,
    int QrupNum,
    int? SNomer,                      // ← nullable
    string IsN,
    string FullName,
    byte Gender,
    string Kodixtisas,
    string? AltNov,
    Dictionary<string, ResultDto?> ScoresByExerciseCode,
    int? TotalScore,
    bool IsPassed);

// ─── Imports ─────────────────────────────────────────────────────────────
public record ImportStudentsRequest(string CommissionNo, DateOnly ExamDate);

// ─── Results ─────────────────────────────────────────────────────────────
public record ResultDto(
    int Id,
    int StudentId,
    int ExerciseId,
    string ExerciseCode,
    decimal? RawValue,
    byte CalculatedScore,
    byte FinalScore,
    bool IsRefused,
    string? Notes,
    DateTime RecordedAt);


// ─── Scoring rules (admin) ───────────────────────────────────────────────
public record ScoringRuleDto(
    int Id,
    string CommissionNo,
    string? Kodixtisas,
    int ExerciseId,
    string ExerciseCode,
    byte Gender,
    byte AgeMin,
    byte AgeMax,
    decimal Threshold,
    byte Score,
    bool IsActive);

public record CreateScoringRuleRequest(
    string CommissionNo,
    string? Kodixtisas,
    int ExerciseId,
    byte Gender,
    byte AgeMin,
    byte AgeMax,
    decimal Threshold,
    byte Score);
