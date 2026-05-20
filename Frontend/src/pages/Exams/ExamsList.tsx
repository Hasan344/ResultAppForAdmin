import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Calendar,
  Building2,
  Users2,
  ArrowRight,
  Search,
  FilterX,
  Inbox
} from "lucide-react";
import { api } from "../../api/client";
import type { ExamListItem, Commission } from "../../types";
import {
  PageHeader,
  EmptyState,
  Skeleton
} from "../../components/ui";
import { formatDate } from "../../lib/format";
import { useSection } from "../../context/SectionContext";

export default function ExamsList() {
  const { sectionId } = useSection();
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [filter, setFilter] = useState({ commissionNo: "", from: "", to: "" });
  const [loading, setLoading] = useState(true);

  // Lookup commissions filtered by section
  useEffect(() => {
    const params: Record<string, number> = {};
    if (sectionId !== null) params.sectionId = sectionId;
    api
      .get<Commission[]>("/lookup/commissions", { params })
      .then((r) => setCommissions(r.data));
    // selecting a section may invalidate previous commissionNo
    setFilter((f) => ({ ...f, commissionNo: "" }));
  }, [sectionId]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = {};
    if (filter.commissionNo) params.commissionNo = filter.commissionNo;
    if (filter.from) params.from = filter.from;
    if (filter.to) params.to = filter.to;
    if (sectionId !== null) params.sectionId = sectionId;

    api
      .get<ExamListItem[]>("/exams", { params })
      .then((r) => setExams(r.data))
      .finally(() => setLoading(false));
  }, [filter, sectionId]);

  const hasFilters = !!(filter.commissionNo || filter.from || filter.to);

  return (
    <div>
      <PageHeader
        title="İmtahanlar"
        description="Bütün imtahan komissiyalarını və tarixlərini idarə edin"
        icon={<GraduationCap className="w-6 h-6" />}
      />

      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Filtr</span>
          {hasFilters && (
            <button
              onClick={() => setFilter({ commissionNo: "", from: "", to: "" })}
              className="ml-auto text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <FilterX className="w-3.5 h-3.5" />
              Təmizlə
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Komissiya</label>
            <select
              className="input"
              value={filter.commissionNo}
              onChange={(e) =>
                setFilter({ ...filter, commissionNo: e.target.value })
              }
            >
              <option value="">Bütün komissiyalar</option>
              {commissions.map((c) => (
                <option key={c.id} value={c.commissionNo}>
                  {c.commissionNo} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Başlanğıc</label>
            <input
              type="date"
              className="input"
              value={filter.from}
              onChange={(e) => setFilter({ ...filter, from: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Son tarix</label>
            <input
              type="date"
              className="input"
              value={filter.to}
              onChange={(e) => setFilter({ ...filter, to: e.target.value })}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Inbox className="w-7 h-7" />}
            title="İmtahan tapılmadı"
            description={
              sectionId !== null
                ? "Seçdiyiniz bölmə və filtrlərə uyğun imtahan yoxdur."
                : "Seçdiyiniz filtrlərə uyğun imtahan yoxdur."
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {exams.map((e) => (
            <Link
              key={e.id}
              to={`/exams/${e.id}`}
              className="card card-hover p-5 group block"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(e.examDate)}
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
              </div>

              <h3 className="font-semibold text-slate-900 leading-snug mb-3 line-clamp-2">
                {e.name}
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{e.buildingName ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Users2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{e.studentCount ?? "—"} tələbə</span>
                </div>
                {e.sectionName && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="badge-neutral !py-0.5">
                      {e.sectionName}
                    </span>
                  </div>
                )}
              </div>

              {e.commissionNos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-100">
                  {e.commissionNos.map((c) => (
                    <span key={c} className="badge-brand">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
