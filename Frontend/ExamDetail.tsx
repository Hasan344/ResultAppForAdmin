import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import type { ExamDetail as ExamDetailType, Student } from "../../types";

type Tab = "info" | "experts" | "monitors" | "students";

export default function ExamDetail() {
  const { id } = useParams();
  const examId = Number(id);
  const [exam, setExam] = useState<ExamDetailType | null>(null);
  const [tab, setTab] = useState<Tab>("info");
  const [tabData, setTabData] = useState<unknown[]>([]);

  useEffect(() => {
    api.get<ExamDetailType>(`/exams/${examId}`).then((r) => setExam(r.data));
  }, [examId]);

  useEffect(() => {
    if (tab === "info") return;
    const url =
      tab === "students" ? `/students?examId=${examId}` : `/exams/${examId}/${tab}`;
    api.get(url).then((r) => setTabData(r.data));
  }, [tab, examId]);

  if (!exam) return <div className="text-gray-500">Yüklənir…</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">{exam.name}</h1>
      <p className="text-gray-600 mb-4">
        {exam.examDate} • {exam.buildingName ?? "—"} • Komissiyalar:{" "}
        {exam.commissionNos.join(", ")}
      </p>

      <div className="border-b border-gray-200 mb-4">
        <div className="flex gap-1">
          {(["info", "experts", "monitors", "students"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                tab === t
                  ? "border-brand-700 text-brand-700"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {t === "info" ? "Məlumat"
                : t === "experts" ? `Ekspertlər (${exam.expertCount})`
                : t === "monitors" ? `Nəzarətçilər (${exam.monitorCount})`
                : `Tələbələr (${exam.registeredStudentCount})`}
            </button>
          ))}
        </div>
      </div>

      {tab === "info" && (
        <div className="bg-white rounded-lg shadow-sm border p-4 grid grid-cols-2 gap-4 text-sm">
          <Field label="Bina" value={exam.buildingName} />
          <Field label="Bölmə" value={exam.sectionName} />
          <Field label="Başlama" value={exam.startTime} />
          <Field label="Bitmə" value={exam.endTime} />
          <Field label="Növbə" value={exam.shift?.toString() ?? null} />
          <Field label="Tələbə sayı (planlanmış)" value={exam.studentCount?.toString() ?? null} />
        </div>
      )}

      {tab === "students" && <StudentsTable rows={tabData as Student[]} />}
      {(tab === "experts" || tab === "monitors") && (
        <PeopleTable rows={tabData as Record<string, unknown>[]} />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-gray-500 text-xs uppercase tracking-wide">{label}</div>
      <div className="font-medium">{value ?? "—"}</div>
    </div>
  );
}

function StudentsTable({ rows }: { rows: Student[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <table className="min-w-full text-sm divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Qrup</th>
            <th className="px-3 py-2 text-left">№</th>
            <th className="px-3 py-2 text-left">İş №</th>
            <th className="px-3 py-2 text-left">Soyad Ad Ata adı</th>
            <th className="px-3 py-2 text-left">Cins</th>
            <th className="px-3 py-2 text-left">İxtisas</th>
            <th className="px-3 py-2 text-left">İştirak</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-3 py-1.5 tabular-nums">{s.qrupNum}</td>
              <td className="px-3 py-1.5 tabular-nums">{s.sNomer}</td>
              <td className="px-3 py-1.5 tabular-nums">{s.isN}</td>
              <td className="px-3 py-1.5">
                {s.surname} {s.name} {s.fatherName}
              </td>
              <td className="px-3 py-1.5">{s.gender === 1 ? "kişi" : "qadın"}</td>
              <td className="px-3 py-1.5 text-gray-600">
                {s.kodixtisas} • {s.altNov ?? "—"}
              </td>
              <td className="px-3 py-1.5">
                {s.isAttended ? (
                  <span className="text-green-700">✓ İştirak etdi</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PeopleTable({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <table className="min-w-full text-sm divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Soyad</th>
            <th className="px-3 py-2 text-left">Ad</th>
            <th className="px-3 py-2 text-left">Ata adı</th>
            <th className="px-3 py-2 text-left">FİN</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-3 py-1.5">{String(r.surname ?? "")}</td>
              <td className="px-3 py-1.5">{String(r.name ?? "")}</td>
              <td className="px-3 py-1.5">{String(r.fname ?? "")}</td>
              <td className="px-3 py-1.5 font-mono text-xs">{String(r.finCode ?? "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
