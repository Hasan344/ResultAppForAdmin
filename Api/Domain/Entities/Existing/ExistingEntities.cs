namespace ResultAppForAdmin.Api.Domain.Entities.Existing;

// ─── exams ───────────────────────────────────────────────────────────────
public class Exam
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public int SectionId { get; set; }
    public int ExamBuldingId { get; set; }
    public DateOnly ExamDate { get; set; }
    public decimal? Duration { get; set; }
    public byte? Shift { get; set; }
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
    public int? StudentCount { get; set; }
    public TimeOnly? AdmissionTime { get; set; }
    public int? DistrictId { get; set; }
    public int? Type { get; set; }

    public Section? Section { get; set; }
    public ExamBuilding? ExamBuilding { get; set; }
    public ICollection<ExamCommission> ExamCommissions { get; set; } = new List<ExamCommission>();
    public ICollection<ExamExpert> ExamExperts { get; set; } = new List<ExamExpert>();
    public ICollection<ExamMonitor> ExamMonitors { get; set; } = new List<ExamMonitor>();
    public ICollection<ExamRepresentative> ExamRepresentatives { get; set; } = new List<ExamRepresentative>();
}

// ─── sections ────────────────────────────────────────────────────────────
public class Section
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public int? SectCode { get; set; }
}

// ─── exam_building ───────────────────────────────────────────────────────
public class ExamBuilding
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public int SectionId { get; set; }
    public string? Code { get; set; }
    public string? Address { get; set; }
}

// ─── commissions ─────────────────────────────────────────────────────────
public class Commission
{
    public int Id { get; set; }
    public string CommissionNo { get; set; } = null!;   // '62','63','6401','152'
    public string Name { get; set; } = null!;
    public int SectionId { get; set; }

    public ICollection<ExamCommission> ExamCommissions { get; set; } = new List<ExamCommission>();
}

// ─── Exam_Commissions (M:M) ──────────────────────────────────────────────
public class ExamCommission
{
    public int ExamId { get; set; }
    public int CommissionId { get; set; }

    public Exam Exam { get; set; } = null!;
    public Commission Commission { get; set; } = null!;
}

// ─── experts ─────────────────────────────────────────────────────────────
public class Expert
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Surname { get; set; } = null!;
    public string Fname { get; set; } = null!;
    public int? SectionId { get; set; }
    public string? FinCode { get; set; }
    public byte? Gender { get; set; }
    public string? Profession { get; set; }
}

// ─── monitors ────────────────────────────────────────────────────────────
public class Monitor
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Surname { get; set; } = null!;
    public string Fname { get; set; } = null!;
    public int? SectionId { get; set; }
    public byte Archive { get; set; }
    public string? FinCode { get; set; }
    public byte? Gender { get; set; }
    public byte? Role { get; set; }
}

// ─── dim_representative ──────────────────────────────────────────────────
public class Representative
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Surname { get; set; } = null!;
    public string Fname { get; set; } = null!;
    public string FinCode { get; set; } = null!;
    public int? Type { get; set; }
}

// ─── Join tables ─────────────────────────────────────────────────────────
public class ExamExpert
{
    public int ExamId { get; set; }
    public int ExpertId { get; set; }
    public Exam Exam { get; set; } = null!;
    public Expert Expert { get; set; } = null!;
}

public class ExamMonitor
{
    public int ExamId { get; set; }
    public int MonitorId { get; set; }
    public int? RoomId { get; set; }
    public int? IsAttended { get; set; }
    public Exam Exam { get; set; } = null!;
    public Monitor Monitor { get; set; } = null!;
}

public class ExamRepresentative
{
    public int ExamId { get; set; }
    public int RepresentativeId { get; set; }
    public Exam Exam { get; set; } = null!;
    public Representative Representative { get; set; } = null!;
}

// ─── genders ─────────────────────────────────────────────────────────────
public class Gender
{
    public byte Id { get; set; }                         // 1=kişi, 2=qadın
    public string Name { get; set; } = null!;
}
