import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
    ArrowLeft, Info, UserCheck, Eye, Users2, Building2,
    Layers, Clock, CalendarDays, Sun, Hash,
    CheckCircle2, Circle, Crown, HeartHandshake, Briefcase,
    ClipboardList, Scale, Save, X, ChevronDown, ChevronRight, Download, Loader2
} from "lucide-react";
import type { ReactNode } from "react";
import { api } from "../../api/client";
import type {
    ExamDetail as ExamDetailType,
    Student,
    ExamMonitor,
    AppealListResponse,
    AppealRow
} from "../../types";
import { MONITOR_ROLE, MONITOR_ROLE_LABELS } from "../../types";
import { LoadingState, EmptyState } from "../../components/ui";
import { formatDate, genderLabel } from "../../lib/format";

type Tab = "info" | "experts" | "monitors" | "representatives" | "students" | "appeals";

const TABS: { key: Tab; label: string; icon: ReactNode; countKey?: keyof ExamDetailType }[] = [
    { key: "info", label: "Məlumat", icon: <Info className="w-4 h-4" /> },
    { key: "experts", label: "Ekspertlər", icon: <UserCheck className="w-4 h-4" />, countKey: "expertCount" },
    { key: "monitors", label: "Nəzarətçilər", icon: <Eye className="w-4 h-4" />, countKey: "monitorTotalCount" },
    { key: "representatives", label: "Nümayəndələr", icon: <ClipboardList className="w-4 h-4" />, countKey: "representativeCount" },
    { key: "students", label: "Tələbələr", icon: <Users2 className="w-4 h-4" />, countKey: "registeredStudentCount" },
    { key: "appeals", label: "Apellyasiya", icon: <Scale className="w-4 h-4" /> },
];

const ROLE_ICON: Record<number, ReactNode> = {
    [MONITOR_ROLE.LEADER]: <Crown className="w-3.5 h-3.5" />,
    [MONITOR_ROLE.MONITOR]: <Eye className="w-3.5 h-3.5" />,
    [MONITOR_ROLE.VOLUNTEER]: <HeartHandshake className="w-3.5 h-3.5" />,
    [MONITOR_ROLE.OTHER_STAFF]: <Briefcase className="w-3.5 h-3.5" />,
};

export default function ExamDetail() {
    const { id } = useParams();
    const examId = Number(id);

    const [exam, setExam] = useState<ExamDetailType | null>(null);
    const [tab, setTab] = useState<Tab>("info");
    const [tabData, setTabData] = useState<unknown[]>([]);
    const [tabLoading, setTabLoading] = useState(false);
    const [monitorRole, setMonitorRole] = useState<number | "all">(MONITOR_ROLE.MONITOR);
    const [appealData, setAppealData] = useState<AppealListResponse | null>(null);
    const [commissionFilter, setCommissionFilter] = useState("");
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        api.get<ExamDetailType>(`/exams/${examId}`).then((r) => setExam(r.data));
    }, [examId]);

    useEffect(() => {
        if (tab === "info" || tab === "appeals" || !exam) return;
        setTabLoading(true);

        let url: string;
        if (tab === "students") {
            url = `/students?examId=${examId}`;
        } else if (tab === "monitors") {
            url = monitorRole === "all"
                ? `/exams/${examId}/monitors`
                : `/exams/${examId}/monitors?role=${monitorRole}`;
        } else {
            url = `/exams/${examId}/${tab}`;
        }
        api.get(url).then((r) => setTabData(r.data)).finally(() => setTabLoading(false));
    }, [tab, examId, exam, monitorRole]);

    // Appeals ayrıca yüklənir — commissionFilter dəyişdikdə də
    useEffect(() => {
        if (tab !== "appeals" || !exam) return;
        setTabLoading(true);
        const params: Record<string, string | number> = { examId };
        if (commissionFilter) params.commissionNo = commissionFilter;
        api.get<AppealListResponse>("/appeals", { params })
            .then((r) => setAppealData(r.data))
            .finally(() => setTabLoading(false));
    }, [tab, examId, exam, commissionFilter]);

    async function downloadResultFile() {
        setDownloading(true);
        try {
            const r = await api.get(`/exams/${examId}/result-file`, { responseType: "blob" });
            const url = URL.createObjectURL(r.data as Blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `netice_exam${examId}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Nəticə faylı yüklənmədi", err);
        } finally {
            setDownloading(false);
        }
    }

    if (!exam) return <LoadingState />;

    const tabCount = (t: Tab): number | null => {
        const key = TABS.find((x) => x.key === t)?.countKey;
        if (!key) return null;
        const v = exam[key];
        return typeof v === "number" ? v : null;
    };

    return (
        <div>
            <Link
                to="/exams"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 group"
            >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                İmtahanlara qayıt
            </Link>

            {/* Header */}
            <div className="card p-6 mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">{exam.name}</h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="w-4 h-4 text-slate-400" />
                                {formatDate(exam.examDate)}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                {exam.buildingName ?? "—"}
                            </span>
                            {exam.sectionName && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Layers className="w-4 h-4 text-slate-400" />
                                    {exam.sectionName}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {exam.commissionNos.map((c) => (
                                <span key={c} className="badge-brand">Komissiya {c}</span>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={downloadResultFile}
                        disabled={downloading}
                        className="btn-secondary shrink-0"
                    >
                        {downloading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Download className="w-4 h-4" />}
                        {downloading ? "Hazırlanır…" : "Nəticə faylını yüklə"}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="card mb-6">
                <div className="border-b border-slate-100 px-2 overflow-x-auto">
                    <div className="flex gap-1 min-w-max">
                        {TABS.map((t) => {
                            const count = tabCount(t.key);
                            const active = tab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => setTab(t.key)}
                                    className={`relative inline-flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors ${active ? "text-brand-700" : "text-slate-500 hover:text-slate-800"
                                        }`}
                                >
                                    <span className={active ? "text-brand-600" : "text-slate-400"}>
                                        {t.icon}
                                    </span>
                                    {t.label}
                                    {count !== null && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
                                            }`}>
                                            {count}
                                        </span>
                                    )}
                                    {active && (
                                        <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-600 rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6">
                    {tab === "info" && <InfoTab exam={exam} />}

                    {/* MONITORS — rol bazlı */}
                    {tab === "monitors" && (
                        <>
                            <MonitorRoleSubTabs exam={exam} value={monitorRole} onChange={setMonitorRole} />
                            {tabLoading ? <LoadingState /> : (
                                <PeopleTable
                                    rows={tabData as ExamMonitor[]}
                                    showRole={monitorRole === "all"}
                                    emptyLabel={
                                        monitorRole === "all"
                                            ? "Nəzarətçi tapılmadı"
                                            : `${MONITOR_ROLE_LABELS[monitorRole as number]} kateqoriyasında heç kim yoxdur`
                                    }
                                />
                            )}
                        </>
                    )}

                    {/* REPRESENTATIVES — yeni tab */}
                    {tab === "representatives" && (
                        tabLoading ? <LoadingState /> : (
                            <PeopleTable
                                rows={tabData as Record<string, unknown>[]}
                                emptyLabel="Nümayəndə tapılmadı"
                            />
                        )
                    )}

                    {/* EXPERTS */}
                    {tab === "experts" && (
                        tabLoading ? <LoadingState /> : (
                            <PeopleTable
                                rows={tabData as Record<string, unknown>[]}
                                emptyLabel="Ekspert tapılmadı"
                            />
                        )
                    )}

                    {/* STUDENTS */}
                    {tab === "students" && (
                        tabLoading ? <LoadingState /> : (
                            <StudentsTable rows={tabData as Student[]} />
                        )
                    )}

                    {/* APPEALS */}
                    {tab === "appeals" && (
                        <AppealTab
                            examId={examId}
                            commissionNos={exam.commissionNos}
                            commissionFilter={commissionFilter}
                            onCommissionFilter={setCommissionFilter}
                            data={appealData}
                            loading={tabLoading}
                            onUpdated={() => {
                                // nəticə yeniləndi — reload et
                                setTabLoading(true);
                                const params: Record<string, string | number> = { examId };
                                if (commissionFilter) params.commissionNo = commissionFilter;
                                api.get<AppealListResponse>("/appeals", { params })
                                    .then((r) => setAppealData(r.data))
                                    .finally(() => setTabLoading(false));
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Info Tab ─────────────────────────────────────────────────────────────────
function InfoTab({ exam }: { exam: ExamDetailType }) {
    const fields: { label: string; value: ReactNode; icon: ReactNode }[] = [
        { label: "Bina", value: exam.buildingName, icon: <Building2 className="w-4 h-4" /> },
        { label: "Bölmə", value: exam.sectionName, icon: <Layers className="w-4 h-4" /> },
        { label: "Başlama", value: exam.startTime, icon: <Clock className="w-4 h-4" /> },
        { label: "Bitmə", value: exam.endTime, icon: <Clock className="w-4 h-4" /> },
        { label: "Növbə", value: exam.shift?.toString() ?? null, icon: <Sun className="w-4 h-4" /> },
        {
            label: "Tələbə sayı (planlanmış)", value: exam.studentCount?.toString() ?? null,
            icon: <Hash className="w-4 h-4" />
        },
    ];
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fields.map((f) => (
                <div key={f.label} className="bg-slate-50/70 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">
                        <span className="text-slate-400">{f.icon}</span>{f.label}
                    </div>
                    <div className="font-semibold text-slate-900">{f.value ?? "—"}</div>
                </div>
            ))}
        </div>
    );
}

// ── Monitor Sub-tabs ──────────────────────────────────────────────────────────
function MonitorRoleSubTabs({
    exam, value, onChange
}: { exam: ExamDetailType; value: number | "all"; onChange: (v: number | "all") => void }) {
    const counts = [
        { role: MONITOR_ROLE.LEADER, label: MONITOR_ROLE_LABELS[1], count: exam.leaderCount },
        { role: MONITOR_ROLE.MONITOR, label: MONITOR_ROLE_LABELS[2], count: exam.monitorCount },
        { role: MONITOR_ROLE.VOLUNTEER, label: MONITOR_ROLE_LABELS[4], count: exam.volunteerCount },
        { role: MONITOR_ROLE.OTHER_STAFF, label: MONITOR_ROLE_LABELS[5], count: exam.otherStaffCount },
        { role: "all" as const, label: "Hamısı", count: exam.monitorTotalCount },
    ];
    return (
        <div className="mb-5 -mx-1 overflow-x-auto">
            <div className="flex gap-1.5 min-w-max px-1">
                {counts.map((r) => {
                    const active = value === r.role;
                    return (
                        <button key={String(r.role)} onClick={() => onChange(r.role)}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${active ? "bg-brand-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            <span className={active ? "text-white" : "text-slate-400"}>
                                {r.role === "all" ? <Users2 className="w-3.5 h-3.5" /> : ROLE_ICON[r.role as number]}
                            </span>
                            {r.label}
                            <span className={`text-xs px-1.5 py-0.5 rounded-md tabular-nums ${active ? "bg-white/20 text-white" : "bg-white text-slate-500"
                                }`}>{r.count}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── People Table (experts, monitors, representatives) ─────────────────────────
function PeopleTable({
    rows, showRole = false, emptyLabel
}: { rows: Record<string, unknown>[]; showRole?: boolean; emptyLabel: string }) {
    if (rows.length === 0) {
        return <EmptyState icon={<Users2 className="w-7 h-7" />} title={emptyLabel} />;
    }
    return (
        <div className="overflow-x-auto -mx-6 lg:-mx-0 rounded-xl border border-slate-100">
            <table className="table-modern">
                <thead>
                    <tr>
                        <th>Soyad</th><th>Ad</th><th>Ata adı</th><th>FİN</th>
                        {showRole && <th>Rol</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            <td className="font-medium text-slate-900">{String(r.surname ?? "")}</td>
                            <td>{String(r.name ?? "")}</td>
                            <td className="text-slate-600">{String(r.fname ?? "")}</td>
                            <td className="font-mono text-xs text-slate-500">{String(r.finCode ?? "")}</td>
                            {showRole && (
                                <td>
                                    {typeof r.role === "number" ? (
                                        <span className="badge-brand">
                                            {ROLE_ICON[r.role] ?? null}
                                            {MONITOR_ROLE_LABELS[r.role] ?? `Rol ${r.role}`}
                                        </span>
                                    ) : <span className="text-slate-300">—</span>}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Students Table ────────────────────────────────────────────────────────────
function StudentsTable({ rows }: { rows: Student[] }) {
    if (rows.length === 0) {
        return (
            <EmptyState
                icon={<Users2 className="w-7 h-7" />}
                title="Tələbə yoxdur"
                description="Bu imtahana hələ tələbə import edilməyib."
            />
        );
    }
    return (
        <div className="overflow-x-auto -mx-6 lg:-mx-0 rounded-xl border border-slate-100">
            <table className="table-modern">
                <thead>
                    <tr>
                        <th>Qrup</th><th>№</th><th>İş №</th><th>Tələbə</th>
                        <th>Cins</th><th>İxtisas</th><th>İştirak</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((s) => (
                        <tr key={s.id}>
                            <td className="tabular-nums font-medium">{s.qrupNum}</td>
                            <td className="tabular-nums text-slate-500">{s.sNomer ?? "—"}</td>
                            <td className="tabular-nums font-mono text-xs text-slate-500">{s.isN}</td>
                            <td className="font-medium text-slate-900">
                                {s.surname} {s.name}{" "}
                                <span className="text-slate-500 font-normal">{s.fatherName}</span>
                            </td>
                            <td>{genderLabel(s.gender)}</td>
                            <td>
                                <div className="text-slate-700">{s.ixtisasName}</div>
                                <div className="text-xs text-slate-500 font-mono">
                                    {s.kodixtisas}{s.altNov ? ` · ${s.altNov}` : ""}
                                </div>
                            </td>
                            <td>
                                {s.isAttended ? (
                                    <span className="badge-success">
                                        <CheckCircle2 className="w-3.5 h-3.5" />İştirak etdi
                                    </span>
                                ) : (
                                    <span className="badge-neutral">
                                        <Circle className="w-3.5 h-3.5" />Qeyd yox
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Appeal Tab ────────────────────────────────────────────────────────────────
function AppealTab({
    examId, commissionNos, commissionFilter, onCommissionFilter,
    data, loading, onUpdated
}: {
    examId: number;
    commissionNos: string[];
    commissionFilter: string;
    onCommissionFilter: (v: string) => void;
    data: AppealListResponse | null;
    loading: boolean;
    onUpdated: () => void;
}) {
    return (
        <div>
            {/* Filtr */}
            <div className="flex items-center gap-3 mb-5">
                <div className="max-w-xs">
                    <label className="label">Komissiya</label>
                    <select
                        value={commissionFilter}
                        onChange={(e) => onCommissionFilter(e.target.value)}
                        className="input"
                    >
                        <option value="">Bütün komissiyalar</option>
                        {commissionNos.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
                <div className="self-end text-xs text-slate-500 pb-2.5">
                    Apellyasiya balı manual daxil edilir; orijinal bal dəyişdirilmir.
                </div>
            </div>

            {loading ? (
                <LoadingState />
            ) : !data || data.rows.length === 0 ? (
                <EmptyState
                    icon={<Scale className="w-7 h-7" />}
                    title="Apellyasiya üçün tələbə yoxdur"
                    description="Əvvəlcə tələbələri import edin."
                />
            ) : (
                <div className="space-y-3">
                    {data.rows.map((row) => (
                        <AppealStudentRow
                            key={row.id}
                            row={row}
                            exercises={data.exercises}
                            onUpdated={onUpdated}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Tək tələbənin apellyasiya sətiri (accordion) ─────────────────────────────
function AppealStudentRow({
    row, exercises, onUpdated
}: {
    row: AppealRow;
    exercises: AppealListResponse["exercises"];
    onUpdated: () => void;
}) {
    const [open, setOpen] = useState(false);
    const hasAppeals = row.appealResults.length > 0;

    return (
        <div className={`rounded-xl border transition-all ${hasAppeals ? "border-amber-200 bg-amber-50/20" : "border-slate-100 bg-white"
            }`}>
            {/* Başlıq — click edib aç/bağla */}
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
            >
                <span className="text-slate-400">
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
                <span className="font-mono text-xs text-slate-500 w-16">{row.isN}</span>
                <span className="font-semibold text-slate-900 flex-1">{row.fullName}</span>
                <span className="text-xs text-slate-500">Qrup {row.qrupNum}</span>
                <span className="text-xs font-mono text-slate-500">{row.kodixtisas}</span>
                {hasAppeals && (
                    <span className="badge-amber">
                        <Scale className="w-3 h-3" />
                        {row.appealResults.length} apellyasiya
                    </span>
                )}
            </button>

            {open && (
                <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
                    {exercises.map((ex) => {
                        const orig = row.originalResults.find((r) => r.exerciseId === ex.id);
                        const appeal = row.appealResults.find((r) => r.exerciseId === ex.id);
                        return (
                            <AppealExerciseRow
                                key={ex.id}
                                studentId={row.id}
                                exercise={ex}
                                original={orig ?? null}
                                appeal={appeal ?? null}
                                onUpdated={onUpdated}
                            />
                        );
                    })}
                    {exercises.length === 0 && (
                        <p className="text-sm text-slate-500">
                            Bu tələbə üçün hər hansı nəticə import edilməyib.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Tək exercise üzrə appeal satırı ──────────────────────────────────────────
function AppealExerciseRow({
    studentId, exercise, original, appeal, onUpdated
}: {
    studentId: number;
    exercise: AppealListResponse["exercises"][number];
    original: AppealRow["originalResults"][number] | null;
    appeal: AppealRow["appealResults"][number] | null;
    onUpdated: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [score, setScore] = useState<string>(appeal?.appealScore?.toString() ?? "");
    const [raw, setRaw] = useState<string>(appeal?.rawValue?.toString() ?? "");
    const [decision, setDecision] = useState<string>(appeal?.decision ?? "dəyişmədi");
    const [notes, setNotes] = useState<string>(appeal?.notes ?? "");
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    async function save() {
        const scoreNum = Number(score);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) return;
        setSaving(true);
        try {
            await api.put(`/appeals/${studentId}/${exercise.id}`, {
                appealScore: scoreNum,
                rawValue: raw ? Number(raw) : null,
                decision,
                notes: notes || null,
            });
            onUpdated();
            setEditing(false);
        } finally {
            setSaving(false);
        }
    }

    async function remove() {
        if (!appeal) return;
        await api.delete(`/appeals/${studentId}/${exercise.id}`);
        onUpdated();
    }

    return (
        <div className={`flex flex-wrap items-center gap-3 p-3 rounded-xl ${appeal ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-100"
            }`}>
            {/* Exercise adı */}
            <div className="min-w-[160px] flex-1">
                <div className="text-sm font-medium text-slate-900">{exercise.name}</div>
                <div className="text-xs font-mono text-slate-500">{exercise.code}</div>
            </div>

            {/* Original nəticə */}
            <div className="text-center min-w-[80px]">
                <div className="text-xs text-slate-500 mb-0.5">Orijinal</div>
                {original ? (
                    original.isRefused ? (
                        <span className="text-xs text-slate-400 italic">imtina</span>
                    ) : (
                        <div>
                            <div className="text-xs text-slate-400 font-mono">{original.rawValue ?? "—"}</div>
                            <div className="font-bold text-slate-900 tabular-nums">{original.finalScore}</div>
                        </div>
                    )
                ) : (
                    <span className="text-slate-300 text-xs">—</span>
                )}
            </div>

            {/* Apellyasiya nəticəsi */}
            <div className="text-center min-w-[80px]">
                <div className="text-xs text-slate-500 mb-0.5">Apellyasiya</div>
                {appeal ? (
                    <div>
                        <div className={`font-bold tabular-nums text-lg ${appeal.appealScore > (original?.finalScore ?? 0) ? "text-emerald-700" :
                                appeal.appealScore < (original?.finalScore ?? 0) ? "text-rose-700" : "text-slate-700"
                            }`}>
                            {appeal.appealScore}
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${appeal.decision === "dəyişdi"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                            {appeal.decision === "dəyişdi" ? "Dəyişdi" : "Dəyişmədi"}
                        </span>
                    </div>
                ) : (
                    <span className="text-slate-300 text-xs">—</span>
                )}
            </div>

            {/* Qeyd */}
            <div className="flex-1 min-w-[120px]">
                {appeal?.notes && (
                    <div className="text-xs text-slate-600 italic">{appeal.notes}</div>
                )}
            </div>

            {/* Əməliyyatlar */}
            <div className="flex items-center gap-2">
                {!editing ? (
                    <button
                        onClick={() => setEditing(true)}
                        className="btn-secondary !px-3 !py-1.5 !text-xs"
                    >
                        {appeal ? "Düzəliş" : "Daxil et"}
                    </button>
                ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Raw value */}
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">Xam dəyər</label>
                            <input
                                type="number"
                                step="0.01"
                                value={raw}
                                onChange={(e) => setRaw(e.target.value)}
                                placeholder="opsional"
                                className="input !w-24 !py-1 !text-xs"
                            />
                        </div>
                        {/* Bal */}
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">Bal (0-10)</label>
                            <input
                                ref={inputRef}
                                type="number"
                                min={0} max={10}
                                value={score}
                                onChange={(e) => setScore(e.target.value)}
                                className="input !w-16 !py-1 !text-xs"
                            />
                        </div>
                        {/* Qərar */}
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">Qərar</label>
                            <select
                                value={decision}
                                onChange={(e) => setDecision(e.target.value)}
                                className="input !py-1 !text-xs !w-28"
                            >
                                <option value="dəyişdi">Dəyişdi</option>
                                <option value="dəyişmədi">Dəyişmədi</option>
                            </select>
                        </div>
                        {/* Qeyd */}
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">Qeyd</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="opsional"
                                className="input !py-1 !text-xs !w-36"
                            />
                        </div>
                        {/* Save/Cancel */}
                        <div className="flex gap-1 self-end pb-px">
                            <button
                                onClick={save}
                                disabled={saving || !score}
                                className="btn-primary !px-2.5 !py-1.5"
                                title="Saxla"
                            >
                                <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setEditing(false)}
                                className="btn-secondary !px-2.5 !py-1.5"
                                title="Ləğv et"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
                {appeal && !editing && (
                    <button
                        onClick={remove}
                        className="btn-ghost !px-2 !py-1.5 hover:!bg-rose-50 hover:!text-rose-700"
                        title="Sil"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
