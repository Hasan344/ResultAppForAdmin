export type ExamListItem = {
  id: number;
  name: string;
  examDate: string;            // ISO date
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
  monitorCount: number;
  representativeCount: number;
  registeredStudentCount: number;
};

export type Student = {
  id: number;
  sNomer: number;
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
  sNomer: number;
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
  exercises: { id: number; code: string; name: string; unit: string; direction: number; displayOrder: number }[];
  rows: CommissionResultRow[];
  summary: { total: number; passed: number; failed: number; pending: number };
};

export type ImportResult = {
  batchId: number;
  total: number;
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
};

export type Commission = { id: number; commissionNo: string; name: string; sectionId: number };
export type Exercise   = { id: number; code: string; name: string; unit: string; direction: number };
