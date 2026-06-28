import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { GraduationCap, Upload, Users, SlidersHorizontal, LayoutDashboard, Download, Search } from "lucide-react";
import ExamsList from "./pages/Exams/ExamsList";
import ExamDetail from "./pages/Exams/ExamDetail";
import ImportStudents from "./pages/Imports/ImportStudents";
import CommissionResults from "./pages/Commissions/CommissionResults";
import ScoringRules from "./pages/Admin/ScoringRules";
import { SectionSelector } from "./components/SectionSelector";
import ImportResults from "./pages/Imports/ImportResults";
import ExportSnapshot from "./pages/Exports/ExportSnapshot";
import StudentSearch from "./pages/Students/StudentSearch";
const navLinks = [
    { to: "/exams", label: "İmtahanlar", icon: _jsx(GraduationCap, { className: "w-[18px] h-[18px]" }) },
    { to: "/students", label: "Tələbə axtarışı", icon: _jsx(Search, { className: "w-[18px] h-[18px]" }) },
    { to: "/imports", label: "Tələbə import", icon: _jsx(Upload, { className: "w-[18px] h-[18px]" }) },
    { to: "/results-import", label: "Nəticə import", icon: _jsx(Upload, { className: "w-[18px] h-[18px]" }) },
    { to: "/export", label: "Snapshot eksport", icon: _jsx(Download, { className: "w-[18px] h-[18px]" }) },
    { to: "/commissions", label: "Komissiyalar", icon: _jsx(Users, { className: "w-[18px] h-[18px]" }) },
    {
        to: "/admin/scoring-rules",
        label: "Bal cədvəlləri",
        icon: _jsx(SlidersHorizontal, { className: "w-[18px] h-[18px]" })
    }
];
function SidebarLink({ to, label, icon }) {
    return (_jsx(NavLink, { to: to, className: ({ isActive }) => `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
            ? "bg-brand-600 text-white shadow-sm shadow-brand-600/20"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`, children: ({ isActive }) => (_jsxs(_Fragment, { children: [_jsx("span", { className: `shrink-0 transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`, children: icon }), _jsx("span", { children: label })] })) }));
}
export default function App() {
    return (_jsxs("div", { className: "min-h-screen flex bg-slate-50", children: [_jsxs("aside", { className: "hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200/70 sticky top-0 h-screen", children: [_jsx("div", { className: "px-6 py-5 border-b border-slate-100", children: _jsxs(Link, { to: "/", className: "flex items-center gap-2.5", children: [_jsx("div", { className: "w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm", children: _jsx(LayoutDashboard, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("div", { className: "font-bold text-slate-900 leading-none", children: "Qabiliyy\u0259t imtahanlar\u0131" }), _jsx("div", { className: "text-[11px] text-slate-500 mt-0.5", children: "N\u0259tic\u0259 sistemi" })] })] }) }), _jsx("div", { className: "px-3 pt-4", children: _jsx(SectionSelector, {}) }), _jsxs("nav", { className: "flex-1 px-3 py-4 space-y-1", children: [_jsx("div", { className: "px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400", children: "Naviqasiya" }), navLinks.map((l) => (_jsx(SidebarLink, { ...l }, l.to)))] })] }), _jsx("div", { className: "lg:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-slate-200/70 px-4 h-14 flex items-center justify-between", children: _jsxs(Link, { to: "/", className: "flex items-center gap-2 font-bold text-slate-900", children: [_jsx("div", { className: "w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white", children: _jsx(LayoutDashboard, { className: "w-4 h-4" }) }), "ForQab"] }) }), _jsxs("main", { className: "flex-1 min-w-0 pt-14 lg:pt-0", children: [_jsxs("div", { className: "lg:hidden bg-white border-b border-slate-200/70 p-3 space-y-2", children: [_jsx(SectionSelector, {}), _jsx("nav", { className: "flex gap-1 overflow-x-auto", children: navLinks.map((l) => (_jsxs(NavLink, { to: l.to, className: ({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${isActive
                                        ? "bg-brand-600 text-white"
                                        : "text-slate-600 hover:bg-slate-100"}`, children: [l.icon, l.label] }, l.to))) })] }), _jsx("div", { className: "max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 lg:py-8", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(ExamsList, {}) }), _jsx(Route, { path: "/exams", element: _jsx(ExamsList, {}) }), _jsx(Route, { path: "/exams/:id", element: _jsx(ExamDetail, {}) }), _jsx(Route, { path: "/students", element: _jsx(StudentSearch, {}) }), _jsx(Route, { path: "/imports", element: _jsx(ImportStudents, {}) }), _jsx(Route, { path: "/commissions", element: _jsx(CommissionResults, {}) }), _jsx(Route, { path: "/commissions/:commissionNo", element: _jsx(CommissionResults, {}) }), _jsx(Route, { path: "/admin/scoring-rules", element: _jsx(ScoringRules, {}) }), _jsx(Route, { path: "/results-import", element: _jsx(ImportResults, {}) }), _jsx(Route, { path: "/export", element: _jsx(ExportSnapshot, {}) })] }) })] })] }));
}
