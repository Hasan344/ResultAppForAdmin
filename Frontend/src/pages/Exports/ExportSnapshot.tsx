// src/pages/Exports/ExportSnapshot.tsx
//
// Snapshot eksport paneli — station app-ın (exam-station-app) çəkdiyi master
// data-nı admin tərəfdən görünən hala gətirir. Eyni `/export/snapshot`
// endpoint-ini çağırır:
//   • Önizləmə → hər cədvəlin sayını göstərir (yazma yoxdur)
//   • JSON yüklə → snapshot-ı fayl kimi endirir
//
// Filtrlər: Rayon (siyahı), İmtahan ID, Komissiya №, tarix aralığı.
// Bölmə filtri yuxarıdakı qlobal seçicidən tətbiq olunur.

import { useEffect, useState } from "react";
import {
    Database, Download, Eye, Loader2, AlertCircle, FileJson, CheckCircle2,
} from "lucide-react";
import type { AxiosError } from "axios";
import { api } from "../../api/client";
import { PageHeader, StatCard } from "../../components/ui";
import { useSection } from "../../context/SectionContext";

type District = { id: number; name: string };

type Snapshot = {
    exported_at: string;
    source: string;
    filters: Record<string, unknown>;
    sections: unknown[];
    exercises: unknown[];
    commissions: unknown[];
    commission_exercises: unknown[];
    exams: unknown[];
    exam_commissions: unknown[];
    students: unknown[];
};

const inputCls =
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 " +
    "focus:border-brand-400 transition";

export default function ExportSnapshot() {
    const { sectionId } = useSection();

    const [districts, setDistricts] = useState<District[]>([]);
    const [districtId, setDistrictId] = useState("");
    const [examId, setExamId] = useState("");
    const [commissionNo, setCommissionNo] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const [busy, setBusy] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [snap, setSnap] = useState<Snapshot | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Rayon siyahısını çək (endpoint hazır deyilsə səssiz keç — panel pozulmasın).
    useEffect(() => {
        api
            .get<District[]>("/lookup/districts")
            .then((r) => setDistricts(r.data))
            .catch(() => setDistricts([]));
    }, []);

    function buildParams() {
        const p: Record<string, string | number> = {};
        if (sectionId !== null) p.sectionId = sectionId;
        if (districtId) p.districtId = districtId;
        if (examId.trim()) p.examId = examId.trim();
        if (commissionNo.trim()) p.commissionNo = commissionNo.trim();
        if (from) p.from = from;
        if (to) p.to = to;
        return p;
    }

    async function preview() {
        setBusy(true);
        setError(null);
        setSnap(null);
        try {
            const r = await api.get<Snapshot>("/export/snapshot", { params: buildParams() });
            setSnap(r.data);
        } catch (err) {
            setError((err as AxiosError).displayMessage ?? "Bilinməyən xəta");
        } finally {
            setBusy(false);
        }
    }

    async function download() {
        setDownloading(true);
        setError(null);
        try {
            // Önizləmə varsa onu endir; yoxdursa cari filtrlərlə yenidən çək.
            const data =
                snap ?? (await api.get<Snapshot>("/export/snapshot", { params: buildParams() })).data;
            if (!snap) setSnap(data);

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const stamp = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `snapshot_${stamp}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError((err as AxiosError).displayMessage ?? "Bilinməyən xəta");
        } finally {
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
        ]
        : [];

    return (
        <>
            <PageHeader
                title="Snapshot eksport"
                description="Station app-ın çəkdiyi master data — önizlə və ya JSON kimi endir."
                icon={<Database className="w-6 h-6" />}
            />

            {/* Filtrlər */}
            <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-soft p-6 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Rayon — siyahı */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Rayon</label>
                        <select
                            className={inputCls}
                            value={districtId}
                            onChange={(e) => setDistrictId(e.target.value)}
                        >
                            <option value="">Hamısı</option>
                            {districts.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">İmtahan ID</label>
                        <input
                            className={inputCls}
                            type="number"
                            inputMode="numeric"
                            placeholder="hamısı"
                            value={examId}
                            onChange={(e) => setExamId(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Komissiya №</label>
                        <input
                            className={inputCls}
                            placeholder="hamısı"
                            value={commissionNo}
                            onChange={(e) => setCommissionNo(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Tarix (başlanğıc)</label>
                        <input className={inputCls} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Tarix (son)</label>
                        <input className={inputCls} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                </div>

                <p className="text-xs text-slate-500 mt-3">
                    Bölmə filtri yuxarıdakı qlobal seçicidən tətbiq olunur
                    {sectionId !== null ? ` (cari: ${sectionId})` : " (seçilməyib — bütün bölmələr)"}. Filtrlər
                    boşdursa bütün data qaytarılır.
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                    <button
                        onClick={preview}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-4 py-2.5 text-sm font-medium shadow-sm shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-60 transition"
                    >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        Önizləmə
                    </button>
                    <button
                        onClick={download}
                        disabled={downloading}
                        className="inline-flex items-center gap-2 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 transition"
                    >
                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        JSON yüklə
                    </button>
                </div>
            </div>

            {/* Xəta */}
            {error && (
                <div className="rounded-2xl bg-rose-50 ring-1 ring-rose-100 p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-rose-700">{error}</div>
                </div>
            )}

            {/* Nəticə */}
            {snap && (
                <div className="space-y-5">
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                            Snapshot hazırdır · mənbə: <span className="font-medium">{snap.source}</span> ·{" "}
                            {new Date(snap.exported_at).toLocaleString("az-AZ")}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {counts.map((c) => (
                            <StatCard
                                key={c.label}
                                label={c.label}
                                value={c.value}
                                tone={c.value > 0 ? "brand" : "neutral"}
                            />
                        ))}
                    </div>

                    <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 p-4 flex items-start gap-3">
                        <FileJson className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-500 leading-relaxed">
                            Station app eyni datanı <code className="text-slate-700">GET /api/export/snapshot</code>{" "}
                            endpoint-indən avtomatik çəkir (Admin → İdxal → "ResultsApp-dan idxal" kartı). Bu panel
                            həmin nəticənin yoxlanması və əl ilə endirilməsi üçündür.
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}