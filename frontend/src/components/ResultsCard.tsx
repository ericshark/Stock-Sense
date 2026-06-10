import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
  tone?: 'default' | 'positive' | 'negative'
}

export default function StatCard({ label, value, hint, icon, tone = 'default' }: StatCardProps) {
  const valueColor =
    tone === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'negative'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-slate-900 dark:text-white'

  return (
    <div className="card flex items-start justify-between gap-3 !p-4">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      </div>
      {icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
          {icon}
        </span>
      )}
    </div>
  )
}
