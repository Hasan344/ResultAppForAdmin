import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, X, Loader2 } from "lucide-react";
import { api } from "../../api/client";
import { genderLabel } from "../../lib/format";
// ── Tələbə sətri (dispatcher) ─────────────────────────────────────────────────
//   alt-ixtisaslı (62) → 3 alt-ixtisas bal kırılımı
//   digər tələbələr     → standart nəticə chip-ləri
export function StudentRow({ s }) {
    const isSubProf = Boolean(s.altNov);
    const [open, setOpen] = useState(false);
    const [breakdown, setBreakdown] = useState(null);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    async function toggle() {
        const next = !open;
        setOpen(next);
        if (!next)
            return;
        if (isSubProf && breakdown === null) {
            setLoading(true);
            try {
                const r = await api.get(`/results/by-student/${s.id}/subprofession-breakdown`);
                setBreakdown(r.data);
            }
            catch {
                setBreakdown(null);
            }
            finally {
                setLoading(false);
            }
        }
        else if (!isSubProf && results === null) {
            setLoading(true);
            try {
                const r = await api.get(`/results/by-student/${s.id}`);
                setResults(r.data);
            }
            catch {
                setResults([]);
            }
            finally {
                setLoading(false);
            }
        }
    }
    return (_jsxs(_Fragment, { children: [_jsxs("tr", { className: "cursor-pointer hover:bg-slate-50", onClick: toggle, children: [_jsx("td", { className: "text-slate-400 w-8", children: open ? _jsx(ChevronDown, { className: "w-4 h-4" }) : _jsx(ChevronRight, { className: "w-4 h-4" }) }), _jsx("td", { className: "tabular-nums font-medium", children: s.qrupNum }), _jsx("td", { className: "tabular-nums text-slate-500", children: s.sNomer ?? "—" }), _jsx("td", { className: "tabular-nums font-mono text-xs text-slate-500", children: s.isN }), _jsxs("td", { className: "font-medium text-slate-900", children: [s.surname, " ", s.name, " ", _jsx("span", { className: "text-slate-500 font-normal", children: s.fatherName })] }), _jsx("td", { children: genderLabel(s.gender) }), _jsxs("td", { children: [_jsx("div", { className: "text-slate-700", children: s.ixtisasName }), _jsxs("div", { className: "text-xs text-slate-500 font-mono", children: [s.kodixtisas, s.altNov ? ` · ${s.altNov}` : ""] })] }), _jsx("td", { children: s.isAttended ? (_jsxs("span", { className: "badge-success", children: [_jsx(CheckCircle2, { className: "w-3.5 h-3.5" }), "\u0130\u015Ftirak etdi"] })) : (_jsxs("span", { className: "badge-neutral", children: [_jsx(Circle, { className: "w-3.5 h-3.5" }), "Qeyd yox"] })) })] }), open && (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "bg-slate-50/60 px-5 py-4", children: loading ? (_jsxs("div", { className: "flex items-center gap-2 text-sm text-slate-500", children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), " N\u0259tic\u0259l\u0259r y\u00FCkl\u0259nir\u2026"] })) : isSubProf ? (breakdown ? (_jsx(SubProfessionBreakdown, { data: breakdown })) : (_jsx("p", { className: "text-sm text-slate-500", children: "M\u0259lumat y\u00FCkl\u0259nm\u0259di." }))) : results && results.length > 0 ? (_jsx("div", { className: "flex flex-wrap gap-2", children: results.map((r) => (_jsxs("div", { className: "rounded-lg bg-white ring-1 ring-slate-200 px-3 py-2 text-xs", children: [_jsx("span", { className: "font-mono text-slate-500", children: r.exerciseCode }), _jsx("span", { className: "mx-2 text-slate-300", children: "\u00B7" }), _jsxs("span", { className: "text-slate-500", children: ["\u00F6l\u00E7\u00FC: ", r.rawValue ?? "—"] }), _jsx("span", { className: "mx-2 text-slate-300", children: "\u00B7" }), _jsxs("span", { className: "font-semibold text-slate-900", children: ["bal: ", r.finalScore] }), r.isRefused && (_jsx("span", { className: "ml-2 text-slate-400 italic", children: "imtina" }))] }, r.id))) })) : (_jsx("p", { className: "text-sm text-slate-500", children: "Bu t\u0259l\u0259b\u0259 \u00FC\u00E7\u00FCn n\u0259tic\u0259 tap\u0131lmad\u0131." })) }) }))] }));
}
// ── 3 alt-ixtisas bal cədvəli ─────────────────────────────────────────────────
function SubProfessionBreakdown({ data }) {
    if (data.subProfessions.length === 0) {
        return (_jsx("p", { className: "text-sm text-slate-500", children: "Bu komissiya \u00FC\u00E7\u00FCn alt-ixtisas bal c\u0259dv\u0259li (scoring_rules) tap\u0131lmad\u0131." }));
    }
    return (_jsxs("div", { className: "rounded-xl border border-slate-200 bg-white overflow-hidden", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "table-modern text-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "text-left", children: "H\u0259r\u0259k\u0259t" }), _jsx("th", { className: "text-center", children: "Ham d\u0259y\u0259r" }), data.subProfessions.map((sp) => (_jsxs("th", { className: "text-center", children: [sp.kodixtisas, sp.isOwn && (_jsx("span", { className: "text-amber-500", title: "t\u0259l\u0259b\u0259nin \u00F6z alt-ixtisas\u0131", children: " \u2605" }))] }, sp.kodixtisas)))] }) }), _jsxs("tbody", { children: [data.exercises.map((ex) => {
                                    const anyCell = data.subProfessions[0]?.cells.find((c) => c.exerciseId === ex.exerciseId);
                                    return (_jsxs("tr", { children: [_jsx("td", { className: "font-medium text-slate-700", children: ex.name }), _jsx("td", { className: "text-center tabular-nums text-slate-500", children: anyCell?.isRefused ? "imtina" : (anyCell?.rawValue ?? "—") }), data.subProfessions.map((sp) => {
                                                const c = sp.cells.find((x) => x.exerciseId === ex.exerciseId);
                                                return (_jsx("td", { className: "text-center tabular-nums", children: _jsx("span", { className: "badge-brand", children: c?.score ?? 0 }) }, sp.kodixtisas));
                                            })] }, ex.exerciseId));
                                }), _jsxs("tr", { className: "border-t-2 border-slate-200", children: [_jsx("td", { className: "font-semibold text-slate-900", children: "C\u0259mi" }), _jsx("td", {}), data.subProfessions.map((sp) => (_jsx("td", { className: "text-center font-bold tabular-nums text-slate-900", children: sp.total }, sp.kodixtisas)))] }), _jsxs("tr", { children: [_jsx("td", { className: "font-semibold text-slate-900", children: "N\u0259tic\u0259" }), _jsx("td", {}), data.subProfessions.map((sp) => (_jsx("td", { className: "text-center", children: sp.isPassed ? (_jsxs("span", { className: "badge-success", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), "M\u0259qbul"] })) : (_jsxs("span", { className: "badge-danger", children: [_jsx(X, { className: "w-3 h-3" }), "Qeyri-m\u0259qbul"] })) }, sp.kodixtisas)))] })] })] }) }), _jsxs("div", { className: "px-4 py-2 text-xs text-slate-400 border-t border-slate-100", children: ["\u2605 t\u0259l\u0259b\u0259nin \u00F6z alt-ixtisas\u0131 (", data.ownKodixtisas ?? "—", "). Ke\u00E7id h\u0259ddi: \u2265 24 bal. Ballar ham d\u0259y\u0259rl\u0259rd\u0259n h\u0259r alt-ixtisas \u00FC\u00E7\u00FCn ayr\u0131ca hesablan\u0131r."] })] }));
}
