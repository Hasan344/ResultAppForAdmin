import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Layers, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSection } from "../context/SectionContext";
export function SectionSelector() {
    const { sections, sectionId, setSectionId, loading } = useSection();
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    useEffect(() => {
        function onDocClick(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);
    const current = sections.find((s) => s.id === sectionId);
    const label = current?.name ?? "Bütün bölmələr";
    return (_jsxs("div", { ref: wrapRef, className: "relative", children: [_jsxs("button", { onClick: () => setOpen((o) => !o), disabled: loading, className: "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-left disabled:opacity-60", children: [_jsx("div", { className: "w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0", children: _jsx(Layers, { className: "w-4 h-4" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: "Aktiv b\u00F6lm\u0259" }), _jsx("div", { className: "text-sm font-semibold text-slate-900 truncate", children: loading ? "Yüklənir…" : label })] }), _jsx("svg", { width: "12", height: "12", viewBox: "0 0 12 12", className: "text-slate-400 shrink-0", children: _jsx("path", { d: "M3 5l3 3 3-3", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) })] }), open && (_jsxs("div", { className: "absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto", children: [_jsxs("button", { onClick: () => {
                            setSectionId(null);
                            setOpen(false);
                        }, className: `w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${sectionId === null ? "bg-brand-50/50" : ""}`, children: [_jsx("span", { className: sectionId === null ? "font-semibold text-brand-700" : "", children: "B\u00FCt\u00FCn b\u00F6lm\u0259l\u0259r" }), sectionId === null && (_jsx(Check, { className: "w-4 h-4 text-brand-600 shrink-0" }))] }), _jsx("div", { className: "h-px bg-slate-100" }), sections.map((s) => {
                        const active = s.id === sectionId;
                        return (_jsxs("button", { onClick: () => {
                                setSectionId(s.id);
                                setOpen(false);
                            }, className: `w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${active ? "bg-brand-50/50" : ""}`, children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: `truncate ${active ? "font-semibold text-brand-700" : "text-slate-700"}`, children: s.name }), s.sectCode && (_jsx("div", { className: "text-[10px] text-slate-400 font-mono", children: s.sectCode }))] }), active && (_jsx(Check, { className: "w-4 h-4 text-brand-600 shrink-0" }))] }, s.id));
                    })] }))] }));
}
