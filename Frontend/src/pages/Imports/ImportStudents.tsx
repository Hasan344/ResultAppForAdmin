import { useEffect, useState } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Loader2, X, Info, Wand2, Settings2
} from "lucide-react";
import type { AxiosError } from "axios";
import { api } from "../../api/client";
import type { Commission, ImportResult } from "../../types";
import { PageHeader, StatCard } from "../../components/ui";
import { useSection } from "../../context/SectionContext";

type Mode = "auto" | "manual";

export default function ImportStudents() {
  const { sectionId } = useSection();

  const [mode, setMode] = useState<Mode>("auto");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commissionNo, setCommissionNo] = useState("");
  const [examDate, setExamDate]   = useState("");
  const [file,    setFile]        = useState<File | null>(null);
  const [busy,    setBusy]        = useState(false);
  const [result,  setResult]      = useState<ImportResult | null>(null);
  const [error,   setError]       = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [dragOver, setDragOver]   = useState(false);

  // Manual modda + section dəyişdikdə commissions-ı yenilə
  useEffect(() => {
    if (mode !== "manual") return;
    const params: Record<string, number> = {};
    if (sectionId !== null) params.sectionId = sectionId;

    api.get<Commission[]>("/lookup/commissions", { params })
      .then((r) => setCommissions(r.data));
    setCommissionNo("");   // section dəyişdikdə seçimi sıfırla
  }, [mode, sectionId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    if (mode === "manual" && (!commissionNo || !examDate)) return;

    setBusy(true);
    setError(null);
    setErrorDetail(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      let url = "/imports/students/auto";
      if (mode === "manual") {
        url = "/imports/students";
        fd.append("commissionNo", commissionNo);
        fd.append("examDate", examDate);
      }

      const r = await api.post<ImportResult>(url, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(r.data);
    } catch (err) {
      const ax = err as AxiosError;
      setError(ax.displayMessage ?? "Bilinməyən xəta");
      setErrorDetail(ax.displayDetail ?? null);
    } finally {
      setBusy(false);
    }
  }

  function onDrop(ev: React.DragEvent<HTMLLabelElement>) {
    ev.preventDefault();
    setDragOver(false);
    const f = ev.dataTransfer.files?.[0];
    if (f && f.name.toLowerCase().endsWith(".xlsx")) setFile(f);
  }

  const canSubmit = file && !busy && (mode === "auto" || (commissionNo && examDate));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Tələbələri Import et"
        description="Excel faylından komissiyalara tələbə məlumatlarını yükləyin"
        icon={<Upload className="w-6 h-6" />}
      />

      {/* Mode switcher */}
      <div className="card p-2 mb-6 inline-flex gap-1">
        <button
          onClick={() => setMode("auto")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            mode === "auto"
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Wand2 className="w-4 h-4" /> Avtomatik
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            mode === "manual"
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Settings2 className="w-4 h-4" /> Manuel
        </button>
      </div>

      {mode === "auto" && (
        <div className="mb-4 rounded-2xl bg-brand-50 border border-brand-100 p-4 flex gap-3">
          <Info className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <p className="text-sm text-brand-900">
            <strong>Avtomatik mod:</strong> Excel-dəki{" "}
            <code className="font-mono bg-brand-100 px-1 rounded text-xs">KODIXTISAS</code>{" "}
            və{" "}
            <code className="font-mono bg-brand-100 px-1 rounded text-xs">imt_tarix</code>{" "}
            sütunlarına görə hər sətr avtomatik uyğun komissiyaya bağlanır.
            Bir faylda 25+ komissiya ola bilər.
          </p>
        </div>
      )}

      <form onSubmit={submit} className="card p-6 space-y-5">
        {mode === "manual" && (
          <>
            {/* Komissiya — section seçilirsə o bölmənin komissiyaları */}
            <div>
              <label className="label">Komissiya</label>
              <select
                required
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
                <p className="text-xs text-amber-700 mt-2 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Seçili bölmədə komissiya yoxdur. Sol paneldə bölməni dəyişin.
                </p>
              )}
            </div>

            {/* İmtahan tarixi */}
            <div>
              <label className="label">İmtahan tarixi</label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="input"
              />
              <p className="text-xs text-slate-500 mt-2 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                Sistem bu tarixdə həmin komissiyaya bağlı imtahanı tapacaq.
              </p>
            </div>
          </>
        )}

        {/* Dropzone */}
        <div>
          <label className="label">Excel faylı</label>
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
              dragOver
                ? "border-brand-400 bg-brand-50/50"
                : file
                  ? "border-emerald-300 bg-emerald-50/40"
                  : "border-slate-200 bg-slate-50/50 hover:border-brand-300 hover:bg-brand-50/30"
            }`}
          >
            <input
              type="file"
              accept=".xlsx"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-slate-900">{file.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setFile(null); }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-slate-900">Klikləyin və ya sürüşdürün</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Yalnız .xlsx · maksimum {mode === "auto" ? "50" : "20"} MB
                  </div>
                </div>
              </>
            )}
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="submit" disabled={!canSubmit} className="btn-primary">
            {busy
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Yüklənir…</>
              : <><Upload className="w-4 h-4" /> Import et</>
            }
          </button>
        </div>
      </form>

      {/* Xəta */}
      {error && (
        <div className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-rose-900">Import alınmadı</div>
            <div className="text-sm text-rose-700 mt-1 break-words">{error}</div>
            {errorDetail && (
              <details className="mt-3">
                <summary className="text-xs font-medium text-rose-500 cursor-pointer select-none hover:text-rose-700">
                  Texniki detallar ▸
                </summary>
                <pre className="mt-2 text-xs text-rose-500 bg-rose-100/60 rounded-lg p-3 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                  {errorDetail}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Nəticə */}
      {result && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-emerald-900">Import tamamlandı</div>
              {result.batchId > 0 && (
                <div className="text-sm text-emerald-700 mt-0.5">
                  Batch ID: <span className="font-mono">{result.batchId}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Cəmi" value={result.total} tone="neutral"
              icon={<FileSpreadsheet className="w-5 h-5" />} />
            <StatCard label="Uğurlu" value={result.success} tone="success"
              icon={<CheckCircle2 className="w-5 h-5" />} />
            <StatCard label="Uğursuz" value={result.failed} tone="danger"
              icon={<AlertCircle className="w-5 h-5" />} />
          </div>

          {result.successByCommission && Object.keys(result.successByCommission).length > 1 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-semibold text-slate-900">Komissiya bazlı sayğac</h3>
              </div>
              <table className="table-modern">
                <thead><tr><th>Komissiya</th><th className="text-right">Tələbə</th></tr></thead>
                <tbody>
                  {Object.entries(result.successByCommission)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([no, count]) => (
                      <tr key={no}>
                        <td><span className="badge-brand">{no}</span></td>
                        <td className="text-right tabular-nums font-medium">{count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-semibold text-slate-900">
                  Xətalar ({result.errors.length})
                </h3>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="table-modern">
                  <thead><tr><th>Sətr</th><th>Xəta</th></tr></thead>
                  <tbody>
                    {result.errors.map((er, i) => (
                      <tr key={i}>
                        <td className="tabular-nums font-mono text-xs">{er.row}</td>
                        <td className="text-rose-700">{er.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
