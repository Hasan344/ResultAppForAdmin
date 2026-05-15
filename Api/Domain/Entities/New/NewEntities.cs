using ResultAppForAdmin.Api.Domain.Entities.Existing;

namespace ResultAppForAdmin.Api.Domain.Entities.New;

// ─── students ────────────────────────────────────────────────────────────
public class Student
{
    public int Id { get; set; }
    public int ExamId { get; set; }
    public int? ImportBatchId { get; set; }

    public int SNomer { get; set; }                      // Excel S_NOMER
    public string IsN { get; set; } = null!;             // Excel is_n (unique abituriyent kodu)
    public string Surname { get; set; } = null!;         // soy
    public string Name { get; set; } = null!;            // adi
    public string? FatherName { get; set; }              // ata
    public DateOnly? BirthDate { get; set; }             // tev → date
    public byte Gender { get; set; }                     // 1=kişi, 2=qadın
    public int QrupNum { get; set; }
    public string Kodixtisas { get; set; } = null!;      // 6301, ...
    public string IxtisasName { get; set; } = null!;
    public string? AltNov { get; set; }
    public int? FennKod { get; set; }
    public string? ImtYeriName { get; set; }
    public DateTime? ImtTarixRaw { get; set; }
    public byte? Shift { get; set; }
    public string CommissionNo { get; set; } = null!;    // '62','63','6401','152'
    public bool IsAttended { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Exam Exam { get; set; } = null!;
    public ImportBatch? ImportBatch { get; set; }
    public ICollection<StudentExamResult> Results { get; set; } = new List<StudentExamResult>();
}

// ─── import_batches ──────────────────────────────────────────────────────
public class ImportBatch
{
    public int Id { get; set; }
    public int ExamId { get; set; }
    public string CommissionNo { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public int TotalRows { get; set; }
    public int SuccessRows { get; set; }
    public int FailedRows { get; set; }
    public string? ErrorLog { get; set; }                // JSON array
    public string? ImportedBy { get; set; }
    public DateTime ImportedAt { get; set; }

    public Exam Exam { get; set; } = null!;
}

// ─── exercises ───────────────────────────────────────────────────────────
public class Exercise
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;            // 'sprint_100m', 'cross_1000m', ...
    public string Name { get; set; } = null!;
    public string Unit { get; set; } = null!;            // 'second','cm','count','score'
    public byte Direction { get; set; }                  // 1=lower-better, 2=higher-better
    public int DisplayOrder { get; set; }
}

// ─── scoring_rules ───────────────────────────────────────────────────────
public class ScoringRule
{
    public int Id { get; set; }
    public string CommissionNo { get; set; } = null!;
    public string? Kodixtisas { get; set; }              // NULL → all subspecialties
    public int ExerciseId { get; set; }
    public byte Gender { get; set; }
    public byte AgeMin { get; set; }
    public byte AgeMax { get; set; }
    public decimal Threshold { get; set; }
    public byte Score { get; set; }                      // 6-10
    public bool IsActive { get; set; }
    public DateOnly ValidFrom { get; set; }
    public DateOnly? ValidTo { get; set; }

    public Exercise Exercise { get; set; } = null!;
}

// ─── student_exam_results ────────────────────────────────────────────────
public class StudentExamResult
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public int ExamId { get; set; }
    public int ExerciseId { get; set; }
    public decimal? RawValue { get; set; }
    public byte CalculatedScore { get; set; }
    public byte FinalScore { get; set; }
    public bool IsRefused { get; set; }
    public string? Notes { get; set; }
    public string? RecordedBy { get; set; }
    public DateTime RecordedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Student Student { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
}

// ─── v_student_total_scores (keyless view) ───────────────────────────────
public class StudentTotalScoreView
{
    public int StudentId { get; set; }
    public int ExamId { get; set; }
    public string CommissionNo { get; set; } = null!;
    public int QrupNum { get; set; }
    public int SNomer { get; set; }
    public string IsN { get; set; } = null!;
    public string Surname { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? FatherName { get; set; }
    public byte Gender { get; set; }
    public string Kodixtisas { get; set; } = null!;
    public string IxtisasName { get; set; } = null!;
    public int RecordedExercises { get; set; }
    public int? TotalScore { get; set; }
    public bool IsPassed { get; set; }
    public DateTime? LastRecordedAt { get; set; }
}
