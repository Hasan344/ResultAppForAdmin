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

  // ── Section dəyişdikdə: exercises-i yenidən yüklə ────────────────────────
  // section_id = null olanlar hər bölmədə görünür;
  // section_id dolu olanlar yalnız həmin bölmədə görünür.
  useEffect(() => {
    const params: Record<string, number> = {};
    if (sectionId !== null) params.sectionId = sectionId;
    api.get<Exercise[]>("/lookup/exercises", { params })
      .then((r) => setExercises(r.data));
  }, [sectionId]);

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
        title="Normativlər"
        description="Komissiya, cins və yaş aralığına görə normativləri idarə edin"
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

          {/* Hərəkət — section seçilirsə o section-un + ümumi egzersizlər */}
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
                <span className="badge-neutral">{g.head.ageMin}–{g.head.ageMax} yaş</span>
              </div>

              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Hədd</th>
                    <th>Bal</th>
                    <th className="text-right">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((item) => (
                    <tr key={item.id}>
                      <td className="tabular-nums font-mono">{item.threshold}</td>
                      <td>
                        <span className="badge-brand">{item.score}</span>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditing(item)}
                            className="btn-ghost btn-xs"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => remove(item.id)}
                            className="btn-ghost btn-xs text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">
                {editing.id === 0 ? "Yeni qayda" : "Qaydanı düzənlə"}
              </h2>
              <button onClick={() => setEditing(null)} className="btn-ghost btn-sm">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="label">Komissiya</label>
                <select
                  value={editing.commissionNo}
                  onChange={(e) => setEditing({ ...editing, commissionNo: e.target.value })}
                  className="input"
                >
                  {commissions.map((c) => (
                    <option key={c.id} value={c.commissionNo}>
                      {c.commissionNo} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Alt-ixtisas (boş = hamısı)</label>
                <input
                  className="input"
                  value={editing.kodixtisas ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, kodixtisas: e.target.value || null })
                  }
                  placeholder="UFH / ABT / KSI (boş buraxın = hamısı)"
                />
              </div>

              <div>
                <label className="label">Hərəkət</label>
                <select
                  value={editing.exerciseId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const ex = exercises.find((x) => x.id === id);
                    setEditing({ ...editing, exerciseId: id, exerciseCode: ex?.code ?? "" });
                  }}
                  className="input"
                >
                  {exercises.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Cins</label>
                <select
                  value={editing.gender}
                  onChange={(e) => setEditing({ ...editing, gender: Number(e.target.value) })}
                  className="input"
                >
                  <option value={1}>Kişi</option>
                  <option value={2}>Qadın</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Yaş (min)</label>
                  <input
                    type="number"
                    className="input"
                    value={editing.ageMin}
                    onChange={(e) => setEditing({ ...editing, ageMin: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Yaş (max)</label>
                  <input
                    type="number"
                    className="input"
                    value={editing.ageMax}
                    onChange={(e) => setEditing({ ...editing, ageMax: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Hədd (threshold)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={editing.threshold}
                    onChange={(e) =>
                      setEditing({ ...editing, threshold: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="label">Bal (6–10)</label>
                  <input
                    type="number"
                    min={6}
                    max={10}
                    className="input"
                    value={editing.score}
                    onChange={(e) => setEditing({ ...editing, score: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => save(editing)} className="btn-primary flex-1">
                <Save className="w-4 h-4" /> Yadda saxla
              </button>
              <button onClick={() => setEditing(null)} className="btn-secondary">
                Ləğv et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
