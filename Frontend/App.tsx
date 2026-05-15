import { Link, NavLink, Route, Routes } from "react-router-dom";
import ExamsList from "./pages/Exams/ExamsList";
import ExamDetail from "./pages/Exams/ExamDetail";
import ImportStudents from "./pages/Imports/ImportStudents";
import CommissionResults from "./pages/Commissions/CommissionResults";
import ScoringRules from "./pages/Admin/ScoringRules";

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 rounded-md text-sm font-medium ${
          isActive ? "bg-brand-700 text-white" : "text-gray-700 hover:bg-gray-200"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-brand-700">
            ForQab
          </Link>
          <nav className="flex items-center gap-1">
            <NavItem to="/exams">İmtahanlar</NavItem>
            <NavItem to="/imports">Import</NavItem>
            <NavItem to="/commissions">Komissiyalar</NavItem>
            <NavItem to="/admin/scoring-rules">Bal cədvəlləri</NavItem>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<ExamsList />} />
          <Route path="/exams" element={<ExamsList />} />
          <Route path="/exams/:id" element={<ExamDetail />} />
          <Route path="/imports" element={<ImportStudents />} />
          <Route path="/commissions" element={<CommissionResults />} />
          <Route path="/commissions/:commissionNo" element={<CommissionResults />} />
          <Route path="/admin/scoring-rules" element={<ScoringRules />} />
        </Routes>
      </main>
    </div>
  );
}
