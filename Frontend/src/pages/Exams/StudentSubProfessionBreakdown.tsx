import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, X, Loader2 } from "lucide-react";
import { api } from "../../api/client";
import type { Student } from "../../types";
import { genderLabel } from "../../lib/format";

// ── Tipler ────────────────────────────────────────────────────────────────────
// Standart nəticə sətri (/results/by-student/{id})
type StudentResultRow = {
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

// 62-ci komissiya alt-ixtisas kırılımı (/results/by-student/{id}/subprofession-breakdown)
type BreakdownCell = {
    exerciseId: number;
    rawValue: number | null;
    score: number;
    isRefused: boolean;
};

type SubProfessionScore = {
    kodixtisas: string;
    isOwn: boolean;
    cells: BreakdownCell[];
    total: number;
    isPassed: boolean;
};

type SubProfBreakdown = {
    studentId: number;
    isN: string;
    fullName: string;
    gender: number;
    ageAtExam: number;
    ownKodixtisas: string | null;
    exercises: { exerciseId: number; code: string; name: string; displayOrder: number }[];
    subProfessions: SubProfessionScore[];
};

// ── Tələbə sətri (dispatcher) ─────────────────────────────────────────────────
//   alt-ixtisaslı (62) → 3 alt-ixtisas bal kırılımı
//   digər tələbələr     → standart nəticə chip-ləri
export function StudentRow({ s }: { s: Student }) {
    const isSubProf = Boolean(s.altNov);
    const [open, setOpen] = useState(false);
    const [breakdown, setBreakdown] = useState<SubProfBreakdown | null>(null);
    const [results, setResults] = useState<StudentResultRow[] | null>(null);
    const [loading, setLoading] = useState(false);

    async function toggle() {
        const next = !open;
        setOpen(next);
        if (!next) return;

        if (isSubProf && breakdown === null) {
            setLoading(true);
            try {
                const r = await api.get<SubProfBreakdown>(
                    `/results/by-student/${s.id}/subprofession-breakdown`
                );
                setBreakdown(r.data);
            } catch {
                setBreakdown(null);
            } finally {
                setLoading(false);
            }
        } else if (!isSubProf && results === null) {
            setLoading(true);
            try {
                const r = await api.get<StudentResultRow[]>(`/results/by-student/${s.id}`);
                setResults(r.data);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }
    }

    return (
        <>
            <tr className="cursor-pointer hover:bg-slate-50" onClick={toggle}>
                <td className="text-slate-400 w-8">
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </td>
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

            {open && (
                <tr>
                    <td colSpan={8} className="bg-slate-50/60 px-5 py-4">
                        {loading ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Loader2 className="w-4 h-4 animate-spin" /> Nəticələr yüklənir…
                            </div>
                        ) : isSubProf ? (
                            breakdown ? (
                                <SubProfessionBreakdown data={breakdown} />
                            ) : (
                                <p className="text-sm text-slate-500">Məlumat yüklənmədi.</p>
                            )
                        ) : results && results.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {results.map((r) => (
                                    <div
                                        key={r.id}
                                        className="rounded-lg bg-white ring-1 ring-slate-200 px-3 py-2 text-xs"
                                    >
                                        <span className="font-mono text-slate-500">{r.exerciseCode}</span>
                                        <span className="mx-2 text-slate-300">·</span>
                                        <span className="text-slate-500">ölçü: {r.rawValue ?? "—"}</span>
                                        <span className="mx-2 text-slate-300">·</span>
                                        <span className="font-semibold text-slate-900">bal: {r.finalScore}</span>
                                        {r.isRefused && (
                                            <span className="ml-2 text-slate-400 italic">imtina</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">Bu tələbə üçün nəticə tapılmadı.</p>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}

// ── 3 alt-ixtisas bal cədvəli ─────────────────────────────────────────────────
function SubProfessionBreakdown({ data }: { data: SubProfBreakdown }) {
    if (data.subProfessions.length === 0) {
        return (
            <p className="text-sm text-slate-500">
                Bu komissiya üçün alt-ixtisas bal cədvəli (scoring_rules) tapılmadı.
            </p>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
                <table className="table-modern text-sm">
                    <thead>
                        <tr>
                            <th className="text-left">Hərəkət</th>
                            <th className="text-center">Ham dəyər</th>
                            {data.subProfessions.map((sp) => (
                                <th key={sp.kodixtisas} className="text-center">
                                    {sp.kodixtisas}
                                    {sp.isOwn && (
                                        <span className="text-amber-500" title="tələbənin öz alt-ixtisası"> ★</span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.exercises.map((ex) => {
                            const anyCell = data.subProfessions[0]?.cells.find((c) => c.exerciseId === ex.exerciseId);
                            return (
                                <tr key={ex.exerciseId}>
                                    <td className="font-medium text-slate-700">{ex.name}</td>
                                    <td className="text-center tabular-nums text-slate-500">
                                        {anyCell?.isRefused ? "imtina" : (anyCell?.rawValue ?? "—")}
                                    </td>
                                    {data.subProfessions.map((sp) => {
                                        const c = sp.cells.find((x) => x.exerciseId === ex.exerciseId);
                                        return (
                                            <td key={sp.kodixtisas} className="text-center tabular-nums">
                                                <span className="badge-brand">{c?.score ?? 0}</span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}

                        {/* Cəmi */}
                        <tr className="border-t-2 border-slate-200">
                            <td className="font-semibold text-slate-900">Cəmi</td>
                            <td />
                            {data.subProfessions.map((sp) => (
                                <td key={sp.kodixtisas} className="text-center font-bold tabular-nums text-slate-900">
                                    {sp.total}
                                </td>
                            ))}
                        </tr>

                        {/* Nəticə */}
                        <tr>
                            <td className="font-semibold text-slate-900">Nəticə</td>
                            <td />
                            {data.subProfessions.map((sp) => (
                                <td key={sp.kodixtisas} className="text-center">
                                    {sp.isPassed ? (
                                        <span className="badge-success">
                                            <CheckCircle2 className="w-3 h-3" />Məqbul
                                        </span>
                                    ) : (
                                        <span className="badge-danger">
                                            <X className="w-3 h-3" />Qeyri-məqbul
                                        </span>
                                    )}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
                ★ tələbənin öz alt-ixtisası ({data.ownKodixtisas ?? "—"}). Keçid həddi: ≥ 24 bal.
                Ballar ham dəyərlərdən hər alt-ixtisas üçün ayrıca hesablanır.
            </div>
        </div>
    );
}