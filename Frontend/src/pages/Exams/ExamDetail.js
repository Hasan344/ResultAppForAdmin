import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Info, UserCheck, Eye, Users2, Building2, Layers, Clock, CalendarDays, Sun, Hash, Crown, HeartHandshake, Briefcase, ClipboardList, Scale, Save, X, ChevronDown, ChevronRight, Download, Loader2, Search } from "lucide-react";
import { api } from "../../api/client";
import { MONITOR_ROLE, MONITOR_ROLE_LABELS } from "../../types";
import { LoadingState, EmptyState } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { StudentRow } from "./StudentSubProfessionBreakdown";
const TABS = [
    { key: "info", label: "Məlumat", icon: _jsx(Info, { className: "w-4 h-4" }) },
    { key: "experts", label: "Ekspertlər", icon: _jsx(UserCheck, { className: "w-4 h-4" }), countKey: "expertCount" },
    { key: "monitors", label: "Nəzarətçilər", icon: _jsx(Eye, { className: "w-4 h-4" }), countKey: "monitorTotalCount" },
    { key: "representatives", label: "Nümayəndələr", icon: _jsx(ClipboardList, { className: "w-4 h-4" }), countKey: "representativeCount" },
    { key: "students", label: "Tələbələr", icon: _jsx(Users2, { className: "w-4 h-4" }), countKey: "registeredStudentCount" },
    { key: "appeals", label: "Apellyasiya", icon: _jsx(Scale, { className: "w-4 h-4" }) },
];
const ROLE_ICON = {
    [MONITOR_ROLE.LEADER]: _jsx(Crown, { className: "w-3.5 h-3.5" }),
    [MONITOR_ROLE.MONITOR]: _jsx(Eye, { className: "w-3.5 h-3.5" }),
    [MONITOR_ROLE.VOLUNTEER]: _jsx(HeartHandshake, { className: "w-3.5 h-3.5" }),
    [MONITOR_ROLE.OTHER_STAFF]: _jsx(Briefcase, { className: "w-3.5 h-3.5" }),
};
export default function ExamDetail() {
    const { id } = useParams();
    const examId = Number(id);
    const [exam, setExam] = useState(null);
    const [tab, setTab] = useState("info");
    const [tabData, setTabData] = useState([]);
    const [tabLoading, setTabLoading] = useState(false);
    const [monitorRole, setMonitorRole] = useState(MONITOR_ROLE.MONITOR);
    const [appealData, setAppealData] = useState(null);
    const [commissionFilter, setCommissionFilter] = useState("");
    const [downloading, setDownloading] = useState(false);
    useEffect(() => {
        api.get(`/exams/${examId}`).then((r) => setExam(r.data));
    }, [examId]);
    useEffect(() => {
        if (tab === "info" || tab === "appeals" || !exam)
            return;
        setTabLoading(true);
        let url;
        if (tab === "students") {
            url = `/students?examId=${examId}`;
        }
        else if (tab === "monitors") {
            url = monitorRole === "all"
                ? `/exams/${examId}/monitors`
                : `/exams/${examId}/monitors?role=${monitorRole}`;
        }
        else {
            url = `/exams/${examId}/${tab}`;
        }
        api.get(url).then((r) => setTabData(r.data)).finally(() => setTabLoading(false));
    }, [tab, examId, exam, monitorRole]);
    // Appeals ayrıca yüklənir — commissionFilter dəyişdikdə də
    useEffect(() => {
        if (tab !== "appeals" || !exam)
            return;
        setTabLoading(true);
        const params = { examId };
        if (commissionFilter)
            params.commissionNo = commissionFilter;
        api.get("/appeals", { params })
            .then((r) => setAppealData(r.data))
            .finally(() => setTabLoading(false));
    }, [tab, examId, exam, commissionFilter]);
    async function downloadResultFile() {
        setDownloading(true);
        try {
            const r = await api.get(`/exams/${examId}/result-file/split`, {
                responseType: "blob",
            });
            const ct = r.headers["content-type"] ?? "";
            const isZip = ct.includes("zip");
            const url = URL.createObjectURL(r.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = isZip ? `netice_exam${examId}.zip` : `netice_exam${examId}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        }
        catch (err) {
            console.error("Nəticə faylı yüklənmədi", err);
        }
        finally {
            setDownloading(false);
        }
    }
    if (!exam)
        return _jsx(LoadingState, {});
    const tabCount = (t) => {
        const key = TABS.find((x) => x.key === t)?.countKey;
        if (!key)
            return null;
        const v = exam[key];
        return typeof v === "number" ? v : null;
    };
    return (_jsxs("div", { children: [_jsxs(Link, { to: "/exams", className: "inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 group", children: [_jsx(ArrowLeft, { className: "w-4 h-4 transition-transform group-hover:-translate-x-0.5" }), "\u0130mtahanlara qay\u0131t"] }), _jsx("div", { className: "card p-6 mb-6", children: _jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-slate-900 mb-2", children: exam.name }), _jsxs("div", { className: "flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600", children: [_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx(CalendarDays, { className: "w-4 h-4 text-slate-400" }), formatDate(exam.examDate)] }), _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx(Building2, { className: "w-4 h-4 text-slate-400" }), exam.buildingName ?? "—"] }), exam.sectionName && (_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx(Layers, { className: "w-4 h-4 text-slate-400" }), exam.sectionName] }))] }), _jsx("div", { className: "flex flex-wrap gap-1.5 mt-3", children: exam.commissionNos.map((c) => (_jsxs("span", { className: "badge-brand", children: ["Komissiya ", c] }, c))) })] }), _jsxs("button", { onClick: downloadResultFile, disabled: downloading, className: "btn-secondary shrink-0", children: [downloading
                                    ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" })
                                    : _jsx(Download, { className: "w-4 h-4" }), downloading ? "Hazırlanır…" : "Nəticə faylını yüklə"] })] }) }), _jsxs("div", { className: "card mb-6", children: [_jsx("div", { className: "border-b border-slate-100 px-2 overflow-x-auto", children: _jsx("div", { className: "flex gap-1 min-w-max", children: TABS.map((t) => {
                                const count = tabCount(t.key);
                                const active = tab === t.key;
                                return (_jsxs("button", { onClick: () => setTab(t.key), className: `relative inline-flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors ${active ? "text-brand-700" : "text-slate-500 hover:text-slate-800"}`, children: [_jsx("span", { className: active ? "text-brand-600" : "text-slate-400", children: t.icon }), t.label, count !== null && (_jsx("span", { className: `text-xs px-2 py-0.5 rounded-full ${active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"}`, children: count })), active && (_jsx("span", { className: "absolute inset-x-2 -bottom-px h-0.5 bg-brand-600 rounded-full" }))] }, t.key));
                            }) }) }), _jsxs("div", { className: "p-6", children: [tab === "info" && _jsx(InfoTab, { exam: exam }), tab === "monitors" && (_jsxs(_Fragment, { children: [_jsx(MonitorRoleSubTabs, { exam: exam, value: monitorRole, onChange: setMonitorRole }), tabLoading ? _jsx(LoadingState, {}) : (_jsx(PeopleTable, { rows: tabData, showRole: monitorRole === "all", showRoom: true, emptyLabel: monitorRole === "all"
                                            ? "Nəzarətçi tapılmadı"
                                            : `${MONITOR_ROLE_LABELS[monitorRole]} kateqoriyasında heç kim yoxdur` }))] })), tab === "representatives" && (tabLoading ? _jsx(LoadingState, {}) : (_jsx(PeopleTable, { rows: tabData, emptyLabel: "N\u00FCmay\u0259nd\u0259 tap\u0131lmad\u0131" }))), tab === "experts" && (tabLoading ? _jsx(LoadingState, {}) : (_jsx(PeopleTable, { rows: tabData, showProfession: true, showRoom: true, emptyLabel: "Ekspert tap\u0131lmad\u0131" }))), tab === "students" && (tabLoading ? _jsx(LoadingState, {}) : (_jsx(StudentsTable, { rows: tabData }))), tab === "appeals" && (_jsx(AppealTab, { examId: examId, commissionNos: exam.commissionNos, commissionFilter: commissionFilter, onCommissionFilter: setCommissionFilter, data: appealData, loading: tabLoading, onUpdated: () => {
                                    // nəticə yeniləndi — reload et
                                    setTabLoading(true);
                                    const params = { examId };
                                    if (commissionFilter)
                                        params.commissionNo = commissionFilter;
                                    api.get("/appeals", { params })
                                        .then((r) => setAppealData(r.data))
                                        .finally(() => setTabLoading(false));
                                } }))] })] })] }));
}
// ── Info Tab ─────────────────────────────────────────────────────────────────
function InfoTab({ exam }) {
    const fields = [
        { label: "Bina", value: exam.buildingName, icon: _jsx(Building2, { className: "w-4 h-4" }) },
        { label: "Bölmə", value: exam.sectionName, icon: _jsx(Layers, { className: "w-4 h-4" }) },
        { label: "Başlama", value: exam.startTime, icon: _jsx(Clock, { className: "w-4 h-4" }) },
        { label: "Bitmə", value: exam.endTime, icon: _jsx(Clock, { className: "w-4 h-4" }) },
        { label: "Növbə", value: exam.shift?.toString() ?? null, icon: _jsx(Sun, { className: "w-4 h-4" }) },
        {
            label: "Tələbə sayı (planlanmış)", value: exam.studentCount?.toString() ?? null,
            icon: _jsx(Hash, { className: "w-4 h-4" })
        },
    ];
    return (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: fields.map((f) => (_jsxs("div", { className: "bg-slate-50/70 rounded-xl p-4 border border-slate-100", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2", children: [_jsx("span", { className: "text-slate-400", children: f.icon }), f.label] }), _jsx("div", { className: "font-semibold text-slate-900", children: f.value ?? "—" })] }, f.label))) }));
}
// ── Monitor Sub-tabs ──────────────────────────────────────────────────────────
function MonitorRoleSubTabs({ exam, value, onChange }) {
    const counts = [
        { role: MONITOR_ROLE.LEADER, label: MONITOR_ROLE_LABELS[1], count: exam.leaderCount },
        { role: MONITOR_ROLE.MONITOR, label: MONITOR_ROLE_LABELS[2], count: exam.monitorCount },
        { role: MONITOR_ROLE.VOLUNTEER, label: MONITOR_ROLE_LABELS[4], count: exam.volunteerCount },
        { role: MONITOR_ROLE.OTHER_STAFF, label: MONITOR_ROLE_LABELS[5], count: exam.otherStaffCount },
        { role: "all", label: "Hamısı", count: exam.monitorTotalCount },
    ];
    return (_jsx("div", { className: "mb-5 -mx-1 overflow-x-auto", children: _jsx("div", { className: "flex gap-1.5 min-w-max px-1", children: counts.map((r) => {
                const active = value === r.role;
                return (_jsxs("button", { onClick: () => onChange(r.role), className: `inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${active ? "bg-brand-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`, children: [_jsx("span", { className: active ? "text-white" : "text-slate-400", children: r.role === "all" ? _jsx(Users2, { className: "w-3.5 h-3.5" }) : ROLE_ICON[r.role] }), r.label, _jsx("span", { className: `text-xs px-1.5 py-0.5 rounded-md tabular-nums ${active ? "bg-white/20 text-white" : "bg-white text-slate-500"}`, children: r.count })] }, String(r.role)));
            }) }) }));
}
// ── People Table (experts, monitors, representatives) ─────────────────────────
// Görev 1: showProfession → İxtisas (alt-ixtisas), showRoom → Məntəqə sütunu
function PeopleTable({ rows, showRole = false, showProfession = false, showRoom = false, emptyLabel }) {
    if (rows.length === 0) {
        return _jsx(EmptyState, { icon: _jsx(Users2, { className: "w-7 h-7" }), title: emptyLabel });
    }
    return (_jsx("div", { className: "overflow-x-auto -mx-6 lg:-mx-0 rounded-xl border border-slate-100", children: _jsxs("table", { className: "table-modern", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Soyad" }), _jsx("th", { children: "Ad" }), _jsx("th", { children: "Ata ad\u0131" }), _jsx("th", { children: "F\u0130N" }), showProfession && _jsx("th", { children: "\u0130xtisas" }), showRoom && _jsx("th", { children: "M\u0259nt\u0259q\u0259" }), showRole && _jsx("th", { children: "Rol" })] }) }), _jsx("tbody", { children: rows.map((r, i) => (_jsxs("tr", { children: [_jsx("td", { className: "font-medium text-slate-900", children: String(r.surname ?? "") }), _jsx("td", { children: String(r.name ?? "") }), _jsx("td", { className: "text-slate-600", children: String(r.fname ?? "") }), _jsx("td", { className: "font-mono text-xs text-slate-500", children: String(r.finCode ?? "") }), showProfession && (_jsx("td", { className: "text-slate-700", children: r.subProfession
                                    ? String(r.subProfession)
                                    : r.profession ? String(r.profession) : "—" })), showRoom && (_jsx("td", { className: "text-slate-700", children: r.roomName
                                    ? String(r.roomName)
                                    : (r.roomId ? `#${String(r.roomId)}` : "—") })), showRole && (_jsx("td", { children: typeof r.role === "number" ? (_jsxs("span", { className: "badge-brand", children: [ROLE_ICON[r.role] ?? null, MONITOR_ROLE_LABELS[r.role] ?? `Rol ${r.role}`] })) : _jsx("span", { className: "text-slate-300", children: "\u2014" }) }))] }, i))) })] }) }));
}
// ── Students Table (ad/soyad filtri + açılabilir nəticələr) ───────────────────
// StudentRow ./StudentSubProfessionBreakdown-dan gəlir:
//   alt-ixtisaslı (62) → 3 alt-ixtisas bal kırılımı
//   digər tələbələr     → standart nəticə chip-ləri
function StudentsTable({ rows }) {
    const [query, setQuery] = useState("");
    const q = query.trim().toLowerCase();
    const filtered = q
        ? rows.filter((s) => {
            const full = `${s.surname ?? ""} ${s.name ?? ""} ${s.fatherName ?? ""}`.toLowerCase();
            return full.includes(q) || String(s.isN ?? "").toLowerCase().includes(q);
        })
        : rows;
    return (_jsxs("div", { children: [_jsxs("div", { className: "relative max-w-xs mb-4", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Ad, soyad v\u0259 ya i\u015F \u2116\u2026", className: "input pl-9" })] }), filtered.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Users2, { className: "w-7 h-7" }), title: rows.length === 0 ? "Tələbə yoxdur" : "Nəticə tapılmadı", description: rows.length === 0
                    ? "Bu imtahana hələ tələbə import edilməyib."
                    : "Axtarışa uyğun tələbə tapılmadı." })) : (_jsx("div", { className: "overflow-x-auto -mx-6 lg:-mx-0 rounded-xl border border-slate-100", children: _jsxs("table", { className: "table-modern", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "w-8" }), _jsx("th", { children: "Qrup" }), _jsx("th", { children: "\u2116" }), _jsx("th", { children: "\u0130\u015F \u2116" }), _jsx("th", { children: "T\u0259l\u0259b\u0259" }), _jsx("th", { children: "Cins" }), _jsx("th", { children: "\u0130xtisas" }), _jsx("th", { children: "\u0130\u015Ftirak" })] }) }), _jsx("tbody", { children: filtered.map((s) => _jsx(StudentRow, { s: s }, s.id)) })] }) }))] }));
}
// ── Appeal Tab ────────────────────────────────────────────────────────────────
function AppealTab({ commissionNos, commissionFilter, onCommissionFilter, data, loading, onUpdated }) {
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 mb-5", children: [_jsxs("div", { className: "max-w-xs", children: [_jsx("label", { className: "label", children: "Komissiya" }), _jsxs("select", { value: commissionFilter, onChange: (e) => onCommissionFilter(e.target.value), className: "input", children: [_jsx("option", { value: "", children: "B\u00FCt\u00FCn komissiyalar" }), commissionNos.map((c) => (_jsx("option", { value: c, children: c }, c)))] })] }), _jsx("div", { className: "self-end text-xs text-slate-500 pb-2.5", children: "Apellyasiya bal\u0131 manual daxil edilir; orijinal bal d\u0259yi\u015Fdirilmir." })] }), loading ? (_jsx(LoadingState, {})) : !data || data.rows.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Scale, { className: "w-7 h-7" }), title: "Apellyasiya \u00FC\u00E7\u00FCn t\u0259l\u0259b\u0259 yoxdur", description: "\u018Fvv\u0259lc\u0259 t\u0259l\u0259b\u0259l\u0259ri import edin." })) : (_jsx("div", { className: "space-y-3", children: data.rows.map((row) => (_jsx(AppealStudentRow, { row: row, exercises: data.exercises, onUpdated: onUpdated }, row.id))) }))] }));
}
// ── Tək tələbənin apellyasiya sətiri (accordion) ─────────────────────────────
function AppealStudentRow({ row, exercises, onUpdated }) {
    const [open, setOpen] = useState(false);
    const hasAppeals = row.appealResults.length > 0;
    return (_jsxs("div", { className: `rounded-xl border transition-all ${hasAppeals ? "border-amber-200 bg-amber-50/20" : "border-slate-100 bg-white"}`, children: [_jsxs("button", { onClick: () => setOpen(!open), className: "w-full flex items-center gap-3 px-5 py-3.5 text-left", children: [_jsx("span", { className: "text-slate-400", children: open ? _jsx(ChevronDown, { className: "w-4 h-4" }) : _jsx(ChevronRight, { className: "w-4 h-4" }) }), _jsx("span", { className: "font-mono text-xs text-slate-500 w-16", children: row.isN }), _jsx("span", { className: "font-semibold text-slate-900 flex-1", children: row.fullName }), _jsxs("span", { className: "text-xs text-slate-500", children: ["Qrup ", row.qrupNum] }), _jsx("span", { className: "text-xs font-mono text-slate-500", children: row.kodixtisas }), hasAppeals && (_jsxs("span", { className: "badge-amber", children: [_jsx(Scale, { className: "w-3 h-3" }), row.appealResults.length, " apellyasiya"] }))] }), open && (_jsxs("div", { className: "px-5 pb-5 space-y-3 border-t border-slate-100 pt-4", children: [exercises.map((ex) => {
                        const orig = row.originalResults.find((r) => r.exerciseId === ex.id);
                        const appeal = row.appealResults.find((r) => r.exerciseId === ex.id);
                        return (_jsx(AppealExerciseRow, { studentId: row.id, exercise: ex, original: orig ?? null, appeal: appeal ?? null, onUpdated: onUpdated }, ex.id));
                    }), exercises.length === 0 && (_jsx("p", { className: "text-sm text-slate-500", children: "Bu t\u0259l\u0259b\u0259 \u00FC\u00E7\u00FCn h\u0259r hans\u0131 n\u0259tic\u0259 import edilm\u0259yib." }))] }))] }));
}
// ── Tək exercise üzrə appeal satırı ──────────────────────────────────────────
function AppealExerciseRow({ studentId, exercise, original, appeal, onUpdated }) {
    const [editing, setEditing] = useState(false);
    const [score, setScore] = useState(appeal?.appealScore?.toString() ?? "");
    const [raw, setRaw] = useState(appeal?.rawValue?.toString() ?? "");
    const [decision, setDecision] = useState(appeal?.decision ?? "dəyişmədi");
    const [notes, setNotes] = useState(appeal?.notes ?? "");
    const [saving, setSaving] = useState(false);
    const inputRef = useRef(null);
    useEffect(() => {
        if (editing)
            inputRef.current?.focus();
    }, [editing]);
    async function save() {
        const scoreNum = Number(score);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10)
            return;
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
        }
        finally {
            setSaving(false);
        }
    }
    async function remove() {
        if (!appeal)
            return;
        await api.delete(`/appeals/${studentId}/${exercise.id}`);
        onUpdated();
    }
    return (_jsxs("div", { className: `flex flex-wrap items-center gap-3 p-3 rounded-xl ${appeal ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-100"}`, children: [_jsxs("div", { className: "min-w-[160px] flex-1", children: [_jsx("div", { className: "text-sm font-medium text-slate-900", children: exercise.name }), _jsx("div", { className: "text-xs font-mono text-slate-500", children: exercise.code })] }), _jsxs("div", { className: "text-center min-w-[80px]", children: [_jsx("div", { className: "text-xs text-slate-500 mb-0.5", children: "Orijinal" }), original ? (original.isRefused ? (_jsx("span", { className: "text-xs text-slate-400 italic", children: "imtina" })) : (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 font-mono", children: original.rawValue ?? "—" }), _jsx("div", { className: "font-bold text-slate-900 tabular-nums", children: original.finalScore })] }))) : (_jsx("span", { className: "text-slate-300 text-xs", children: "\u2014" }))] }), _jsxs("div", { className: "text-center min-w-[80px]", children: [_jsx("div", { className: "text-xs text-slate-500 mb-0.5", children: "Apellyasiya" }), appeal ? (_jsxs("div", { children: [_jsx("div", { className: `font-bold tabular-nums text-lg ${appeal.appealScore > (original?.finalScore ?? 0) ? "text-emerald-700" :
                                    appeal.appealScore < (original?.finalScore ?? 0) ? "text-rose-700" : "text-slate-700"}`, children: appeal.appealScore }), _jsx("span", { className: `text-[10px] px-1.5 py-0.5 rounded-full ${appeal.decision === "dəyişdi"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"}`, children: appeal.decision === "dəyişdi" ? "Dəyişdi" : "Dəyişmədi" })] })) : (_jsx("span", { className: "text-slate-300 text-xs", children: "\u2014" }))] }), _jsx("div", { className: "flex-1 min-w-[120px]", children: appeal?.notes && (_jsx("div", { className: "text-xs text-slate-600 italic", children: appeal.notes })) }), _jsxs("div", { className: "flex items-center gap-2", children: [!editing ? (_jsx("button", { onClick: () => setEditing(true), className: "btn-secondary !px-3 !py-1.5 !text-xs", children: appeal ? "Düzəliş" : "Daxil et" })) : (_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[10px] text-slate-500 mb-0.5", children: "Xam d\u0259y\u0259r" }), _jsx("input", { type: "number", step: "0.01", value: raw, onChange: (e) => setRaw(e.target.value), placeholder: "opsional", className: "input !w-24 !py-1 !text-xs" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[10px] text-slate-500 mb-0.5", children: "Bal (0-10)" }), _jsx("input", { ref: inputRef, type: "number", min: 0, max: 10, value: score, onChange: (e) => setScore(e.target.value), className: "input !w-16 !py-1 !text-xs" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[10px] text-slate-500 mb-0.5", children: "Q\u0259rar" }), _jsxs("select", { value: decision, onChange: (e) => setDecision(e.target.value), className: "input !py-1 !text-xs !w-28", children: [_jsx("option", { value: "d\u0259yi\u015Fdi", children: "D\u0259yi\u015Fdi" }), _jsx("option", { value: "d\u0259yi\u015Fm\u0259di", children: "D\u0259yi\u015Fm\u0259di" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[10px] text-slate-500 mb-0.5", children: "Qeyd" }), _jsx("input", { type: "text", value: notes, onChange: (e) => setNotes(e.target.value), placeholder: "opsional", className: "input !py-1 !text-xs !w-36" })] }), _jsxs("div", { className: "flex gap-1 self-end pb-px", children: [_jsx("button", { onClick: save, disabled: saving || !score, className: "btn-primary !px-2.5 !py-1.5", title: "Saxla", children: _jsx(Save, { className: "w-3.5 h-3.5" }) }), _jsx("button", { onClick: () => setEditing(false), className: "btn-secondary !px-2.5 !py-1.5", title: "L\u0259\u011Fv et", children: _jsx(X, { className: "w-3.5 h-3.5" }) })] })] })), appeal && !editing && (_jsx("button", { onClick: remove, className: "btn-ghost !px-2 !py-1.5 hover:!bg-rose-50 hover:!text-rose-700", title: "Sil", children: _jsx(X, { className: "w-3.5 h-3.5" }) }))] })] }));
}
