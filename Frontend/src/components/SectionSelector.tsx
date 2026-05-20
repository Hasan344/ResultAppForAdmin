import { Layers, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSection } from "../context/SectionContext";

export function SectionSelector() {
  const { sections, sectionId, setSectionId, loading } = useSection();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const current = sections.find((s) => s.id === sectionId);
  const label = current?.name ?? "Bütün bölmələr";

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-left disabled:opacity-60"
      >
        <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Aktiv bölmə
          </div>
          <div className="text-sm font-semibold text-slate-900 truncate">
            {loading ? "Yüklənir…" : label}
          </div>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className="text-slate-400 shrink-0"
        >
          <path
            d="M3 5l3 3 3-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          <button
            onClick={() => {
              setSectionId(null);
              setOpen(false);
            }}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${
              sectionId === null ? "bg-brand-50/50" : ""
            }`}
          >
            <span className={sectionId === null ? "font-semibold text-brand-700" : ""}>
              Bütün bölmələr
            </span>
            {sectionId === null && (
              <Check className="w-4 h-4 text-brand-600 shrink-0" />
            )}
          </button>
          <div className="h-px bg-slate-100" />
          {sections.map((s) => {
            const active = s.id === sectionId;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSectionId(s.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${
                  active ? "bg-brand-50/50" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className={`truncate ${
                      active ? "font-semibold text-brand-700" : "text-slate-700"
                    }`}
                  >
                    {s.name}
                  </div>
                  {s.sectCode && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      {s.sectCode}
                    </div>
                  )}
                </div>
                {active && (
                  <Check className="w-4 h-4 text-brand-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
