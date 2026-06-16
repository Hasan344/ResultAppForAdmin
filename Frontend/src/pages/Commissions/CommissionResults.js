import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Users, ListChecks, CheckCircle2, XCircle, Clock, Trophy, Inbox } from "lucide-react";
import { api } from "../../api/client";
import { PageHeader, StatCard, EmptyState, LoadingState } from "../../components/ui";
import { shortExerciseLabel, genderLabel, formatDate } from "../../lib/format";
import { useSection } from "../../context/SectionContext";
export default function CommissionResults() {
    const { sectionId } = useSection();
    const [commissions, setCommissions] = useState([]);
    const [exams, setExams] = useState([]);
    const [commissionNo, setCommissionNo] = useState("");
    const [examId, setExamId] = useState(null);
    const [qrupNum, setQrupNum] = useState("");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    // ── 1. Section dəyişəndə: commissions-ı yenidən yüklə, seçimləri sıfırla ──
    useEffect(() => {
        const params = {};
        if (sectionId !== null)
            params.sectionId = sectionId;
        api.get("/lookup/commissions", { params })
            .then((r) => setCommissions(r.data));
        // section dəyişdikdə aşağı filtrlər sıfırlanır
        setCommissionNo("");
        setExamId(null);
        setExams([]);
        setData(null);
    }, [sectionId]);
    // ── 2. Komissiya dəyişdikdə: həmin komissiyanın imtahanlarını yüklə ─────────
    useEffect(() => {
        if (!commissionNo) {
            setExams([]);
            setExamId(null);
            setData(null);
            return;
        }
        const params = { commissionNo };
        if (sectionId !== null)
            params.sectionId = sectionId;
        api.get("/exams", { params }).then((r) => {
            setExams(r.data);
            setExamId(r.data[0]?.id ?? null);
        });
        setData(null);
    }, [commissionNo, sectionId]);
    // ── 3. Exam / qrup dəyişdikdə: nəticələri yüklə ─────────────────────────────
    useEffect(() => {
        if (!commissionNo || !examId) {
            setData(null);
            return;
        }
        setLoading(true);
        const params = { examId };
        if (qrupNum)
            params.qrupNum = Number(qrupNum);
        api.get(`/commissions/${commissionNo}/results`, { params })
            .then((r) => setData(r.data))
            .finally(() => setLoading(false));
    }, [commissionNo, examId, qrupNum]);
    return (_jsxs("div", { children: [_jsx(PageHeader, { title: "Komissiya N\u0259tic\u0259l\u0259ri", description: "Komissiya bazl\u0131 t\u0259l\u0259b\u0259 n\u0259tic\u0259l\u0259rini v\u0259 \u00FCmumi statistikan\u0131 g\u00F6r\u00FCn", icon: _jsx(Trophy, { className: "w-6 h-6" }) }), _jsx("div", { className: "card p-4 mb-6", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "label", children: "Komissiya" }), _jsxs("select", { value: commissionNo, onChange: (e) => setCommissionNo(e.target.value), className: "input", children: [_jsx("option", { value: "", children: "\u2014 se\u00E7in \u2014" }), commissions.map((c) => (_jsxs("option", { value: c.commissionNo, children: [c.commissionNo, " \u2014 ", c.name] }, c.id)))] }), sectionId !== null && commissions.length === 0 && (_jsx("p", { className: "text-xs text-amber-700 mt-1.5", children: "Bu b\u00F6lm\u0259d\u0259 komissiya yoxdur." }))] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "\u0130mtahan" }), _jsx("select", { value: examId ?? "", onChange: (e) => setExamId(e.target.value ? Number(e.target.value) : null), className: "input", disabled: !commissionNo || exams.length === 0, children: exams.length === 0
                                        ? _jsx("option", { value: "", children: "\u2014 \u0259vv\u0259lc\u0259 komissiya se\u00E7in \u2014" })
                                        : exams.map((e) => (_jsxs("option", { value: e.id, children: [formatDate(e.examDate), " \u2014 ", e.name] }, e.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Qrup (opsional)" }), _jsx("input", { type: "number", value: qrupNum, onChange: (e) => setQrupNum(e.target.value), placeholder: "M\u0259s: 1", className: "input", disabled: !examId })] })] }) }), (!commissionNo || !examId) ? (_jsx("div", { className: "card", children: _jsx(EmptyState, { icon: _jsx(Trophy, { className: "w-7 h-7" }), title: "Komissiya v\u0259 imtahan se\u00E7in", description: sectionId !== null
                        ? "Seçilmiş bölmənin komissiyalarından birini seçin."
                        : "Nəticələri görmək üçün komissiya və imtahan seçməyiniz lazımdır." }) })) : loading ? (_jsx("div", { className: "card", children: _jsx(LoadingState, {}) })) : !data ? null : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6", children: [_jsx(StatCard, { label: "C\u0259mi", value: data.summary.total, tone: "brand", icon: _jsx(Users, { className: "w-5 h-5" }) }), _jsx(StatCard, { label: "M\u0259qbul", value: data.summary.passed, tone: "success", icon: _jsx(CheckCircle2, { className: "w-5 h-5" }) }), _jsx(StatCard, { label: "Qeyri-m\u0259qbul", value: data.summary.failed, tone: "danger", icon: _jsx(XCircle, { className: "w-5 h-5" }) }), _jsx(StatCard, { label: "G\u00F6zl\u0259yir", value: data.summary.pending, tone: "amber", icon: _jsx(Clock, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "card overflow-hidden", children: [_jsxs("div", { className: "px-5 py-4 border-b border-slate-100 flex items-center gap-2", children: [_jsx(ListChecks, { className: "w-4 h-4 text-slate-500" }), _jsx("h2", { className: "font-semibold text-slate-900", children: "T\u0259l\u0259b\u0259 N\u0259tic\u0259l\u0259ri" }), _jsx("span", { className: "badge-neutral ml-1", children: data.rows.length })] }), data.rows.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Inbox, { className: "w-7 h-7" }), title: "N\u0259tic\u0259 tap\u0131lmad\u0131", description: "Bu komissiya v\u0259 imtahan \u00FC\u00E7\u00FCn he\u00E7 bir t\u0259l\u0259b\u0259 yoxdur." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "table-modern", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Qr" }), _jsx("th", { children: "\u2116" }), _jsx("th", { children: "\u0130\u015F \u2116" }), _jsx("th", { children: "Ad Soyad" }), _jsx("th", { children: "Cins" }), data.exercises.map((ex) => (_jsx("th", { className: "text-center", children: shortExerciseLabel(ex.code) }, ex.id))), _jsx("th", { className: "text-right", children: "Total" }), _jsx("th", { className: "text-center", children: "Status" })] }) }), _jsx("tbody", { children: data.rows.map((r) => (_jsxs("tr", { children: [_jsx("td", { className: "tabular-nums font-medium", children: r.qrupNum }), _jsx("td", { className: "tabular-nums text-slate-500", children: r.sNomer ?? "—" }), _jsx("td", { className: "font-mono text-xs text-slate-500", children: r.isN }), _jsx("td", { className: "font-medium text-slate-900", children: r.fullName }), _jsx("td", { className: "text-slate-600", children: genderLabel(r.gender) }), data.exercises.map((ex) => {
                                                        const s = r.scoresByExerciseCode[ex.code];
                                                        return (_jsx("td", { className: "text-center", children: s ? (_jsxs("div", { className: "leading-tight", children: [_jsx("div", { className: "font-mono text-[11px] text-slate-400", children: s.rawValue ?? "—" }), _jsx("div", { className: `font-bold text-sm ${s.isRefused
                                                                            ? "text-slate-400 italic"
                                                                            : s.finalScore >= 6
                                                                                ? "text-slate-900"
                                                                                : "text-rose-600"}`, children: s.isRefused ? "imtina" : s.finalScore })] })) : (_jsx("span", { className: "text-slate-300", children: "\u2014" })) }, ex.id));
                                                    }), _jsx("td", { className: "text-right tabular-nums font-bold text-slate-900", children: r.totalScore ?? "—" }), _jsx("td", { className: "text-center", children: r.totalScore === null ? (_jsxs("span", { className: "badge-amber", children: [_jsx(Clock, { className: "w-3 h-3" }), "G\u00F6zl\u0259yir"] })) : r.isPassed ? (_jsxs("span", { className: "badge-success", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), "M\u0259qbul"] })) : (_jsxs("span", { className: "badge-danger", children: [_jsx(XCircle, { className: "w-3 h-3" }), "Qeyri-m\u0259qbul"] })) })] }, r.studentId))) })] }) }))] })] }))] }));
}
