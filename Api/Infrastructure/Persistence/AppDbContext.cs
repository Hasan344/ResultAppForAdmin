using ResultAppForAdmin.Api.Domain.Entities.Existing;
using ResultAppForAdmin.Api.Domain.Entities.New;
using Microsoft.EntityFrameworkCore;
using Monitor = ResultAppForAdmin.Api.Domain.Entities.Existing.Monitor;

namespace ResultAppForAdmin.Api.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ── Existing (read-only) ──
    public DbSet<Exam> Exams => Set<Exam>();
    public DbSet<Section> Sections => Set<Section>();
    public DbSet<ExamBuilding> ExamBuildings => Set<ExamBuilding>();
    public DbSet<Commission> Commissions => Set<Commission>();
    public DbSet<ExamCommission> ExamCommissions => Set<ExamCommission>();
    public DbSet<Expert> Experts => Set<Expert>();
    public DbSet<Monitor> Monitors => Set<Monitor>();
    public DbSet<Representative> Representatives => Set<Representative>();
    public DbSet<ExamExpert> ExamExperts => Set<ExamExpert>();
    public DbSet<ExamMonitor> ExamMonitors => Set<ExamMonitor>();
    public DbSet<ExamRepresentative> ExamRepresentatives => Set<ExamRepresentative>();
    public DbSet<Gender> Genders => Set<Gender>();

    // ── New (writable) ──
    public DbSet<Student> Students => Set<Student>();
    public DbSet<ImportBatch> ImportBatches => Set<ImportBatch>();
    public DbSet<Exercise> Exercises => Set<Exercise>();
    public DbSet<ScoringRule> ScoringRules => Set<ScoringRule>();
    public DbSet<StudentExamResult> StudentExamResults => Set<StudentExamResult>(); 
    public DbSet<CommissionStageRule> CommissionStageRules => Set<CommissionStageRule>();
    public DbSet<StudentAppealResult> StudentAppealResults => Set<StudentAppealResult>();
    // ── View (keyless) ──
    public DbSet<StudentTotalScoreView> StudentTotalScores => Set<StudentTotalScoreView>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<CommissionStageRule>(e =>
         {
             e.ToTable("commission_stage_rules");
             e.HasKey(x => x.CommissionNo);
             e.Property(x => x.CommissionNo).HasColumnName("commission_no").HasMaxLength(10);
             e.Property(x => x.Stage1Total).HasColumnName("stage1_total");
             e.Property(x => x.Stage1Required).HasColumnName("stage1_required");
             e.Property(x => x.Stage2Total).HasColumnName("stage2_total");
             e.Property(x => x.FinalMethod).HasColumnName("final_method").HasMaxLength(20);
             e.Property(x => x.MinimumScore).HasColumnName("minimum_score");
             e.Property(x => x.Notes).HasColumnName("notes");
         });
        b.Entity<StudentAppealResult>(e =>
         {
             e.ToTable("student_appeal_results");
             e.HasKey(x => x.Id);
             e.Property(x => x.Id).HasColumnName("id");
             e.Property(x => x.StudentId).HasColumnName("student_id");
             e.Property(x => x.ExamId).HasColumnName("exam_id");
             e.Property(x => x.ExerciseId).HasColumnName("exercise_id");
             e.Property(x => x.RawValue).HasColumnName("raw_value");
             e.Property(x => x.AppealScore).HasColumnName("appeal_score");
             e.Property(x => x.PreviousScore).HasColumnName("previous_score");
             e.Property(x => x.Decision).HasColumnName("decision");
             e.Property(x => x.Notes).HasColumnName("notes");
             e.Property(x => x.RecordedBy).HasColumnName("recorded_by");
             e.Property(x => x.RecordedAt).HasColumnName("recorded_at");
             e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
             e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId);
             e.HasOne(x => x.Exercise).WithMany().HasForeignKey(x => x.ExerciseId);
             e.HasIndex(x => new { x.StudentId, x.ExerciseId }).IsUnique();
         });
        // ─── EXISTING: tablo isimlerini tam map ─────────────────────────
        b.Entity<Exam>(e =>
        {
            e.ToTable("exams");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.SectionId).HasColumnName("section_id");
            e.Property(x => x.ExamBuldingId).HasColumnName("exam_bulding_id");
            e.Property(x => x.ExamDate).HasColumnName("exam_date");
            e.Property(x => x.Duration).HasColumnName("duration");
            e.Property(x => x.Shift).HasColumnName("shift");
            e.Property(x => x.StartTime).HasColumnName("start_time");
            e.Property(x => x.EndTime).HasColumnName("end_time");
            e.Property(x => x.StudentCount).HasColumnName("student_count");
            e.Property(x => x.AdmissionTime).HasColumnName("admission_time");
            e.Property(x => x.DistrictId).HasColumnName("district_id");
            e.Property(x => x.Type).HasColumnName("type");
            e.HasOne(x => x.Section).WithMany().HasForeignKey(x => x.SectionId);
            e.HasOne(x => x.ExamBuilding).WithMany().HasForeignKey(x => x.ExamBuldingId);
        });

        b.Entity<Section>(e =>
        {
            e.ToTable("sections");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.SectCode).HasColumnName("sect_code");
        });

        b.Entity<ExamBuilding>(e =>
        {
            e.ToTable("exam_building");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.SectionId).HasColumnName("section_id");
            e.Property(x => x.Code).HasColumnName("code");
            e.Property(x => x.Address).HasColumnName("address");
        });

        b.Entity<Commission>(e =>
        {
            e.ToTable("commissions");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CommissionNo).HasColumnName("commission_no");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.SectionId).HasColumnName("section_id");
        });

        b.Entity<ExamCommission>(e =>
        {
            e.ToTable("Exam_Commissions");
            e.HasKey(x => new { x.ExamId, x.CommissionId });
            e.Property(x => x.ExamId).HasColumnName("Exam_Id");
            e.Property(x => x.CommissionId).HasColumnName("Commission_Id");
            e.HasOne(x => x.Exam).WithMany(x => x.ExamCommissions).HasForeignKey(x => x.ExamId);
            e.HasOne(x => x.Commission).WithMany(x => x.ExamCommissions).HasForeignKey(x => x.CommissionId);
        });

        b.Entity<Expert>(e =>
        {
            e.ToTable("experts");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Surname).HasColumnName("surname");
            e.Property(x => x.Fname).HasColumnName("fname");
            e.Property(x => x.SectionId).HasColumnName("section_id");
            e.Property(x => x.FinCode).HasColumnName("fin_code");
            e.Property(x => x.Gender).HasColumnName("gender");
            e.Property(x => x.Profession).HasColumnName("profession");
        });

        b.Entity<Monitor>(e =>
        {
            e.ToTable("monitors");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Surname).HasColumnName("surname");
            e.Property(x => x.Fname).HasColumnName("fname");
            e.Property(x => x.SectionId).HasColumnName("section_id");
            e.Property(x => x.Archive).HasColumnName("archive");
            e.Property(x => x.FinCode).HasColumnName("fin_code");
            e.Property(x => x.Gender).HasColumnName("gender");
            e.Property(x => x.Role).HasColumnName("role");
        });

        b.Entity<Representative>(e =>
        {
            e.ToTable("dim_representative");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Surname).HasColumnName("surname");
            e.Property(x => x.Fname).HasColumnName("fname");
            e.Property(x => x.FinCode).HasColumnName("fin_code");
            e.Property(x => x.Type).HasColumnName("type");
        });

        b.Entity<ExamExpert>(e =>
        {
            e.ToTable("Exam_Experts");
            e.HasKey(x => new { x.ExamId, x.ExpertId });
            e.HasOne(x => x.Exam).WithMany(x => x.ExamExperts).HasForeignKey(x => x.ExamId);
            e.HasOne(x => x.Expert).WithMany().HasForeignKey(x => x.ExpertId);
        });

        b.Entity<ExamMonitor>(e =>
        {
            e.ToTable("Exam_Monitors");
            e.HasKey(x => new { x.ExamId, x.MonitorId });
            e.HasOne(x => x.Exam).WithMany(x => x.ExamMonitors).HasForeignKey(x => x.ExamId);
            e.HasOne(x => x.Monitor).WithMany().HasForeignKey(x => x.MonitorId);
        });

        b.Entity<ExamRepresentative>(e =>
        {
            e.ToTable("Exam_Representatives");
            e.HasKey(x => new { x.ExamId, x.RepresentativeId });
            e.HasOne(x => x.Exam).WithMany(x => x.ExamRepresentatives).HasForeignKey(x => x.ExamId);
            e.HasOne(x => x.Representative).WithMany().HasForeignKey(x => x.RepresentativeId);
        });

        b.Entity<Gender>(e =>
        {
            e.ToTable("genders");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
        });

        // ─── NEW: writable tables ───────────────────────────────────────
        b.Entity<Student>(e =>
        {
            e.ToTable("students");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ExamId).HasColumnName("exam_id");
            e.Property(x => x.ImportBatchId).HasColumnName("import_batch_id");
            e.Property(x => x.SNomer).HasColumnName("s_nomer");
            e.Property(x => x.IsN).HasColumnName("is_n");
            e.Property(x => x.Surname).HasColumnName("surname");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.FatherName).HasColumnName("father_name");
            e.Property(x => x.BirthDate).HasColumnName("birth_date");
            e.Property(x => x.Gender).HasColumnName("gender");
            e.Property(x => x.QrupNum).HasColumnName("qrup_num");
            e.Property(x => x.Kodixtisas).HasColumnName("kodixtisas");
            e.Property(x => x.IxtisasName).HasColumnName("ixtisas_name");
            e.Property(x => x.AltNov).HasColumnName("alt_nov");
            e.Property(x => x.FennKod).HasColumnName("fenn_kod");
            e.Property(x => x.ImtYeriName).HasColumnName("imt_yeri_name");
            e.Property(x => x.ImtTarixRaw).HasColumnName("imt_tarix_raw");
            e.Property(x => x.Shift).HasColumnName("shift");
            e.Property(x => x.CommissionNo).HasColumnName("commission_no");
            e.Property(x => x.IsAttended).HasColumnName("is_attended");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => new { x.ExamId, x.IsN }).IsUnique();
        });

        b.Entity<ImportBatch>(e =>
        {
            e.ToTable("import_batches");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ExamId).HasColumnName("exam_id");
            e.Property(x => x.CommissionNo).HasColumnName("commission_no");
            e.Property(x => x.FileName).HasColumnName("file_name");
            e.Property(x => x.TotalRows).HasColumnName("total_rows");
            e.Property(x => x.SuccessRows).HasColumnName("success_rows");
            e.Property(x => x.FailedRows).HasColumnName("failed_rows");
            e.Property(x => x.ErrorLog).HasColumnName("error_log");
            e.Property(x => x.ImportedBy).HasColumnName("imported_by");
            e.Property(x => x.ImportedAt).HasColumnName("imported_at");
        });

        b.Entity<Exercise>(e =>
        {
            e.ToTable("exercises");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Code).HasColumnName("code");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Unit).HasColumnName("unit");
            e.Property(x => x.Direction).HasColumnName("direction");
            e.Property(x => x.DisplayOrder).HasColumnName("display_order");
        });

        b.Entity<ScoringRule>(e =>
        {
            e.ToTable("scoring_rules");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CommissionNo).HasColumnName("commission_no");
            e.Property(x => x.Kodixtisas).HasColumnName("kodixtisas");
            e.Property(x => x.ExerciseId).HasColumnName("exercise_id");
            e.Property(x => x.Gender).HasColumnName("gender");
            e.Property(x => x.AgeMin).HasColumnName("age_min");
            e.Property(x => x.AgeMax).HasColumnName("age_max");
            e.Property(x => x.Threshold).HasColumnName("threshold");
            e.Property(x => x.Score).HasColumnName("score");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.ValidFrom).HasColumnName("valid_from");
            e.Property(x => x.ValidTo).HasColumnName("valid_to");
            e.HasOne(x => x.Exercise).WithMany().HasForeignKey(x => x.ExerciseId);
        });

        b.Entity<StudentExamResult>(e =>
        {
            e.ToTable("student_exam_results");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.StudentId).HasColumnName("student_id");
            e.Property(x => x.ExamId).HasColumnName("exam_id");
            e.Property(x => x.ExerciseId).HasColumnName("exercise_id");
            e.Property(x => x.RawValue).HasColumnName("raw_value");
            e.Property(x => x.CalculatedScore).HasColumnName("calculated_score");
            e.Property(x => x.FinalScore).HasColumnName("final_score");
            e.Property(x => x.IsRefused).HasColumnName("is_refused");
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.RecordedBy).HasColumnName("recorded_by");
            e.Property(x => x.RecordedAt).HasColumnName("recorded_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.Student).WithMany(x => x.Results).HasForeignKey(x => x.StudentId);
            e.HasOne(x => x.Exercise).WithMany().HasForeignKey(x => x.ExerciseId);
            e.HasIndex(x => new { x.StudentId, x.ExerciseId }).IsUnique();
        });

        // ─── VIEW (keyless) ─────────────────────────────────────────────
        b.Entity<StudentTotalScoreView>(e =>
        {
            e.HasNoKey();
            e.ToView("v_student_total_scores");
            e.Property(x => x.StudentId).HasColumnName("student_id");
            e.Property(x => x.ExamId).HasColumnName("exam_id");
            e.Property(x => x.CommissionNo).HasColumnName("commission_no");
            e.Property(x => x.QrupNum).HasColumnName("qrup_num");
            e.Property(x => x.SNomer).HasColumnName("s_nomer");
            e.Property(x => x.IsN).HasColumnName("is_n");
            e.Property(x => x.Surname).HasColumnName("surname");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.FatherName).HasColumnName("father_name");
            e.Property(x => x.Gender).HasColumnName("gender");
            e.Property(x => x.Kodixtisas).HasColumnName("kodixtisas");
            e.Property(x => x.IxtisasName).HasColumnName("ixtisas_name");
            e.Property(x => x.RecordedExercises).HasColumnName("recorded_exercises");
            e.Property(x => x.TotalScore).HasColumnName("total_score");
            e.Property(x => x.IsPassed).HasColumnName("is_passed");
            e.Property(x => x.LastRecordedAt).HasColumnName("last_recorded_at");
        });
    }
}
