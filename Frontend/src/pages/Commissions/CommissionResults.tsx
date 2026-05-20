import { useEffect, useState } from "react";
import {
  Users, ListChecks, CheckCircle2, XCircle,
  Clock, Trophy, Inbox
} from "lucide-react";
import { api } from "../../api/client";
import type { Commission, CommissionResultsResponse, ExamListItem } from "../../types";
import { PageHeader, StatCard, EmptyState, LoadingState } from "../../components/ui";
import { shortExerciseLabel, genderLabel, formatDate } from "../../lib/format";
import { useSection } from "../../context/SectionContext";

export default function CommissionResults() {
  const { sectionId } = useSection();

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [exams, setExams]             = useState<ExamListItem[]>([]);
  const [commissionNo, setCommissionNo] = useState("");
  const [examId, setExamId]           = useState<number | null>(null);
  const [qrupNum, setQrupNum]         = useState("");
  const [data, setData]               = useState<CommissionResultsResponse | null>(null);
  const [loading, setLoading]         = useState(false);

  // ── 1. Section dəyişəndə: commissions-ı yenidən yüklə, seçimləri sıfırla ──
  useEffect(() => {
    const params: Record<string, number> = {};
    if (sectionId !== null) params.sectionId = sectionId;

    api.get<Commission[]>("/lookup/commissions", { params })
      .then((r) => setCommissions(r.data));

    // section dəyişdikdə aşağı filtrlər sıfırlanır
    setCommissionNo("");
    setExamId(null);
    setExams([]);
    setData(null);
  }, [sectionId]);

  // ── 2. Komissiya dəyişdikdə: həmin komissiyanın imtahanlarını yüklə ─────────
  useEffect(() => {
    if (!commissionNo) {
      setExams([]);
      setExamId(null);
      setData(null);
      return;
    }
    const params: Record<string, string | number> = { commissionNo };
    if (sectionId !== null) params.sectionId = sectionId;

    api.get<ExamListItem[]>("/exams", { params }).then((r) => {
      setExams(r.data);
      setExamId(r.data[0]?.id ?? null);
    });
    setData(null);
  }, [commissionNo, sectionId]);

  // ── 3. Exam / qrup dəyişdikdə: nəticələri yüklə ─────────────────────────────
  useEffect(() => {
    if (!commissionNo || !examId) { setData(null); return; }
    setLoading(true);
    const params: Record<string, string | number> = { examId };
    if (qrupNum) params.qrupNum = Number(qrupNum);

    api.get<CommissionResultsResponse>(`/commissions/${commissionNo}/results`, { params })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [commissionNo, examId, qrupNum]);

  return (
    <div>
      <PageHeader
        title="Komissiya Nəticələri"
        description="Komissiya bazlı tələbə nəticələrini və ümumi statistikanı görün"
        icon={<Trophy className="w-6 h-6" />}
      />

      {/* Filtrlər */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* Komissiya — section seçilirsə o section-un komissiyaları */}
          <div>
            <label className="label">Komissiya</label>
            <select
              value={commissionNo}
              onChange={(e) => setCommissionNo(e.target.value)}
              className="input"
            >
              <option value="">— seçin —</option>
              {commissions.map((c) => (
                <option key={c.id} value={c.commissionNo}>
                  {c.commissionNo} — {c.name}
                </option>
              ))}
            </select>
            {sectionId !== null && commissions.length === 0 && (
              <p className="text-xs text-amber-700 mt-1.5">
                Bu bölmədə komissiya yoxdur.
              </p>
            )}
          </div>

          {/* İmtahan — komissiya seçilirsə həmin komissiyanın imtahanları */}
          <div>
            <label className="label">İmtahan</label>
            <select
              value={examId ?? ""}
              onChange={(e) => setExamId(e.target.value ? Number(e.target.value) : null)}
              className="input"
              disabled={!commissionNo || exams.length === 0}
            >
              {exams.length === 0
                ? <option value="">— əvvəlcə komissiya seçin —</option>
                : exams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {formatDate(e.examDate)} — {e.name}
                    </option>
                  ))
              }
            </select>
          </div>

          {/* Qrup — opsional */}
          <div>
            <label className="label">Qrup (opsional)</label>
            <input
              type="number"
              value={qrupNum}
              onChange={(e) => setQrupNum(e.target.value)}
              placeholder="Məs: 1"
              className="input"
              disabled={!examId}
            />
          </div>
        </div>
      </div>

      {/* Boş hal */}
      {(!commissionNo || !examId) ? (
        <div className="card">
          <EmptyState
            icon={<Trophy className="w-7 h-7" />}
            title="Komissiya və imtahan seçin"
            description={
              sectionId !== null
                ? "Seçilmiş bölmənin komissiyalarından birini seçin."
                : "Nəticələri görmək üçün komissiya və imtahan seçməyiniz lazımdır."
            }
          />
        </div>
      ) : loading ? (
        <div className="card"><LoadingState /></div>
      ) : !data ? null : (
        <>
          {/* Stat kartları */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Cəmi" value={data.summary.total} tone="brand"
              icon={<Users className="w-5 h-5" />} />
            <StatCard label="Məqbul" value={data.summary.passed} tone="success"
              icon={<CheckCircle2 className="w-5 h-5" />} />
            <StatCard label="Qeyri-məqbul" value={data.summary.failed} tone="danger"
              icon={<XCircle className="w-5 h-5" />} />
            <StatCard label="Gözləyir" value={data.summary.pending} tone="amber"
              icon={<Clock className="w-5 h-5" />} />
          </div>

          {/* Tablo */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-900">Tələbə Nəticələri</h2>
              <span className="badge-neutral ml-1">{data.rows.length}</span>
            </div>

            {data.rows.length === 0 ? (
              <EmptyState
                icon={<Inbox className="w-7 h-7" />}
                title="Nəticə tapılmadı"
                description="Bu komissiya və imtahan üçün heç bir tələbə yoxdur."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>Qr</th>
                      <th>№</th>
                      <th>İş №</th>
                      <th>Ad Soyad</th>
                      <th>Cins</th>
                      {data.exercises.map((ex) => (
                        <th key={ex.id} className="text-center">
                          {shortExerciseLabel(ex.code)}
                        </th>
                      ))}
                      <th className="text-right">Total</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.studentId}>
                        <td className="tabular-nums font-medium">{r.qrupNum}</td>
                        <td className="tabular-nums text-slate-500">{r.sNomer ?? "—"}</td>
                        <td className="font-mono text-xs text-slate-500">{r.isN}</td>
                        <td className="font-medium text-slate-900">{r.fullName}</td>
                        <td className="text-slate-600">{genderLabel(r.gender)}</td>
                        {data.exercises.map((ex) => {
                          const s = r.scoresByExerciseCode[ex.code];
                          return (
                            <td key={ex.id} className="text-center">
                              {s ? (
                                <div className="leading-tight">
                                  <div className="font-mono text-[11px] text-slate-400">
                                    {s.rawValue ?? "—"}
                                  </div>
                                  <div className={`font-bold text-sm ${
                                    s.isRefused
                                      ? "text-slate-400 italic"
                                      : s.finalScore >= 6
                                        ? "text-slate-900"
                                        : "text-rose-600"
                                  }`}>
                                    {s.isRefused ? "imtina" : s.finalScore}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-right tabular-nums font-bold text-slate-900">
                          {r.totalScore ?? "—"}
                        </td>
                        <td className="text-center">
                          {r.totalScore === null ? (
                            <span className="badge-amber">
                              <Clock className="w-3 h-3" />Gözləyir
                            </span>
                          ) : r.isPassed ? (
                            <span className="badge-success">
                              <CheckCircle2 className="w-3 h-3" />Məqbul
                            </span>
                          ) : (
                            <span className="badge-danger">
                              <XCircle className="w-3 h-3" />Qeyri-məqbul
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
