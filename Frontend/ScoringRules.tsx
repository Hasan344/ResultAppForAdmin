import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import type { Commission, Exercise } from "../../types";

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
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filter, setFilter] = useState({ commissionNo: "", exerciseId: "", gender: "" });
  const [rules, setRules] = useState<Rule[]>([]);
  const [editing, setEditing] = useState<Rule | null>(null);

  useEffect(() => {
    api.get<Commission[]>("/lookup/commissions").then((r) => setCommissions(r.data));
    api.get<Exercise[]>("/lookup/exercises").then((r) => setExercises(r.data));
  }, []);

  useEffect(() => {
    const params = Object.fromEntries(Object.entries(filter).filter(([, v]) => v));
    api.get<Rule[]>("/scoringrules", { params }).then((r) => setRules(r.data));
  }, [filter]);

  const grouped = useMemo(() => {
    // group by (commissionNo, exerciseCode, gender, ageMin-ageMax)
    const map = new Map<string, Rule[]>();
    for (const r of rules) {
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
    if (r.id === 0) {
      const { data } = await api.post<Rule>("/scoringrules", {
        commissionNo: r.commissionNo,
        kodixtisas: r.kodixtisas,
        exerciseId: r.exerciseId,
        gender: r.gender,
        ageMin: r.ageMin,
        ageMax: r.ageMax,
        threshold: r.threshold,
        score: r.score
      });
      setRules([...rules, data]);
    } else {
      await api.put(`/scoringrules/${r.id}`, {
        commissionNo: r.commissionNo,
        kodixtisas: r.kodixtisas,
        exerciseId: r.exerciseId,
        gender: r.gender,
        ageMin: r.ageMin,
        ageMax: r.ageMax,
        threshold: r.threshold,
        score: r.score
      });
      setRules(rules.map((x) => (x.id === r.id ? r : x)));
    }
    setEditing(null);
  }

  async function remove(id: number) {
    if (!confirm("Bu qaydanı deaktiv etmək istəyirsiniz?")) return;
    await api.delete(`/scoringrules/${id}`);
    setRules(rules.map((x) => (x.id === id ? { ...x, isActive: false } : x)));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Bal cədvəlləri</h1>
        <button
          onClick={() => setEditing({
            id: 0, commissionNo: filter.commissionNo || "62", kodixtisas: null,
            exerciseId: exercises[0]?.id ?? 1, exerciseCode: exercises[0]?.code ?? "",
            gender: 1, ageMin: 0, ageMax: 99, threshold: 0, score: 10, isActive: true
          })}
          className="px-3 py-1.5 bg-brand-700 text-white rounded-md text-sm font-medium hover:bg-brand-500"
        >
          + Yeni qayda
        </button>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-4 mb-4 flex gap-3">
        <select
          value={filter.commissionNo}
          onChange={(e) => setFilter({ ...filter, commissionNo: e.target.value })}
          className="border rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">Bütün komissiyalar</option>
          {commissions.map((c) => (
            <option key={c.id} value={c.commissionNo}>{c.commissionNo}</option>
          ))}
        </select>
        <select
          value={filter.exerciseId}
          onChange={(e) => setFilter({ ...filter, exerciseId: e.target.value })}
          className="border rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">Bütün hərəkətlər</option>
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <select
          value={filter.gender}
          onChange={(e) => setFilter({ ...filter, gender: e.target.value })}
          className="border rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">Hər iki cins</option>
          <option value="1">Kişi</option>
          <option value="2">Qadın</option>
        </select>
      </div>

      <div className="space-y-3">
        {grouped.map(({ key, head, items }) => (
          <div key={key} className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b text-sm flex items-center gap-3">
              <span className="font-semibold">Komissiya {head.commissionNo}</span>
              {head.kodixtisas && (
                <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">{head.kodixtisas}</span>
              )}
              <span>•</span>
              <span>{head.exerciseCode}</span>
              <span>•</span>
              <span>{head.gender === 1 ? "Kişi" : "Qadın"}</span>
              <span>•</span>
              <span>{head.ageMin === head.ageMax ? `${head.ageMin}` : `${head.ageMin}–${head.ageMax}`} yaş</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Bal</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Hədd (threshold)</th>
                  <th className="px-3 py-1.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((r) => (
                  <tr key={r.id} className={r.isActive ? "" : "opacity-50"}>
                    <td className="px-3 py-1.5 font-semibold tabular-nums">{r.score}</td>
                    <td className="px-3 py-1.5 tabular-nums">{r.threshold}</td>
                    <td className="px-3 py-1.5 text-right space-x-2">
                      <button onClick={() => setEditing(r)} className="text-brand-700 hover:underline text-xs">
                        Düzəliş
                      </button>
                      {r.isActive && (
                        <button onClick={() => remove(r.id)} className="text-red-600 hover:underline text-xs">
                          Deaktiv
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {editing && (
        <RuleEditor
          rule={editing}
          exercises={exercises}
          commissions={commissions}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function RuleEditor({
  rule, exercises, commissions, onCancel, onSave
}: {
  rule: Rule;
  exercises: Exercise[];
  commissions: Commission[];
  onCancel: () => void;
  onSave: (r: Rule) => void;
}) {
  const [r, setR] = useState(rule);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">{rule.id === 0 ? "Yeni qayda" : "Qaydanı düzəlt"}</h2>
        <div className="space-y-3 text-sm">
          <Row label="Komissiya">
            <select
              value={r.commissionNo}
              onChange={(e) => setR({ ...r, commissionNo: e.target.value })}
              className="w-full border rounded-md px-2 py-1"
            >
              {commissions.map((c) => (
                <option key={c.id} value={c.commissionNo}>{c.commissionNo} — {c.name}</option>
              ))}
            </select>
          </Row>
          <Row label="Alt-ixtisas (kodixtisas)">
            <input
              value={r.kodixtisas ?? ""}
              onChange={(e) => setR({ ...r, kodixtisas: e.target.value || null })}
              placeholder="UFH / ABT / KSI / boş"
              className="w-full border rounded-md px-2 py-1"
            />
          </Row>
          <Row label="Hərəkət">
            <select
              value={r.exerciseId}
              onChange={(e) => {
                const ex = exercises.find((x) => x.id === Number(e.target.value));
                setR({ ...r, exerciseId: Number(e.target.value), exerciseCode: ex?.code ?? "" });
              }}
              className="w-full border rounded-md px-2 py-1"
            >
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </Row>
          <Row label="Cins">
            <select
              value={r.gender}
              onChange={(e) => setR({ ...r, gender: Number(e.target.value) })}
              className="w-full border rounded-md px-2 py-1"
            >
              <option value={1}>Kişi</option>
              <option value={2}>Qadın</option>
            </select>
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Yaş min">
              <input type="number" value={r.ageMin}
                onChange={(e) => setR({ ...r, ageMin: Number(e.target.value) })}
                className="w-full border rounded-md px-2 py-1" />
            </Row>
            <Row label="Yaş max">
              <input type="number" value={r.ageMax}
                onChange={(e) => setR({ ...r, ageMax: Number(e.target.value) })}
                className="w-full border rounded-md px-2 py-1" />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Hədd (threshold)">
              <input type="number" step="0.01" value={r.threshold}
                onChange={(e) => setR({ ...r, threshold: Number(e.target.value) })}
                className="w-full border rounded-md px-2 py-1" />
            </Row>
            <Row label="Bal">
              <input type="number" min={6} max={10} value={r.score}
                onChange={(e) => setR({ ...r, score: Number(e.target.value) })}
                className="w-full border rounded-md px-2 py-1" />
            </Row>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded-md hover:bg-gray-100">
            Ləğv et
          </button>
          <button
            onClick={() => onSave(r)}
            className="px-3 py-1.5 bg-brand-700 text-white rounded-md text-sm font-medium hover:bg-brand-500"
          >
            Yadda saxla
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
