namespace ResultAppForAdmin.Api.Application.DTOs;

/// <summary>
/// 62-ci komissiya tələbəsinin ÜÇ alt-ixtisas (UFH/ABT/KSI) üzrə bal kırılımı.
/// Tələbənin EYNİ ham dəyərləri hər alt-ixtisasın normativlerinə görə ayrı-ayrı
/// puanlanır; hər biri üçün cəm + məqbul/qeyri-məqbul hesablanır.
/// </summary>
public record SubProfessionBreakdownDto(
    int StudentId,
    string IsN,
    string FullName,
    int Gender,
    int AgeAtExam,
    string? OwnKodixtisas,
    IReadOnlyList<BreakdownExerciseDto> Exercises,
    IReadOnlyList<SubProfessionScoreDto> SubProfessions);

public record BreakdownExerciseDto(
    int ExerciseId,
    string Code,
    string Name,
    int DisplayOrder);

public record SubProfessionScoreDto(
    string Kodixtisas,
    bool IsOwn,                 // tələbənin öz alt_nov-u ilə eyni isə true
    IReadOnlyList<BreakdownCellDto> Cells,
    int Total,
    bool IsPassed);

public record BreakdownCellDto(
    int ExerciseId,
    double? RawValue,           // bütün alt-ixtisaslarda eynidir (eyni ölçü)
    int Score,                  // həmin alt-ixtisasın normativinə görə bal
    bool IsRefused);