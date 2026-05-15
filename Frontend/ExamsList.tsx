import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { ExamListItem, Commission } from "../../types";

export default function ExamsList() {
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [filter, setFilter] = useState({ commissionNo: "", from: "", to: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Commission[]>("/lookup/commissions").then((r) => setCommissions(r.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filter).filter(([, v]) => v));
    api
      .get<ExamListItem[]>("/exams", { params })
      .then((r) => setExams(r.data))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">İmtahanlar</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
        <select
          className="border rounded-md px-3 py-1.5 text-sm"
          value={filter.commissionNo}
          onChange={(e) => setFilter({ ...filter, commissionNo: e.target.value })}
        >
          <option value="">Bütün komissiyalar</option>
          {commissions.map((c) => (
            <option key={c.id} value={c.commissionNo}>
              {c.commissionNo} — {c.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="border rounded-md px-3 py-1.5 text-sm"
          value={filter.from}
          onChange={(e) => setFilter({ ...filter, from: e.target.value })}
        />
        <input
          type="date"
          className="border rounded-md px-3 py-1.5 text-sm"
          value={filter.to}
          onChange={(e) => setFilter({ ...filter, to: e.target.value })}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Tarix</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Ad</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Bina</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Komissiyalar</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Tələbə sayı</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Yüklənir…</td></tr>
            )}
            {!loading && exams.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">İmtahan tapılmadı</td></tr>
            )}
            {exams.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{e.examDate}</td>
                <td className="px-4 py-2 font-medium">{e.name}</td>
                <td className="px-4 py-2 text-gray-600">{e.buildingName ?? "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1 flex-wrap">
                    {e.commissionNos.map((c) => (
                      <span key={c} className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{e.studentCount ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  <Link to={`/exams/${e.id}`} className="text-brand-700 hover:underline">
                    Detay →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
