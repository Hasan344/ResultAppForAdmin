import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type {
  Commission, CommissionResultsResponse, ExamListItem
} from "../../types";

export default function CommissionResults() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [commissionNo, setCommissionNo] = useState("");
  const [examId, setExamId] = useState<number | null>(null);
  const [qrupNum, setQrupNum] = useState("");
  const [data, setData] = useState<CommissionResultsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<Commission[]>("/lookup/commissions").then((r) => setCommissions(r.data));
  }, []);

  useEffect(() => {
    if (!commissionNo) { setExams([]); setExamId(null); return; }
    api.get<ExamListItem[]>(`/exams?commissionNo=${commissionNo}`).then((r) => {
      setExams(r.data);
      setExamId(r.data[0]?.id ?? null);
    });
  }, [commissionNo]);

  useEffect(() => {
    if (!commissionNo || !examId) { setData(null); return; }
    setLoading(true);
    const params: Record<string, string | number> = { examId };
    if (qrupNum) params.qrupNum = Number(qrupNum);
    api
      .get<CommissionResultsResponse>(`/commissions/${commissionNo}/results`, { params })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [commissionNo, examId, qrupNum]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Komissiya nəticələri</h1>

      <div className="bg-white border rounded-lg shadow-sm p-4 mb-4 flex gap-3 flex-wrap items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Komissiya</label>
          <select
            value={commissionNo}
            onChange={(e) => setCommissionNo(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm"
          >
            <option value="">— seçin —</option>
            {commissions.map((c) => (
              <option key={c.id} value={c.commissionNo}>
                {c.commissionNo} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">İmtahan</label>
          <select
            value={examId ?? ""}
            onChange={(e) => setExamId(Number(e.target.value))}
            disabled={!exams.length}
            className="border rounded-md px-3 py-1.5 text-sm min-w-[260px]"
          >
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.examDate} — {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Qrup № (boş = hamısı)</label>
          <input
            type="number"
            min="1"
            value={qrupNum}
            onChange={(e) => setQrupNum(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm w-32"
          />
        </div>
      </div>

      {loading && <div className="text-gray-500">Yüklənir…</div>}

      {data && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <SummaryCard label="Cəmi tələbə" value={data.summary.total} />
            <SummaryCard label="Məqbul" value={data.summary.passed} color="green" />
            <SummaryCard label="Qeyri-məqbul" value={data.summary.failed} color="red" />
            <SummaryCard label="Sonucsuz" value={data.summary.pending} color="gray" />
          </div>

          <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Qrup</th>
                  <th className="px-3 py-2 text-left">№</th>
                  <th className="px-3 py-2 text-left">İş №</th>
                  <th className="px-3 py-2 text-left">Soyad Ad Ata adı</th>
                  <th className="px-3 py-2 text-left">Cins</th>
                  {data.exercises.map((ex) => (
                    <th key={ex.id} className="px-3 py-2 text-center" title={ex.name}>
                      {shortLabel(ex.code)}
                      <div className="text-xs text-gray-400 font-normal">{ex.unit}</div>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">Cəm</th>
                  <th className="px-3 py-2 text-center">Nəticə</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.rows.map((r) => (
                  <tr key={r.studentId} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 tabular-nums">{r.qrupNum}</td>
                    <td className="px-3 py-1.5 tabular-nums">{r.sNomer}</td>
                    <td className="px-3 py-1.5 font-mono text-xs">{r.isN}</td>
                    <td className="px-3 py-1.5">{r.fullName}</td>
                    <td className="px-3 py-1.5">{r.gender === 1 ? "kişi" : "qadın"}</td>
                    {data.exercises.map((ex) => {
                      const s = r.scoresByExerciseCode[ex.code];
                      return (
                        <td key={ex.id} className="px-3 py-1.5 text-center">
                          {s ? (
                            <div>
                              <div className="font-mono text-xs text-gray-500">
                                {s.rawValue ?? "—"}
                              </div>
                              <div className={`font-semibold ${s.finalScore >= 6 ? "text-gray-900" : "text-red-600"}`}>
                                {s.isRefused ? "imtina" : s.finalScore}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 text-right tabular-nums font-semibold">
                      {r.totalScore ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {r.totalScore === null ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : r.isPassed ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Məqbul
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium">
                          Qeyri-məqbul
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label, value, color = "blue"
}: { label: string; value: number; color?: "blue" | "green" | "red" | "gray" }) {
  const map = {
    blue: "text-brand-700",
    green: "text-green-700",
    red: "text-red-700",
    gray: "text-gray-500"
  };
  return (
    <div className="bg-white border rounded-lg shadow-sm p-3">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${map[color]}`}>{value}</div>
    </div>
  );
}

function shortLabel(code: string): string {
  return ({
    sprint_100m: "100m",
    cross_1000m: "1000m",
    pull_up: "Qüvvə",
    long_jump: "Tullanma",
    gymnastics: "Gimnastika",
    sport_games: "İdman oy."
  } as Record<string, string>)[code] ?? code;
}
