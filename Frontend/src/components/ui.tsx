import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function PageHeader({
  title,
  description,
  icon,
  actions
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-4">
        {icon && (
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center shadow-sm">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = "brand",
  hint
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "brand" | "success" | "danger" | "neutral" | "amber";
  hint?: string;
}) {
  const tones = {
    brand: "from-brand-50 to-white text-brand-700 ring-brand-100",
    success: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
    danger: "from-rose-50 to-white text-rose-700 ring-rose-100",
    neutral: "from-slate-50 to-white text-slate-700 ring-slate-100",
    amber: "from-amber-50 to-white text-amber-700 ring-amber-100"
  };
  const iconBg = {
    brand: "bg-brand-100 text-brand-600",
    success: "bg-emerald-100 text-emerald-600",
    danger: "bg-rose-100 text-rose-600",
    neutral: "bg-slate-100 text-slate-600",
    amber: "bg-amber-100 text-amber-600"
  };
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tones[tone]} ring-1 ring-inset p-5 shadow-soft`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </div>
          <div className="text-3xl font-bold tabular-nums mt-2 text-slate-900">
            {value}
          </div>
          {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg[tone]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="text-center py-16 px-4">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>
      )}
    </div>
  );
}

export function LoadingState({ label = "Yüklənir…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-slate-100 via-slate-200/60 to-slate-100 rounded-lg ${className}`}
    />
  );
}
