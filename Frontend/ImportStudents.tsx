import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { Commission, ImportResult } from "../../types";

export default function ImportStudents() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commissionNo, setCommissionNo] = useState("");
  const [examDate, setExamDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Commission[]>("/lookup/commissions").then((r) => setCommissions(r.data));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !commissionNo || !examDate) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("commissionNo", commissionNo);
      fd.append("examDate", examDate);
      const r = await api.post<ImportResult>("/imports/students", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(r.data);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string; title?: string } }; message?: string };
      setError(e.response?.data?.detail ?? e.response?.data?.title ?? e.message ?? "Xəta");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Tələbələri import et</h1>

      <form onSubmit={submit} className="bg-white border rounded-lg shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Komissiya</label>
          <select
            required
            value={commissionNo}
            onChange={(e) => setCommissionNo(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
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
          <label className="block text-sm font-medium mb-1">İmtahan tarixi</label>
          <input
            type="date"
            required
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Sistem bu tarixdə həmin komissiyaya bağlı imtahanı tapacaq (Exam_Commissions üzərindən).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Excel fayl (.xlsx)</label>
          <input
            type="file"
            required
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>

        <button
          disabled={busy}
          className="px-4 py-2 bg-brand-700 hover:bg-brand-500 text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Import edilir…" : "Import et"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 bg-white border rounded-lg shadow-sm p-4 text-sm">
          <h2 className="font-semibold mb-2">Nəticə</h2>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <Stat label="Cəmi" value={result.total} />
            <Stat label="Uğurlu" value={result.success} positive />
            <Stat label="Xətalı" value={result.failed} negative={result.failed > 0} />
          </div>
          {result.errors.length > 0 && (
            <details>
              <summary className="cursor-pointer text-red-700">
                {result.errors.length} xəta — detalları gör
              </summary>
              <ul className="mt-2 text-xs space-y-1 max-h-64 overflow-auto">
                {result.errors.map((e, i) => (
                  <li key={i} className="font-mono">
                    Sətir {e.row}: {e.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label, value, positive, negative
}: { label: string; value: number; positive?: boolean; negative?: boolean }) {
  return (
    <div className="border rounded-md px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={`text-xl font-semibold tabular-nums ${
          positive ? "text-green-700" : negative ? "text-red-700" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
