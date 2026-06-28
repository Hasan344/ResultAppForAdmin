import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/pages/Exports/ExportSnapshot.tsx
//
// Snapshot eksport paneli — station app-ın (exam-station-app) çəkdiyi master
// data-nı admin tərəfdən görünən hala gətirir. Eyni `/export/snapshot`
// endpoint-ini çağırır:
//   • Önizləmə → hər cədvəlin sayını göstərir (yazma yoxdur)
//   • JSON yüklə → snapshot-ı fayl kimi endirir
//
// Filtrlər: İmtahan binası (siyahı), İmtahan ID, Komissiya №, tarix aralığı.
// İmtahan binası siyahısı cari (qlobal) bölmə seçiminə görə süzülür.
// Bölmə filtri yuxarıdakı qlobal seçicidən tətbiq olunur.
import { useEffect, useState } from "react";
import { Database, Download, Eye, Loader2, AlertCircle, FileJson, CheckCircle2, } from "lucide-react";
import { api } from "../../api/client";
import { PageHeader, StatCard } from "../../components/ui";
import { useSection } from "../../context/SectionContext";
const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 " +
    "focus:border-brand-400 transition";
export default function ExportSnapshot() {
    const { sectionId } = useSection();
    const [buildings, setBuildings] = useState([]);
    const [buildingId, setBuildingId] = useState("");
    const [examId, setExamId] = useState("");
    const [commissionNo, setCommissionNo] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [busy, setBusy] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [snap, setSnap] = useState(null);
    const [error, setError] = useState(null);
    // İmtahan binalarını yüklə — YALNIZ cari bölməyə aid olanlar.
    // Bölmə dəyişəndə siyahı yenidən çəkilir və əvvəlki bina seçimi sıfırlanır
    // (həmin bina yeni bölmədə olmaya bilər). Endpoint hazır deyilsə səssiz keç —
    // panel pozulmasın.
    useEffect(() => {
        const params = {};
        if (sectionId !== null)
            params.sectionId = sectionId;
        api
            .get("/lookup/buildings", { params })
            .then((r) => setBuildings(r.data))
            .catch(() => setBuildings([]));
        setBuildingId("");
    }, [sectionId]);
    function buildParams() {
        const p = {};
        if (sectionId !== null)
            p.sectionId = sectionId;
        if (buildingId)
            p.buildingId = buildingId;
        if (examId.trim())
            p.examId = examId.trim();
        if (commissionNo.trim())
            p.commissionNo = commissionNo.trim();
        if (from)
            p.from = from;
        if (to)
            p.to = to;
        return p;
    }
    async function preview() {
        setBusy(true);
        setError(null);
        setSnap(null);
        try {
            const r = await api.get("/export/snapshot", { params: buildParams() });
            setSnap(r.data);
        }
        catch (err) {
            setError(err.displayMessage ?? "Bilinməyən xəta");
        }
        finally {
            setBusy(false);
        }
    }
    async function download() {
        setDownloading(true);
        setError(null);
        try {
            // Önizləmə varsa onu endir; yoxdursa cari filtrlərlə yenidən çək.
            const data = snap ?? (await api.get("/export/snapshot", { params: buildParams() })).data;
            if (!snap)
                setSnap(data);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const stamp = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `snapshot_${stamp}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
        catch (err) {
            setError(err.displayMessage ?? "Bilinməyən xəta");
        }
        finally {
            setDownloading(false);
        }
    }
    const counts = snap
        ? [
            { label: "Bölmələr", value: snap.sections.length },
            { label: "Hərəkətlər", value: snap.exercises.length },
            { label: "Komissiyalar", value: snap.commissions.length },
            { label: "Komissiya ↔ Hərəkət", value: snap.commission_exercises.length },
            { label: "İmtahanlar", value: snap.exams.length },
            { label: "İmtahan ↔ Komissiya", value: snap.exam_commissions.length },
            { label: "Tələbələr", value: snap.students.length },
            { label: "Ekspertlər", value: snap.experts.length },
            { label: "İmtahan ekspertləri", value: snap.exam_expert_subprofessions.length },
            { label: "Şəkillər", value: snap.photos.length },
        ]
        : [];
    return (_jsxs(_Fragment, { children: [_jsx(PageHeader, { title: "Snapshot eksport", description: "Station app-\u0131n \u00E7\u0259kdiyi master data \u2014 \u00F6nizl\u0259 v\u0259 ya JSON kimi endir.", icon: _jsx(Database, { className: "w-6 h-6" }) }), _jsxs("div", { className: "rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-soft p-6 mb-6", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-slate-600 mb-1.5", children: "\u0130mtahan binas\u0131" }), _jsxs("select", { className: inputCls, value: buildingId, onChange: (e) => setBuildingId(e.target.value), children: [_jsx("option", { value: "", children: "Ham\u0131s\u0131" }), buildings.map((b) => (_jsx("option", { value: b.id, children: b.name }, b.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-slate-600 mb-1.5", children: "\u0130mtahan ID" }), _jsx("input", { className: inputCls, type: "number", inputMode: "numeric", placeholder: "ham\u0131s\u0131", value: examId, onChange: (e) => setExamId(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-slate-600 mb-1.5", children: "Komissiya \u2116" }), _jsx("input", { className: inputCls, placeholder: "ham\u0131s\u0131", value: commissionNo, onChange: (e) => setCommissionNo(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-slate-600 mb-1.5", children: "Tarix (ba\u015Flan\u011F\u0131c)" }), _jsx("input", { className: inputCls, type: "date", value: from, onChange: (e) => setFrom(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-slate-600 mb-1.5", children: "Tarix (son)" }), _jsx("input", { className: inputCls, type: "date", value: to, onChange: (e) => setTo(e.target.value) })] })] }), _jsxs("p", { className: "text-xs text-slate-500 mt-3", children: ["B\u00F6lm\u0259 filtri yuxar\u0131dak\u0131 qlobal se\u00E7icid\u0259n t\u0259tbiq olunur", sectionId !== null ? ` (cari: ${sectionId})` : " (seçilməyib — bütün bölmələr)", ". \u0130mtahan binas\u0131 siyah\u0131s\u0131 se\u00E7ilmi\u015F b\u00F6lm\u0259y\u0259 g\u00F6r\u0259 s\u00FCz\u00FCl\u00FCr. Filtrl\u0259r bo\u015Fdursa b\u00FCt\u00FCn data qaytar\u0131l\u0131r."] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 mt-5", children: [_jsxs("button", { onClick: preview, disabled: busy, className: "inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-4 py-2.5 text-sm font-medium shadow-sm shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-60 transition", children: [busy ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(Eye, { className: "w-4 h-4" }), "\u00D6nizl\u0259m\u0259"] }), _jsxs("button", { onClick: download, disabled: downloading, className: "inline-flex items-center gap-2 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 transition", children: [downloading ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(Download, { className: "w-4 h-4" }), "JSON y\u00FCkl\u0259"] })] })] }), error && (_jsxs("div", { className: "rounded-2xl bg-rose-50 ring-1 ring-rose-100 p-4 mb-6 flex items-start gap-3", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-rose-500 shrink-0 mt-0.5" }), _jsx("div", { className: "text-sm text-rose-700", children: error })] })), snap && (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm text-emerald-700", children: [_jsx(CheckCircle2, { className: "w-4 h-4" }), _jsxs("span", { children: ["Snapshot haz\u0131rd\u0131r \u00B7 m\u0259nb\u0259: ", _jsx("span", { className: "font-medium", children: snap.source }), " \u00B7", " ", new Date(snap.exported_at).toLocaleString("az-AZ")] })] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4", children: counts.map((c) => (_jsx(StatCard, { label: c.label, value: c.value, tone: c.value > 0 ? "brand" : "neutral" }, c.label))) }), _jsxs("div", { className: "rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 p-4 flex items-start gap-3", children: [_jsx(FileJson, { className: "w-5 h-5 text-slate-400 shrink-0 mt-0.5" }), _jsxs("div", { className: "text-xs text-slate-500 leading-relaxed", children: ["Station app eyni datan\u0131 ", _jsx("code", { className: "text-slate-700", children: "GET /api/export/snapshot" }), " ", "endpoint-ind\u0259n avtomatik \u00E7\u0259kir (Admin \u2192 \u0130dxal \u2192 \"ResultsApp-dan idxal\" kart\u0131). Bu panel h\u0259min n\u0259tic\u0259nin yoxlanmas\u0131 v\u0259 \u0259l il\u0259 endirilm\u0259si \u00FC\u00E7\u00FCnd\u00FCr."] })] })] }))] }));
}
