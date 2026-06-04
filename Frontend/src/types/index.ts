export type Section = {
  id: number;
  name: string;
  sectCode: string | null;
};

export type ExamListItem = {
  id: number;
  name: string;
  examDate: string;
  buildingName: string | null;
  sectionName: string | null;
  studentCount: number | null;
  commissionNos: string[];
};

export type ExamDetail = ExamListItem & {
  startTime: string | null;
  endTime: string | null;
  shift: number | null;
  expertCount: number;
  // Monitor role-based counts
  monitorTotalCount: number;
  leaderCount: number;       // role=1
  monitorCount: number;      // role=2
  volunteerCount: number;    // role=4
  otherStaffCount: number;   // role=5
  representativeCount: number;
  registeredStudentCount: number;
  sectionId: number | null;
};

// Monitor role enum
export const MONITOR_ROLE = {
  LEADER: 1,
  MONITOR: 2,
  VOLUNTEER: 4,
  OTHER_STAFF: 5
} as const;

export type MonitorRole = (typeof MONITOR_ROLE)[keyof typeof MONITOR_ROLE];

export const MONITOR_ROLE_LABELS: Record<number, string> = {
  1: "İmtahan rəhbəri",
  2: "Nəzarətçi",
  4: "Könüllü",
  5: "Digər işçilər"
};

export type ExamMonitor = {
  id: number;
  name: string;
  surname: string;
  fname: string | null;
  finCode: string | null;
  role: number | null;
  roomId: number | null;
  isAttended: number | null;
};

export type Student = {
  id: number;
  sNomer: number | null;  
  isN: string;
  surname: string;
  name: string;
  fatherName: string | null;
  birthDate: string | null;
  gender: number;
  qrupNum: number;
  kodixtisas: string;
  ixtisasName: string;
  altNov: string | null;
  commissionNo: string;
  isAttended: boolean;
};

export type ResultDto = {
  id: number;
  studentId: number;
  exerciseId: number;
  exerciseCode: string;
  rawValue: number | null;
  calculatedScore: number;
  finalScore: number;
  isRefused: boolean;
  notes: string | null;
  recordedAt: string;
};

export type CommissionResultRow = {
  studentId: number;
  qrupNum: number;
  sNomer: number | null;  
  isN: string;
  fullName: string;
  gender: number;
  kodixtisas: string;
  altNov: string | null;
  scoresByExerciseCode: Record<string, ResultDto | null>;
  totalScore: number | null;
  isPassed: boolean;
};

export type CommissionResultsResponse = {
  commissionNo: string;
  examId: number;
  exercises: {
    id: number;
    code: string;
    name: string;
    unit: string;
    direction: number;
    displayOrder: number;
  }[];
  rows: CommissionResultRow[];
  summary: { total: number; passed: number; failed: number; pending: number };
};

export type ImportResult = {
    batchId: number;
    total: number;
    success: number;
    failed: number;
    errors: { row: number; error: string }[];
    successByCommission: Record<string, number>;   
};
export type ResultsImportResult = {
    total: number;
    inserted: number;
    updated: number;
    failed: number;
    duplicates: number;
    appealsInserted: number;  
    appealsUpdated: number;
    errors: { row: number; error: string }[];
    successByCommission: Record<string, number>;
};


export type Commission = {
  id: number;
  commissionNo: string;
  name: string;
  sectionId: number;
};

export type Exercise = {
  id: number;
  code: string;
  name: string;
  unit: string;
  direction: number;
  sectionId: number | null;
};

export type AppealOriginalResult = {
    exerciseId: number;
    exerciseCode: string;
    exerciseName: string;
    rawValue: number | null;
    finalScore: number;
    isRefused: boolean;
};

export type AppealResult = {
    id: number;
    exerciseId: number;
    exerciseCode: string;
    rawValue: number | null;
    appealScore: number;
    previousScore: number | null;
    decision: "dəyişdi" | "dəyişmədi" 
    notes: string | null;
    recordedAt: string;
    updatedAt: string | null;
};

export type AppealRow = {
    id: number;
    sNomer: number | null;
    isN: string;
    fullName: string;
    gender: number;
    qrupNum: number;
    kodixtisas: string;
    altNov: string | null;
    commissionNo: string;
    originalResults: AppealOriginalResult[];
    appealResults: AppealResult[];
};

export type AppealListResponse = {
    examId: number;
    commissionNo: string | null;
    exercises: { id: number; code: string; name: string; unit: string }[];
    rows: AppealRow[];
};