import { Link, NavLink, Route, Routes } from "react-router-dom";
import {
  GraduationCap,
  Upload,
  Users,
  SlidersHorizontal,
    LayoutDashboard,
    Download
} from "lucide-react";
import type { ReactNode } from "react";

import ExamsList from "./pages/Exams/ExamsList";
import ExamDetail from "./pages/Exams/ExamDetail";
import ImportStudents from "./pages/Imports/ImportStudents";
import CommissionResults from "./pages/Commissions/CommissionResults";
import ScoringRules from "./pages/Admin/ScoringRules";
import { SectionSelector } from "./components/SectionSelector";
import ImportResults from "./pages/Imports/ImportResults";
import ExportSnapshot from "./pages/Exports/ExportSnapshot";

type NavLinkItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

const navLinks: NavLinkItem[] = [
    { to: "/exams", label: "İmtahanlar", icon: <GraduationCap className="w-[18px] h-[18px]" /> },
    { to: "/imports", label: "Tələbə import", icon: <Upload className="w-[18px] h-[18px]" /> },       
    { to: "/results-import", label: "Nəticə import", icon: <Upload className="w-[18px] h-[18px]" /> },
    { to: "/export", label: "Snapshot eksport", icon: <Download className="w-[18px] h-[18px]" /> },
  { to: "/commissions", label: "Komissiyalar", icon: <Users className="w-[18px] h-[18px]" /> },
  {
    to: "/admin/scoring-rules",
    label: "Bal cədvəlləri",
    icon: <SlidersHorizontal className="w-[18px] h-[18px]" />
  }
];

function SidebarLink({ to, label, icon }: NavLinkItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? "bg-brand-600 text-white shadow-sm shadow-brand-600/20"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`shrink-0 transition-colors ${
              isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
            }`}
          >
            {icon}
          </span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200/70 sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-none">Qabiliyyət imtahanları</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Nəticə sistemi</div>
            </div>
          </Link>
        </div>

        {/* Global section selector */}
        <div className="px-3 pt-4">
          <SectionSelector />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Naviqasiya
          </div>
          {navLinks.map((l) => (
            <SidebarLink key={l.to} {...l} />
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-100">
          <div className="text-[11px] text-slate-400 text-center">
            ResultsApp · v0.2
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-slate-200/70 px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          ForQab
        </Link>
      </div>

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        {/* Mobile nav + section selector */}
        <div className="lg:hidden bg-white border-b border-slate-200/70 p-3 space-y-2">
          <SectionSelector />
          <nav className="flex gap-1 overflow-x-auto">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {l.icon}
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 lg:py-8">
          <Routes>
            <Route path="/" element={<ExamsList />} />
            <Route path="/exams" element={<ExamsList />} />
            <Route path="/exams/:id" element={<ExamDetail />} />
            <Route path="/imports" element={<ImportStudents />} />
            <Route path="/commissions" element={<CommissionResults />} />
            <Route path="/commissions/:commissionNo" element={<CommissionResults />} />
            <Route path="/admin/scoring-rules" element={<ScoringRules />} />
            <Route path="/results-import" element={<ImportResults />} />
            <Route path="/export" element={<ExportSnapshot />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
