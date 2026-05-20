import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, Plus, Pencil, Trash2, X, Save, Inbox } from "lucide-react";
import { api } from "../../api/client";
import type { Commission, Exercise } from "../../types";
import { PageHeader, EmptyState, LoadingState } from "../../components/ui";
import { genderLabel } from "../../lib/format";
import { useSection } from "../../context/SectionContext";

type Rule = {
  id: number;
  commissionNo: string;
  kodixtisas: string | null;
  exerciseId: number;
  exerciseCode: string;
  gender: number;
  ageMin: number;
  ageMax: number;
  threshold: number;
  score: number;
  isActive: boolean;
};

export default function ScoringRules() {
  const { sectionId } = useSection();

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [exercises,   setExercises]   = useState<Exercise[]>([]);
  const [filter, setFilter] = useState({ commissionNo: "", exerciseId: "", gender: "" });
  const [rules,   setRules]   = useState<Rule[]>([]);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(false);

  // exercises heç vaxt section-a bağlı deyil — bir dəfə yüklə
  useEffect(() => {
    api.get<Exercise[]>("/lookup/exercises").then((r) => setExercises(r.data));
  }, []);

  // ── Section dəyişdikdə: commissions-ı yenidən yüklə, commission filtrini sıfırla ──
  useEffect(() => {
    const params: Record<string, number> = {};
    if (sectionId !== null) params.sectionId = sectionId;

    api.get<Commission[]>("/lookup/commissions", { params })
      .then((r) => setCommissions(r.data));

    setFilter((f) => ({ ...f, commissionNo: "" }));
  }, [sectionId]);

  // ── Filtrlər dəyişdikdə: qaydaları yüklə ────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = {};
    if (filter.commissionNo) params.commissionNo = filter.commissionNo;
    if (filter.exerciseId)   params.exerciseId   = filter.exerciseId;
    if (filter.gender)       params.gender       = filter.gender;
    if (sectionId !== null)  params.sectionId    = sectionId;

    api.get<Rule[]>("/scoringrules", { params })
      .then((r) => setRules(r.data))
      .finally(() => setLoading(false));
  }, [filter, sectionId]);

  const grouped = useMemo(() => {
    const map = new Map<string, Rule[]>();
    for (const r of rules.filter((x) => x.isActive)) {
      const key = `${r.commissionNo}|${r.kodixtisas ?? "-"}|${r.exerciseCode}|${r.gender}|${r.ageMin}-${r.ageMax}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return [...map.entries()].map(([key, arr]) => ({
      key,
      head: arr[0],
      items: arr.sort((a, b) => b.score - a.score)
    }));
  }, [rules]);

  async function save(r: Rule) {
    const payload = {
      commissionNo: r.commissionNo,
      kodixtisas:   r.kodixtisas,
      exerciseId:   r.exerciseId,
      gender:       r.gender,
      ageMin:       r.ageMin,
      ageMax:       r.ageMax,
      threshold:    r.threshold,
      score:        r.score
    };
    if (r.id === 0) {
      const { data } = await api.post<Rule>("/scoringrules", payload);
      setRules([...rules, data]);
    } else {
      await api.put(`/scoringrules/${r.id}`, payload);
      setRules(rules.map((x) => (x.id === r.id ? r : x)));
    }
    setEditing(null);
  }

  async function remove(id: number) {
    if (!confirm("Bu qaydanı deaktiv etmək istəyirsiniz?")) return;
    await api.delete(`/scoringrules/${id}`);
    setRules(rules.map((x) => (x.id === id ? { ...x, isActive: false } : x)));
  }

  function startNew() {
    setEditing({
      id: 0,
      commissionNo: filter.commissionNo || commissions[0]?.commissionNo || "",
      kodixtisas:   null,
      exerciseId:   filter.exerciseId ? Number(filter.exerciseId) : exercises[0]?.id ?? 0,
      exerciseCode: filter.exerciseId
        ? (exercises.find((e) => e.id === Number(filter.exerciseId))?.code ?? "")
        : (exercises[0]?.code ?? ""),
      gender:   filter.gender ? Number(filter.gender) : 1,
      ageMin:   16,
      ageMax:   25,
      threshold: 0,
      score:    6,
      isActive: true
    });
  }

  return (
    <div>
      <PageHeader
        title="Bal Cədvəlləri"
        description="Komissiya, cins və yaş aralığına görə bal qaydalarını idarə edin"
        icon={<SlidersHorizontal className="w-6 h-6" />}
        actions={
          <button onClick={startNew} className="btn-primary">
            <Plus className="w-4 h-4" /> Yeni qayda
          </button>
        }
      />

      {/* Filtrlər */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* Komissiya — section seçilirsə o section-un komissiyaları */}
          <div>
            <label className="label">Komissiya</label>
            <select
              value={filter.commissionNo}
              onChange={(e) => setFilter({ ...filter, commissionNo: e.target.value })}
              className="input"
            >
              <option value="">
                {sectionId !== null ? "Bu bölmənin komissiyaları" : "Hamısı"}
              </option>
              {commissions.map((c) => (
                <option key={c.id} value={c.commissionNo}>
                  {c.commissionNo} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Hərəkət — section-dan asılı deyil */}
          <div>
            <label className="label">Hərəkət</label>
            <select
              value={filter.exerciseId}
              onChange={(e) => setFilter({ ...filter, exerciseId: e.target.value })}
              className="input"
            >
              <option value="">Hamısı</option>
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          {/* Cins */}
          <div>
            <label className="label">Cins</label>
            <select
              value={filter.gender}
              onChange={(e) => setFilter({ ...filter, gender: e.target.value })}
              className="input"
            >
              <option value="">Hamısı</option>
              <option value="1">Kişi</option>
              <option value="2">Qadın</option>
            </select>
          </div>
        </div>
      </div>

      {/* Qaydalar */}
      {loading ? (
        <div className="card"><LoadingState /></div>
      ) : grouped.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Inbox className="w-7 h-7" />}
            title="Qayda tapılmadı"
            description={
              sectionId !== null
                ? "Bu bölmə üçün aktiv qayda yoxdur."
                : "Bu filtrlərə uyğun aktiv qayda yoxdur."
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={g.key} className="card overflow-hidden">
              <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center gap-2">
                <span className="badge-brand">Komissiya {g.head.commissionNo}</span>
                {g.head.kodixtisas && (
                  <span className="badge-neutral font-mono">{g.head.kodixtisas}</span>
                )}
                <span className="badge-neutral">
                  {exercises.find((e) => e.code === g.head.exerciseCode)?.name ?? g.head.exerciseCode}
                </span>
                <span className="badge-neutral">{genderLabel(g.head.gender)}</span>
                <span className="badge-neutral">Yaş {g.head.ageMin}–{g.head.ageMax}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th className="w-24">Bal</th>
                      <th>Threshold (eşik)</th>
                      <th className="text-right pr-5">Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-brand-50 text-brand-700 font-bold tabular-nums">
                            {r.score}
                          </span>
                        </td>
                        <td className="font-mono text-slate-700">{r.threshold}</td>
                        <td className="text-right">
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => setEditing(r)}
                              className="btn-ghost !px-2 !py-1.5"
                              title="Redaktə et"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => remove(r.id)}
                              className="btn-ghost !px-2 !py-1.5 hover:!bg-rose-50 hover:!text-rose-700"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditModal
          rule={editing}
          commissions={commissions}
          exercises={exercises}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ─── Edit Modal ────────────────────────────────────────────────────────────
function EditModal({
  rule, commissions, exercises, onSave, onClose
}: {
  rule: Rule;
  commissions: Commission[];
  exercises: Exercise[];
  onSave: (r: Rule) => void;
  onClose: () => void;
}) {
  const [r, setR] = useState<Rule>(rule);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">
            {r.id === 0 ? "Yeni qayda" : "Qaydanı redaktə et"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Komissiya</label>
              <select
                value={r.commissionNo}
                onChange={(e) => setR({ ...r, commissionNo: e.target.value })}
                className="input"
              >
                {commissions.map((c) => (
                  <option key={c.id} value={c.commissionNo}>{c.commissionNo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Kod ixtisas</label>
              <input
                value={r.kodixtisas ?? ""}
                onChange={(e) => setR({ ...r, kodixtisas: e.target.value.trim() || null })}
                placeholder="boş = hamısı"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Hərəkət</label>
            <select
              value={r.exerciseId}
              onChange={(e) => {
                const ex = exercises.find((x) => x.id === Number(e.target.value));
                setR({ ...r, exerciseId: Number(e.target.value), exerciseCode: ex?.code ?? r.exerciseCode });
              }}
              className="input"
            >
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Cins</label>
              <select
                value={r.gender}
                onChange={(e) => setR({ ...r, gender: Number(e.target.value) })}
                className="input"
              >
                <option value={1}>Kişi</option>
                <option value={2}>Qadın</option>
              </select>
            </div>
            <div>
              <label className="label">Yaş min</label>
              <input type="number" value={r.ageMin}
                onChange={(e) => setR({ ...r, ageMin: Number(e.target.value) })}
                className="input" />
            </div>
            <div>
              <label className="label">Yaş max</label>
              <input type="number" value={r.ageMax}
                onChange={(e) => setR({ ...r, ageMax: Number(e.target.value) })}
                className="input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Threshold</label>
              <input type="number" step="0.01" value={r.threshold}
                onChange={(e) => setR({ ...r, threshold: Number(e.target.value) })}
                className="input" />
            </div>
            <div>
              <label className="label">Bal (6–10)</label>
              <input type="number" min={0} max={10} value={r.score}
                onChange={(e) => setR({ ...r, score: Number(e.target.value) })}
                className="input" />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Ləğv et</button>
          <button onClick={() => onSave(r)} className="btn-primary">
            <Save className="w-4 h-4" /> Yadda saxla
          </button>
        </div>
      </div>
    </div>
  );
}
