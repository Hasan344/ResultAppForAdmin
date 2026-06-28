import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, Plus, Pencil, Trash2, X, Save, Inbox } from "lucide-react";
import { api } from "../../api/client";
import { PageHeader, EmptyState, LoadingState } from "../../components/ui";
import { genderLabel } from "../../lib/format";
import { useSection } from "../../context/SectionContext";
export default function ScoringRules() {
    const { sectionId } = useSection();
    const [commissions, setCommissions] = useState([]);
    const [exercises, setExercises] = useState([]);
    const [filter, setFilter] = useState({ commissionNo: "", exerciseId: "", gender: "" });
    const [rules, setRules] = useState([]);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(false);
    // ── Section dəyişdikdə: exercises-i yenidən yüklə ────────────────────────
    // section_id = null olanlar hər bölmədə görünür;
    // section_id dolu olanlar yalnız həmin bölmədə görünür.
    useEffect(() => {
        const params = {};
        if (sectionId !== null)
            params.sectionId = sectionId;
        api.get("/lookup/exercises", { params })
            .then((r) => setExercises(r.data));
    }, [sectionId]);
    // ── Section dəyişdikdə: commissions-ı yenidən yüklə, commission filtrini sıfırla ──
    useEffect(() => {
        const params = {};
        if (sectionId !== null)
            params.sectionId = sectionId;
        api.get("/lookup/commissions", { params })
            .then((r) => setCommissions(r.data));
        setFilter((f) => ({ ...f, commissionNo: "" }));
    }, [sectionId]);
    // ── Filtrlər dəyişdikdə: qaydaları yüklə ────────────────────────────────────
    useEffect(() => {
        setLoading(true);
        const params = {};
        if (filter.commissionNo)
            params.commissionNo = filter.commissionNo;
        if (filter.exerciseId)
            params.exerciseId = filter.exerciseId;
        if (filter.gender)
            params.gender = filter.gender;
        if (sectionId !== null)
            params.sectionId = sectionId;
        api.get("/scoringrules", { params })
            .then((r) => setRules(r.data))
            .finally(() => setLoading(false));
    }, [filter, sectionId]);
    const grouped = useMemo(() => {
        const map = new Map();
        for (const r of rules.filter((x) => x.isActive)) {
            const key = `${r.commissionNo}|${r.kodixtisas ?? "-"}|${r.exerciseCode}|${r.gender}|${r.ageMin}-${r.ageMax}`;
            const arr = map.get(key) ?? [];
            arr.push(r);
            map.set(key, arr);
        }
        return [...map.entries()].map(([key, arr]) => ({
            key,
            head: arr[0],
            items: arr.sort((a, b) => b.score - a.score)
        }));
    }, [rules]);
    async function save(r) {
        const payload = {
            commissionNo: r.commissionNo,
            kodixtisas: r.kodixtisas,
            exerciseId: r.exerciseId,
            gender: r.gender,
            ageMin: r.ageMin,
            ageMax: r.ageMax,
            threshold: r.threshold,
            score: r.score
        };
        if (r.id === 0) {
            const { data } = await api.post("/scoringrules", payload);
            setRules([...rules, data]);
        }
        else {
            await api.put(`/scoringrules/${r.id}`, payload);
            setRules(rules.map((x) => (x.id === r.id ? r : x)));
        }
        setEditing(null);
    }
    async function remove(id) {
        if (!confirm("Bu qaydanı deaktiv etmək istəyirsiniz?"))
            return;
        await api.delete(`/scoringrules/${id}`);
        setRules(rules.map((x) => (x.id === id ? { ...x, isActive: false } : x)));
    }
    function startNew() {
        setEditing({
            id: 0,
            commissionNo: filter.commissionNo || commissions[0]?.commissionNo || "",
            kodixtisas: null,
            exerciseId: filter.exerciseId ? Number(filter.exerciseId) : exercises[0]?.id ?? 0,
            exerciseCode: filter.exerciseId
                ? (exercises.find((e) => e.id === Number(filter.exerciseId))?.code ?? "")
                : (exercises[0]?.code ?? ""),
            gender: filter.gender ? Number(filter.gender) : 1,
            ageMin: 16,
            ageMax: 25,
            threshold: 0,
            score: 6,
            isActive: true
        });
    }
    return (_jsxs("div", { children: [_jsx(PageHeader, { title: "Normativl\u0259r", description: "Komissiya, cins v\u0259 ya\u015F aral\u0131\u011F\u0131na g\u00F6r\u0259 normativl\u0259ri idar\u0259 edin", icon: _jsx(SlidersHorizontal, { className: "w-6 h-6" }), actions: _jsxs("button", { onClick: startNew, className: "btn-primary", children: [_jsx(Plus, { className: "w-4 h-4" }), " Yeni qayda"] }) }), _jsx("div", { className: "card p-4 mb-6", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "label", children: "Komissiya" }), _jsxs("select", { value: filter.commissionNo, onChange: (e) => setFilter({ ...filter, commissionNo: e.target.value }), className: "input", children: [_jsx("option", { value: "", children: sectionId !== null ? "Bu bölmənin komissiyaları" : "Hamısı" }), commissions.map((c) => (_jsxs("option", { value: c.commissionNo, children: [c.commissionNo, " \u2014 ", c.name] }, c.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "H\u0259r\u0259k\u0259t" }), _jsxs("select", { value: filter.exerciseId, onChange: (e) => setFilter({ ...filter, exerciseId: e.target.value }), className: "input", children: [_jsx("option", { value: "", children: "Ham\u0131s\u0131" }), exercises.map((e) => (_jsx("option", { value: e.id, children: e.name }, e.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Cins" }), _jsxs("select", { value: filter.gender, onChange: (e) => setFilter({ ...filter, gender: e.target.value }), className: "input", children: [_jsx("option", { value: "", children: "Ham\u0131s\u0131" }), _jsx("option", { value: "1", children: "Ki\u015Fi" }), _jsx("option", { value: "2", children: "Qad\u0131n" })] })] })] }) }), loading ? (_jsx("div", { className: "card", children: _jsx(LoadingState, {}) })) : grouped.length === 0 ? (_jsx("div", { className: "card", children: _jsx(EmptyState, { icon: _jsx(Inbox, { className: "w-7 h-7" }), title: "Qayda tap\u0131lmad\u0131", description: sectionId !== null
                        ? "Bu bölmə üçün aktiv qayda yoxdur."
                        : "Bu filtrlərə uyğun aktiv qayda yoxdur." }) })) : (_jsx("div", { className: "space-y-4", children: grouped.map((g) => (_jsxs("div", { className: "card overflow-hidden", children: [_jsxs("div", { className: "px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center gap-2", children: [_jsxs("span", { className: "badge-brand", children: ["Komissiya ", g.head.commissionNo] }), g.head.kodixtisas && (_jsx("span", { className: "badge-neutral font-mono", children: g.head.kodixtisas })), _jsx("span", { className: "badge-neutral", children: exercises.find((e) => e.code === g.head.exerciseCode)?.name ?? g.head.exerciseCode }), _jsx("span", { className: "badge-neutral", children: genderLabel(g.head.gender) }), _jsxs("span", { className: "badge-neutral", children: [g.head.ageMin, "\u2013", g.head.ageMax, " ya\u015F"] })] }), _jsxs("table", { className: "table-modern", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "H\u0259dd" }), _jsx("th", { children: "Bal" }), _jsx("th", { className: "text-right", children: "\u018Fm\u0259liyyat" })] }) }), _jsx("tbody", { children: g.items.map((item) => (_jsxs("tr", { children: [_jsx("td", { className: "tabular-nums font-mono", children: item.threshold }), _jsx("td", { children: _jsx("span", { className: "badge-brand", children: item.score }) }), _jsx("td", { className: "text-right", children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { onClick: () => setEditing(item), className: "btn-ghost btn-xs", children: _jsx(Pencil, { className: "w-3.5 h-3.5" }) }), _jsx("button", { onClick: () => remove(item.id), className: "btn-ghost btn-xs text-rose-500 hover:text-rose-700", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) })] }) })] }, item.id))) })] })] }, g.key))) })), editing && (_jsx("div", { className: "fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "card w-full max-w-md", children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-4 border-b border-slate-100", children: [_jsx("h2", { className: "font-semibold text-slate-900", children: editing.id === 0 ? "Yeni qayda" : "Qaydanı düzənlə" }), _jsx("button", { onClick: () => setEditing(null), className: "btn-ghost btn-sm", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "p-5 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "label", children: "Komissiya" }), _jsx("select", { value: editing.commissionNo, onChange: (e) => setEditing({ ...editing, commissionNo: e.target.value }), className: "input", children: commissions.map((c) => (_jsxs("option", { value: c.commissionNo, children: [c.commissionNo, " \u2014 ", c.name] }, c.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Alt-ixtisas (bo\u015F = ham\u0131s\u0131)" }), _jsx("input", { className: "input", value: editing.kodixtisas ?? "", onChange: (e) => setEditing({ ...editing, kodixtisas: e.target.value || null }), placeholder: "UFH / ABT / KSI (bo\u015F burax\u0131n = ham\u0131s\u0131)" })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "H\u0259r\u0259k\u0259t" }), _jsx("select", { value: editing.exerciseId, onChange: (e) => {
                                                const id = Number(e.target.value);
                                                const ex = exercises.find((x) => x.id === id);
                                                setEditing({ ...editing, exerciseId: id, exerciseCode: ex?.code ?? "" });
                                            }, className: "input", children: exercises.map((e) => (_jsx("option", { value: e.id, children: e.name }, e.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Cins" }), _jsxs("select", { value: editing.gender, onChange: (e) => setEditing({ ...editing, gender: Number(e.target.value) }), className: "input", children: [_jsx("option", { value: 1, children: "Ki\u015Fi" }), _jsx("option", { value: 2, children: "Qad\u0131n" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "label", children: "Ya\u015F (min)" }), _jsx("input", { type: "number", className: "input", value: editing.ageMin, onChange: (e) => setEditing({ ...editing, ageMin: Number(e.target.value) }) })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Ya\u015F (max)" }), _jsx("input", { type: "number", className: "input", value: editing.ageMax, onChange: (e) => setEditing({ ...editing, ageMax: Number(e.target.value) }) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "label", children: "H\u0259dd (threshold)" }), _jsx("input", { type: "number", step: "0.01", className: "input", value: editing.threshold, onChange: (e) => setEditing({ ...editing, threshold: Number(e.target.value) }) })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Bal (6\u201310)" }), _jsx("input", { type: "number", min: 6, max: 10, className: "input", value: editing.score, onChange: (e) => setEditing({ ...editing, score: Number(e.target.value) }) })] })] })] }), _jsxs("div", { className: "flex gap-3 px-5 pb-5", children: [_jsxs("button", { onClick: () => save(editing), className: "btn-primary flex-1", children: [_jsx(Save, { className: "w-4 h-4" }), " Yadda saxla"] }), _jsx("button", { onClick: () => setEditing(null), className: "btn-secondary", children: "L\u0259\u011Fv et" })] })] }) }))] }));
}
