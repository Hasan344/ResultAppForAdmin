import { useState } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Loader2, X, Info, Download, Trophy, RefreshCw, Hash, Scale
} from "lucide-react";
import type { AxiosError } from "axios";
import { api } from "../../api/client";
import type { ResultsImportResult } from "../../types";
import { PageHeader, StatCard } from "../../components/ui";

export default function ImportResults() {
  const [file, setFile] = useState<File | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResultsImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setBusy(true);
    setError(null);
    setErrorDetail(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("overwrite", String(overwrite));

      const r = await api.post<ResultsImportResult>("/imports/results/auto", fd, {
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

  async function downloadTemplate() {
    try {
      const r = await api.get("/imports/results/template", { responseType: "blob" });
      const url = URL.createObjectURL(r.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nəticələr_şablon_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // sessizcə skip
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Nəticələri Import et"
        description="Tələbə nəticələrini Excel ilə toplu import edin — sistem balları avtomatik hesablayacaq"
        icon={<Trophy className="w-6 h-6" />}
        actions={
          <button onClick={downloadTemplate} className="btn-secondary">
            <Download className="w-4 h-4" />
            Şablon yüklə
          </button>
        }
      />

      {/* Format açıqlaması */}
      <div className="mb-6 rounded-2xl bg-brand-50 border border-brand-100 p-4 flex gap-3">
        <Info className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
        <div className="text-sm text-brand-900 min-w-0 flex-1">
          <div className="font-semibold mb-2">Excel formatı:</div>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="bg-brand-100/60">
                  <th className="border border-brand-200 px-2 py-1 text-left font-semibold">is_n</th>
                  <th className="border border-brand-200 px-2 py-1 text-left font-semibold">exercise_code</th>
                  <th className="border border-brand-200 px-2 py-1 text-left font-semibold">raw_value</th>
                  <th className="border border-brand-200 px-2 py-1 text-left font-semibold">is_refused</th>
                  <th className="border border-brand-200 px-2 py-1 text-left font-semibold">notes</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr>
                  <td className="border border-brand-200 px-2 py-1 font-mono">134518</td>
                  <td className="border border-brand-200 px-2 py-1 font-mono">sprint_100m</td>
                  <td className="border border-brand-200 px-2 py-1">13.4</td>
                  <td className="border border-brand-200 px-2 py-1 text-slate-400">—</td>
                  <td className="border border-brand-200 px-2 py-1 text-slate-400">—</td>
                </tr>
                <tr>
                  <td className="border border-brand-200 px-2 py-1 font-mono">134518</td>
                  <td className="border border-brand-200 px-2 py-1 font-mono">long_jump</td>
                  <td className="border border-brand-200 px-2 py-1 text-slate-400">—</td>
                  <td className="border border-brand-200 px-2 py-1">TRUE</td>
                  <td className="border border-brand-200 px-2 py-1">imtina etdi</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul className="mt-3 text-xs space-y-1 text-brand-800">
            <li>• <code className="font-mono bg-brand-100 px-1 rounded">is_n</code>: tələbənin iş nömrəsi (students cədvəlində mövcud olmalı)</li>
            <li>• <code className="font-mono bg-brand-100 px-1 rounded">exercise_code</code>: hərəkət kodu (sprint_100m, cross_1000m, long_jump, pull_up, ...)</li>
            <li>• <code className="font-mono bg-brand-100 px-1 rounded">raw_value</code>: ölçü dəyəri (saniyə / sm / dəfə). İmtina halında boş ola bilər.</li>
            <li>• <code className="font-mono bg-brand-100 px-1 rounded">is_refused</code>: imtina edibsə TRUE — bu halda bal 0 olur</li>
            <li>• Sistem <strong>scoring_rules</strong> əsasında balı avtomatik hesablayır</li>
          </ul>
        </div>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-5">
        {/* Overwrite toggle */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/50 border border-amber-100">
          <label className="flex items-start gap-3 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                Mövcud nəticələri üstündən yaz
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Bu seçim aktivdirsə, eyni tələbə + hərəkət cütündə mövcud nəticələr yenilənəcək.
                Əks halda dublikatlar sayğacda göstərilir, lakin əzilmir.
              </div>
            </div>
          </label>
        </div>

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
                  <div className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</div>
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
                  <div className="text-xs text-slate-500 mt-1">Yalnız .xlsx · maksimum 50 MB</div>
                </div>
              </>
            )}
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="submit" disabled={!file || busy} className="btn-primary">
            {busy ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Yüklənir…</>
            ) : (
              <><Upload className="w-4 h-4" /> Import et</>
            )}
          </button>
        </div>
      </form>

      {/* Xəta bloku */}
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

      {/* Uğurlu nəticə */}
      {result && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-emerald-900">Import tamamlandı</div>
              <div className="text-sm text-emerald-700 mt-0.5">
                Toplam {result.total} sətr işləndi
              </div>
            </div>
          </div>

                  <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
                      <StatCard label="Cəmi" value={result.total} tone="neutral" icon={<Hash className="w-5 h-5" />} />
                      <StatCard label="Yeni" value={result.inserted} tone="success" icon={<CheckCircle2 className="w-5 h-5" />} />
                      <StatCard label="Yenilənmiş" value={result.updated} tone="brand" icon={<RefreshCw className="w-5 h-5" />} />
                      <StatCard label="Dublikat" value={result.duplicates} tone="amber" icon={<Info className="w-5 h-5" />} />
                      <StatCard label="Uğursuz" value={result.failed} tone="danger" icon={<AlertCircle className="w-5 h-5" />} />
                      <StatCard label="Apel. yeni" value={result.appealsInserted} tone="brand" icon={<Scale className="w-5 h-5" />} />
                      <StatCard label="Apel. yenil." value={result.appealsUpdated} tone="amber" icon={<Scale className="w-5 h-5" />} />
                  </div>

          {result.duplicates > 0 && !overwrite && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <strong>{result.duplicates}</strong> dublikat var — bunlar əzilmədi.
                Əzmək istəyirsənsə yuxarıda <em>"Mövcud nəticələri üstündən yaz"</em> seçimini aktivləşdir və yenidən import et.
              </div>
            </div>
          )}

          {result.successByCommission && Object.keys(result.successByCommission).length > 1 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-semibold text-slate-900">Komissiya bazlı uğurlu sayğac</h3>
              </div>
              <table className="table-modern">
                <thead><tr><th>Komissiya</th><th className="text-right">Nəticə sayı</th></tr></thead>
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
                  Mesajlar ({result.errors.length})
                </h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="table-modern">
                  <thead><tr><th>Sətr</th><th>Mesaj</th></tr></thead>
                  <tbody>
                    {result.errors.map((er, i) => (
                      <tr key={i}>
                        <td className="tabular-nums font-mono text-xs">{er.row}</td>
                        <td className={er.error.startsWith("Skip:") ? "text-amber-700" : "text-rose-700"}>
                          {er.error}
                        </td>
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
