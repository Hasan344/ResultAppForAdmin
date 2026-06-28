// src/pages/Students/StudentSearch.tsx
//
// Tələbə axtarışı — ümumi bazadan ad / soyad / iş № üzrə tələbə axtarır.
// Hər nəticə sətri = bir imtahan iştirakı (eyni şəxs bir neçə imtahanda iştirak
// edibsə, hər biri ayrı sətr kimi görünür). Sətri açanda həmin iştirakın
// nəticələri `/results/by-student/{id}` endpoint-indən lazy yüklənir.
//
// Bölmə (section) qlobal seçicidən gəlir — verilibsə axtarış o bölmə ilə
// məhdudlaşır.

import { useEffect, useState } from "react";
import {
    Search, Users2, Loader2, ChevronDown, ChevronRight,
    CalendarDays, Hash, CheckCircle2, Circle, AlertCircle,
} from "lucide-react";
import type { AxiosError } from "axios";
import { api } from "../../api/client";
import { PageHeader, EmptyState } from "../../components/ui";
import { formatDate, genderLabel } from "../../lib/format";
import { useSection } from "../../context/SectionContext";

type StudentHit = {
    id: number;
    examId: number;
    examName: string | null;
    examDate: string;
    isN: string;
    surname: string;
    name: string;
    fatherName: string | null;
    gender: number;
    qrupNum: number;
    commissionNo: string | null;
    kodixtisas: string | null;
    ixtisasName: string | null;
    altNov: string | null;
    isAttended: boolean;
};

type ResultRow = {
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

const inputCls =
    "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 " +
    "focus:border-brand-400 transition";

export default function StudentSearch() {
    const { sectionId } = useSection();

    const [q, setQ] = useState("");
    const [hits, setHits] = useState<StudentHit[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounce: hər dəyişiklikdən 350ms sonra axtar. Termin <2 simvol olarsa
    // siyahını təmizlə.
    useEffect(() => {
        const term = q.trim();
        if (term.length < 2) {
            setHits([]);
            setSearched(false);
            setError(null);
            return;
        }

        const handle = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const params: Record<string, string | number> = { q: term };
                if (sectionId !== null) params.sectionId = sectionId;
                const r = await api.get<StudentHit[]>("/students/search", { params });
                setHits(r.data);
                setSearched(true);
            } catch (err) {
                setError((err as AxiosError).displayMessage ?? "Bilinməyən xəta");
            } finally {
                setLoading(false);
            }
        }, 350);

        return () => clearTimeout(handle);
    }, [q, sectionId]);

    return (
        <>
            <PageHeader
                title="Tələbə axtarışı"
                description="Ümumi bazadan ad, soyad və ya iş № üzrə tələbə tap; iştirak etdiyi imtahanları və nəticələrini gör."
                icon={<Users2 className="w-6 h-6" />}
            />

            {/* Axtarış qutusu */}
            <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-soft p-6 mb-6">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Ad, soyad və ya iş №
                </label>
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        className={inputCls + " pl-9"}
                        placeholder="ən azı 2 simvol…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        autoFocus
                    />
                    {loading && (
                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    {sectionId !== null
                        ? `Axtarış cari bölmə ilə məhdudlaşır (bölmə: ${sectionId}).`
                        : "Bölmə seçilməyib — bütün bölmələrdə axtarılır."}{" "}
                    Maksimum 100 nəticə göstərilir.
                </p>
            </div>

            {/* Xəta */}
            {error && (
                <div className="rounded-2xl bg-rose-50 ring-1 ring-rose-100 p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-rose-700">{error}</div>
                </div>
            )}

            {/* Nəticələr */}
            {searched && hits.length === 0 && !loading ? (
                <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-soft p-6">
                    <EmptyState
                        icon={<Search className="w-7 h-7" />}
                        title="Nəticə tapılmadı"
                        description="Başqa ad, soyad və ya iş № ilə yoxlayın."
                    />
                </div>
            ) : hits.length > 0 ? (
                <div className="space-y-2.5">
                    <div className="text-xs text-slate-500 px-1">{hits.length} nəticə</div>
                    {hits.map((h) => (
                        <StudentHitCard key={`${h.id}`} hit={h} />
                    ))}
                </div>
            ) : null}
        </>
    );
}

// ── Tək tələbə-iştirak sətri (açılıb nəticələri göstərir) ─────────────────────
function StudentHitCard({ hit }: { hit: StudentHit }) {
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState<ResultRow[] | null>(null);
    const [loading, setLoading] = useState(false);

    async function toggle() {
        const next = !open;
        setOpen(next);
        if (next && results === null) {
            setLoading(true);
            try {
                const r = await api.get<ResultRow[]>(`/results/by-student/${hit.id}`);
                setResults(r.data);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }
    }

    return (
        <div className="rounded-xl border border-slate-100 bg-white">
            <button onClick={toggle} className="w-full flex items-center gap-3 px-5 py-3.5 text-left">
                <span className="text-slate-400">
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>

                <span className="font-mono text-xs text-slate-500 w-16 shrink-0">{hit.isN}</span>

                <span className="font-semibold text-slate-900 flex-1 min-w-0 truncate">
                    {hit.surname} {hit.name}{" "}
                    <span className="text-slate-500 font-normal">{hit.fatherName}</span>
                </span>

                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {formatDate(hit.examDate)}
                </span>

                <span className="hidden md:inline text-xs text-slate-600 max-w-[180px] truncate">
                    {hit.examName ?? `İmtahan #${hit.examId}`}
                </span>

                {hit.commissionNo && (
                    <span className="badge-brand shrink-0">
                        <Hash className="w-3 h-3" />
                        {hit.commissionNo}
                    </span>
                )}

                <span className="shrink-0" title={hit.isAttended ? "İştirak etdi" : "İştirak etmədi"}>
                    {hit.isAttended ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                    )}
                </span>
            </button>

            {open && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                    {/* Meta sətri */}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 mb-4">
                        <span>Qrup: <span className="text-slate-700 font-medium">{hit.qrupNum}</span></span>
                        <span>Cins: <span className="text-slate-700">{genderLabel(hit.gender)}</span></span>
                        <span>
                            İxtisas:{" "}
                            <span className="text-slate-700">{hit.ixtisasName ?? "—"}</span>
                            <span className="font-mono ml-1">
                                {hit.kodixtisas}{hit.altNov ? ` · ${hit.altNov}` : ""}
                            </span>
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Nəticələr yüklənir…
                        </div>
                    ) : results && results.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                            <table className="table-modern">
                                <thead>
                                    <tr>
                                        <th>Hərəkət</th>
                                        <th>Ölçü</th>
                                        <th>Bal</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((r) => (
                                        <tr key={r.id}>
                                            <td className="font-mono text-xs text-slate-600">{r.exerciseCode}</td>
                                            <td className="tabular-nums text-slate-500">{r.rawValue ?? "—"}</td>
                                            <td className="tabular-nums font-semibold text-slate-900">
                                                {r.finalScore}
                                            </td>
                                            <td>
                                                {r.isRefused ? (
                                                    <span className="text-xs text-slate-400 italic">imtina</span>
                                                ) : (
                                                    <span className="text-xs text-emerald-600">qeydə alındı</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">Bu iştirak üçün nəticə tapılmadı.</p>
                    )}
                </div>
            )}
        </div>
    );
}