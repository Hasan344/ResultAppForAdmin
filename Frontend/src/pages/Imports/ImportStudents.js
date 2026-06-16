import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, X, Info, Wand2, Settings2 } from "lucide-react";
import { api } from "../../api/client";
import { PageHeader, StatCard } from "../../components/ui";
import { useSection } from "../../context/SectionContext";
export default function ImportStudents() {
    const { sectionId } = useSection();
    const [mode, setMode] = useState("auto");
    const [commissions, setCommissions] = useState([]);
    const [commissionNo, setCommissionNo] = useState("");
    const [examDate, setExamDate] = useState("");
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [errorDetail, setErrorDetail] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    // Manual modda + section dəyişdikdə commissions-ı yenilə
    useEffect(() => {
        if (mode !== "manual")
            return;
        const params = {};
        if (sectionId !== null)
            params.sectionId = sectionId;
        api.get("/lookup/commissions", { params })
            .then((r) => setCommissions(r.data));
        setCommissionNo(""); // section dəyişdikdə seçimi sıfırla
    }, [mode, sectionId]);
    async function submit(e) {
        e.preventDefault();
        if (!file)
            return;
        if (mode === "manual" && (!commissionNo || !examDate))
            return;
        setBusy(true);
        setError(null);
        setErrorDetail(null);
        setResult(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            let url = "/imports/students/auto";
            if (mode === "manual") {
                url = "/imports/students";
                fd.append("commissionNo", commissionNo);
                fd.append("examDate", examDate);
            }
            const r = await api.post(url, fd, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setResult(r.data);
        }
        catch (err) {
            const ax = err;
            setError(ax.displayMessage ?? "Bilinməyən xəta");
            setErrorDetail(ax.displayDetail ?? null);
        }
        finally {
            setBusy(false);
        }
    }
    function onDrop(ev) {
        ev.preventDefault();
        setDragOver(false);
        const f = ev.dataTransfer.files?.[0];
        if (f && f.name.toLowerCase().endsWith(".xlsx"))
            setFile(f);
    }
    const canSubmit = file && !busy && (mode === "auto" || (commissionNo && examDate));
    return (_jsxs("div", { className: "max-w-3xl", children: [_jsx(PageHeader, { title: "T\u0259l\u0259b\u0259l\u0259ri Import et", description: "Excel fayl\u0131ndan komissiyalara t\u0259l\u0259b\u0259 m\u0259lumatlar\u0131n\u0131 y\u00FCkl\u0259yin", icon: _jsx(Upload, { className: "w-6 h-6" }) }), _jsxs("div", { className: "card p-2 mb-6 inline-flex gap-1", children: [_jsxs("button", { onClick: () => setMode("auto"), className: `inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "auto"
                            ? "bg-brand-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"}`, children: [_jsx(Wand2, { className: "w-4 h-4" }), " Avtomatik"] }), _jsxs("button", { onClick: () => setMode("manual"), className: `inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "manual"
                            ? "bg-brand-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"}`, children: [_jsx(Settings2, { className: "w-4 h-4" }), " Manuel"] })] }), mode === "auto" && (_jsxs("div", { className: "mb-4 rounded-2xl bg-brand-50 border border-brand-100 p-4 flex gap-3", children: [_jsx(Info, { className: "w-5 h-5 text-brand-600 shrink-0 mt-0.5" }), _jsxs("p", { className: "text-sm text-brand-900", children: [_jsx("strong", { children: "Avtomatik mod:" }), " Excel-d\u0259ki", " ", _jsx("code", { className: "font-mono bg-brand-100 px-1 rounded text-xs", children: "KODIXTISAS" }), " ", "v\u0259", " ", _jsx("code", { className: "font-mono bg-brand-100 px-1 rounded text-xs", children: "imt_tarix" }), " ", "s\u00FCtunlar\u0131na g\u00F6r\u0259 h\u0259r s\u0259tr avtomatik uy\u011Fun komissiyaya ba\u011Flan\u0131r. Bir faylda 25+ komissiya ola bil\u0259r."] })] })), _jsxs("form", { onSubmit: submit, className: "card p-6 space-y-5", children: [mode === "manual" && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { className: "label", children: "Komissiya" }), _jsxs("select", { required: true, value: commissionNo, onChange: (e) => setCommissionNo(e.target.value), className: "input", children: [_jsx("option", { value: "", children: "\u2014 se\u00E7in \u2014" }), commissions.map((c) => (_jsxs("option", { value: c.commissionNo, children: [c.commissionNo, " \u2014 ", c.name] }, c.id)))] }), sectionId !== null && commissions.length === 0 && (_jsxs("p", { className: "text-xs text-amber-700 mt-2 flex items-start gap-1.5", children: [_jsx(AlertCircle, { className: "w-3.5 h-3.5 mt-0.5 shrink-0" }), "Se\u00E7ili b\u00F6lm\u0259d\u0259 komissiya yoxdur. Sol paneld\u0259 b\u00F6lm\u0259ni d\u0259yi\u015Fin."] }))] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "\u0130mtahan tarixi" }), _jsx("input", { type: "date", required: true, value: examDate, onChange: (e) => setExamDate(e.target.value), className: "input" }), _jsxs("p", { className: "text-xs text-slate-500 mt-2 flex items-start gap-1.5", children: [_jsx(Info, { className: "w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" }), "Sistem bu tarixd\u0259 h\u0259min komissiyaya ba\u011Fl\u0131 imtahan\u0131 tapacaq."] })] })] })), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Excel fayl\u0131" }), _jsxs("label", { onDragOver: (e) => { e.preventDefault(); setDragOver(true); }, onDragLeave: () => setDragOver(false), onDrop: onDrop, className: `relative flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragOver
                                    ? "border-brand-400 bg-brand-50/50"
                                    : file
                                        ? "border-emerald-300 bg-emerald-50/40"
                                        : "border-slate-200 bg-slate-50/50 hover:border-brand-300 hover:bg-brand-50/30"}`, children: [_jsx("input", { type: "file", accept: ".xlsx", className: "sr-only", onChange: (e) => setFile(e.target.files?.[0] ?? null) }), file ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center", children: _jsx(FileSpreadsheet, { className: "w-6 h-6" }) }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "font-semibold text-slate-900", children: file.name }), _jsxs("div", { className: "text-xs text-slate-500 mt-0.5", children: [(file.size / 1024).toFixed(1), " KB"] })] }), _jsx("button", { type: "button", onClick: (e) => { e.preventDefault(); setFile(null); }, className: "absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition", children: _jsx(X, { className: "w-4 h-4" }) })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center", children: _jsx(Upload, { className: "w-6 h-6" }) }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "font-semibold text-slate-900", children: "Klikl\u0259yin v\u0259 ya s\u00FCr\u00FC\u015Fd\u00FCr\u00FCn" }), _jsxs("div", { className: "text-xs text-slate-500 mt-1", children: ["Yaln\u0131z .xlsx \u00B7 maksimum ", mode === "auto" ? "50" : "20", " MB"] })] })] }))] })] }), _jsx("div", { className: "flex items-center justify-end gap-3 pt-2", children: _jsx("button", { type: "submit", disabled: !canSubmit, className: "btn-primary", children: busy
                                ? _jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), " Y\u00FCkl\u0259nir\u2026"] })
                                : _jsxs(_Fragment, { children: [_jsx(Upload, { className: "w-4 h-4" }), " Import et"] }) }) })] }), error && (_jsxs("div", { className: "mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-rose-600 shrink-0 mt-0.5" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "font-semibold text-rose-900", children: "Import al\u0131nmad\u0131" }), _jsx("div", { className: "text-sm text-rose-700 mt-1 break-words", children: error }), errorDetail && (_jsxs("details", { className: "mt-3", children: [_jsx("summary", { className: "text-xs font-medium text-rose-500 cursor-pointer select-none hover:text-rose-700", children: "Texniki detallar \u25B8" }), _jsx("pre", { className: "mt-2 text-xs text-rose-500 bg-rose-100/60 rounded-lg p-3 whitespace-pre-wrap break-all max-h-48 overflow-y-auto", children: errorDetail })] }))] })] })), result && (_jsxs("div", { className: "mt-6 space-y-4", children: [_jsxs("div", { className: "rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3", children: [_jsx(CheckCircle2, { className: "w-5 h-5 text-emerald-600 shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("div", { className: "font-semibold text-emerald-900", children: "Import tamamland\u0131" }), result.batchId > 0 && (_jsxs("div", { className: "text-sm text-emerald-700 mt-0.5", children: ["Batch ID: ", _jsx("span", { className: "font-mono", children: result.batchId })] }))] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsx(StatCard, { label: "C\u0259mi", value: result.total, tone: "neutral", icon: _jsx(FileSpreadsheet, { className: "w-5 h-5" }) }), _jsx(StatCard, { label: "U\u011Furlu", value: result.success, tone: "success", icon: _jsx(CheckCircle2, { className: "w-5 h-5" }) }), _jsx(StatCard, { label: "U\u011Fursuz", value: result.failed, tone: "danger", icon: _jsx(AlertCircle, { className: "w-5 h-5" }) })] }), result.successByCommission && Object.keys(result.successByCommission).length > 1 && (_jsxs("div", { className: "card overflow-hidden", children: [_jsx("div", { className: "px-5 py-3 border-b border-slate-100 bg-slate-50/50", children: _jsx("h3", { className: "text-sm font-semibold text-slate-900", children: "Komissiya bazl\u0131 say\u011Fac" }) }), _jsxs("table", { className: "table-modern", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Komissiya" }), _jsx("th", { className: "text-right", children: "T\u0259l\u0259b\u0259" })] }) }), _jsx("tbody", { children: Object.entries(result.successByCommission)
                                            .sort(([a], [b]) => a.localeCompare(b))
                                            .map(([no, count]) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("span", { className: "badge-brand", children: no }) }), _jsx("td", { className: "text-right tabular-nums font-medium", children: count })] }, no))) })] })] })), result.errors.length > 0 && (_jsxs("div", { className: "card overflow-hidden", children: [_jsx("div", { className: "px-5 py-3 border-b border-slate-100 bg-slate-50/50", children: _jsxs("h3", { className: "text-sm font-semibold text-slate-900", children: ["X\u0259talar (", result.errors.length, ")"] }) }), _jsx("div", { className: "max-h-72 overflow-y-auto", children: _jsxs("table", { className: "table-modern", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "S\u0259tr" }), _jsx("th", { children: "X\u0259ta" })] }) }), _jsx("tbody", { children: result.errors.map((er, i) => (_jsxs("tr", { children: [_jsx("td", { className: "tabular-nums font-mono text-xs", children: er.row }), _jsx("td", { className: "text-rose-700", children: er.error })] }, i))) })] }) })] }))] }))] }));
}
