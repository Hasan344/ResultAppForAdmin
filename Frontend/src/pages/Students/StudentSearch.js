import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { Search, Users2, Loader2, ChevronDown, ChevronRight, CalendarDays, Hash, CheckCircle2, Circle, AlertCircle, } from "lucide-react";
import { api } from "../../api/client";
import { PageHeader, EmptyState } from "../../components/ui";
import { formatDate, genderLabel } from "../../lib/format";
import { useSection } from "../../context/SectionContext";
const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 " +
    "focus:border-brand-400 transition";
export default function StudentSearch() {
    const { sectionId } = useSection();
    const [q, setQ] = useState("");
    const [hits, setHits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState(null);
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
                const params = { q: term };
                if (sectionId !== null)
                    params.sectionId = sectionId;
                const r = await api.get("/students/search", { params });
                setHits(r.data);
                setSearched(true);
            }
            catch (err) {
                setError(err.displayMessage ?? "Bilinməyən xəta");
            }
            finally {
                setLoading(false);
            }
        }, 350);
        return () => clearTimeout(handle);
    }, [q, sectionId]);
    return (_jsxs(_Fragment, { children: [_jsx(PageHeader, { title: "T\u0259l\u0259b\u0259 axtar\u0131\u015F\u0131", description: "\u00DCmumi bazadan ad, soyad v\u0259 ya i\u015F \u2116 \u00FCzr\u0259 t\u0259l\u0259b\u0259 tap; i\u015Ftirak etdiyi imtahanlar\u0131 v\u0259 n\u0259tic\u0259l\u0259rini g\u00F6r.", icon: _jsx(Users2, { className: "w-6 h-6" }) }), _jsxs("div", { className: "rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-soft p-6 mb-6", children: [_jsx("label", { className: "block text-xs font-medium text-slate-600 mb-1.5", children: "Ad, soyad v\u0259 ya i\u015F \u2116" }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" }), _jsx("input", { className: inputCls + " pl-9", placeholder: "\u0259n az\u0131 2 simvol\u2026", value: q, onChange: (e) => setQ(e.target.value), autoFocus: true }), loading && (_jsx(Loader2, { className: "w-4 h-4 text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" }))] }), _jsxs("p", { className: "text-xs text-slate-500 mt-2", children: [sectionId !== null
                                ? `Axtarış cari bölmə ilə məhdudlaşır (bölmə: ${sectionId}).`
                                : "Bölmə seçilməyib — bütün bölmələrdə axtarılır.", " ", "Maksimum 100 n\u0259tic\u0259 g\u00F6st\u0259rilir."] })] }), error && (_jsxs("div", { className: "rounded-2xl bg-rose-50 ring-1 ring-rose-100 p-4 mb-6 flex items-start gap-3", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-rose-500 shrink-0 mt-0.5" }), _jsx("div", { className: "text-sm text-rose-700", children: error })] })), searched && hits.length === 0 && !loading ? (_jsx("div", { className: "rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-soft p-6", children: _jsx(EmptyState, { icon: _jsx(Search, { className: "w-7 h-7" }), title: "N\u0259tic\u0259 tap\u0131lmad\u0131", description: "Ba\u015Fqa ad, soyad v\u0259 ya i\u015F \u2116 il\u0259 yoxlay\u0131n." }) })) : hits.length > 0 ? (_jsxs("div", { className: "space-y-2.5", children: [_jsxs("div", { className: "text-xs text-slate-500 px-1", children: [hits.length, " n\u0259tic\u0259"] }), hits.map((h) => (_jsx(StudentHitCard, { hit: h }, `${h.id}`)))] })) : null] }));
}
// ── Tək tələbə-iştirak sətri (açılıb nəticələri göstərir) ─────────────────────
function StudentHitCard({ hit }) {
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    async function toggle() {
        const next = !open;
        setOpen(next);
        if (next && results === null) {
            setLoading(true);
            try {
                const r = await api.get(`/results/by-student/${hit.id}`);
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
    return (_jsxs("div", { className: "rounded-xl border border-slate-100 bg-white", children: [_jsxs("button", { onClick: toggle, className: "w-full flex items-center gap-3 px-5 py-3.5 text-left", children: [_jsx("span", { className: "text-slate-400", children: open ? _jsx(ChevronDown, { className: "w-4 h-4" }) : _jsx(ChevronRight, { className: "w-4 h-4" }) }), _jsx("span", { className: "font-mono text-xs text-slate-500 w-16 shrink-0", children: hit.isN }), _jsxs("span", { className: "font-semibold text-slate-900 flex-1 min-w-0 truncate", children: [hit.surname, " ", hit.name, " ", _jsx("span", { className: "text-slate-500 font-normal", children: hit.fatherName })] }), _jsxs("span", { className: "hidden sm:inline-flex items-center gap-1 text-xs text-slate-500", children: [_jsx(CalendarDays, { className: "w-3.5 h-3.5" }), formatDate(hit.examDate)] }), _jsx("span", { className: "hidden md:inline text-xs text-slate-600 max-w-[180px] truncate", children: hit.examName ?? `İmtahan #${hit.examId}` }), hit.commissionNo && (_jsxs("span", { className: "badge-brand shrink-0", children: [_jsx(Hash, { className: "w-3 h-3" }), hit.commissionNo] })), _jsx("span", { className: "shrink-0", title: hit.isAttended ? "İştirak etdi" : "İştirak etmədi", children: hit.isAttended ? (_jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-500" })) : (_jsx(Circle, { className: "w-4 h-4 text-slate-300" })) })] }), open && (_jsxs("div", { className: "px-5 pb-5 border-t border-slate-100 pt-4", children: [_jsxs("div", { className: "flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 mb-4", children: [_jsxs("span", { children: ["Qrup: ", _jsx("span", { className: "text-slate-700 font-medium", children: hit.qrupNum })] }), _jsxs("span", { children: ["Cins: ", _jsx("span", { className: "text-slate-700", children: genderLabel(hit.gender) })] }), _jsxs("span", { children: ["\u0130xtisas:", " ", _jsx("span", { className: "text-slate-700", children: hit.ixtisasName ?? "—" }), _jsxs("span", { className: "font-mono ml-1", children: [hit.kodixtisas, hit.altNov ? ` · ${hit.altNov}` : ""] })] })] }), loading ? (_jsxs("div", { className: "flex items-center gap-2 text-sm text-slate-500 py-2", children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), " N\u0259tic\u0259l\u0259r y\u00FCkl\u0259nir\u2026"] })) : results && results.length > 0 ? (_jsx("div", { className: "overflow-x-auto rounded-xl border border-slate-100", children: _jsxs("table", { className: "table-modern", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "H\u0259r\u0259k\u0259t" }), _jsx("th", { children: "\u00D6l\u00E7\u00FC" }), _jsx("th", { children: "Bal" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: results.map((r) => (_jsxs("tr", { children: [_jsx("td", { className: "font-mono text-xs text-slate-600", children: r.exerciseCode }), _jsx("td", { className: "tabular-nums text-slate-500", children: r.rawValue ?? "—" }), _jsx("td", { className: "tabular-nums font-semibold text-slate-900", children: r.finalScore }), _jsx("td", { children: r.isRefused ? (_jsx("span", { className: "text-xs text-slate-400 italic", children: "imtina" })) : (_jsx("span", { className: "text-xs text-emerald-600", children: "qeyd\u0259 al\u0131nd\u0131" })) })] }, r.id))) })] }) })) : (_jsx("p", { className: "text-sm text-slate-500", children: "Bu i\u015Ftirak \u00FC\u00E7\u00FCn n\u0259tic\u0259 tap\u0131lmad\u0131." }))] }))] }));
}
