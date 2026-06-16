import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Loader2 } from "lucide-react";
export function PageHeader({ title, description, icon, actions }) {
    return (_jsxs("div", { className: "flex items-start justify-between gap-4 mb-6", children: [_jsxs("div", { className: "flex items-start gap-4", children: [icon && (_jsx("div", { className: "shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center shadow-sm", children: icon })), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-slate-900 tracking-tight", children: title }), description && (_jsx("p", { className: "text-sm text-slate-500 mt-1", children: description }))] })] }), actions && _jsx("div", { className: "flex items-center gap-2", children: actions })] }));
}
export function StatCard({ label, value, icon, tone = "brand", hint }) {
    const tones = {
        brand: "from-brand-50 to-white text-brand-700 ring-brand-100",
        success: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
        danger: "from-rose-50 to-white text-rose-700 ring-rose-100",
        neutral: "from-slate-50 to-white text-slate-700 ring-slate-100",
        amber: "from-amber-50 to-white text-amber-700 ring-amber-100"
    };
    const iconBg = {
        brand: "bg-brand-100 text-brand-600",
        success: "bg-emerald-100 text-emerald-600",
        danger: "bg-rose-100 text-rose-600",
        neutral: "bg-slate-100 text-slate-600",
        amber: "bg-amber-100 text-amber-600"
    };
    return (_jsx("div", { className: `relative overflow-hidden rounded-2xl bg-gradient-to-br ${tones[tone]} ring-1 ring-inset p-5 shadow-soft`, children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-wider text-slate-500", children: label }), _jsx("div", { className: "text-3xl font-bold tabular-nums mt-2 text-slate-900", children: value }), hint && _jsx("div", { className: "text-xs text-slate-500 mt-1", children: hint })] }), icon && (_jsx("div", { className: `w-10 h-10 rounded-xl flex items-center justify-center ${iconBg[tone]}`, children: icon }))] }) }));
}
export function EmptyState({ icon, title, description }) {
    return (_jsxs("div", { className: "text-center py-16 px-4", children: [_jsx("div", { className: "mx-auto w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4", children: icon }), _jsx("h3", { className: "text-base font-semibold text-slate-900", children: title }), description && (_jsx("p", { className: "text-sm text-slate-500 mt-1 max-w-sm mx-auto", children: description }))] }));
}
export function LoadingState({ label = "Yüklənir…" }) {
    return (_jsxs("div", { className: "flex items-center justify-center gap-3 py-12 text-slate-500", children: [_jsx(Loader2, { className: "w-5 h-5 animate-spin" }), _jsx("span", { className: "text-sm", children: label })] }));
}
export function Skeleton({ className = "" }) {
    return (_jsx("div", { className: `animate-pulse bg-gradient-to-r from-slate-100 via-slate-200/60 to-slate-100 rounded-lg ${className}` }));
}
