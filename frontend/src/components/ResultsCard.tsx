import { ReactNode } from 'react'
import { useCountUp } from '../lib/useCountUp'

interface StatCardProps {
  label: string
  value: number
  format: (value: number) => string
  hint?: string
  icon?: ReactNode
  tone?: 'default' | 'positive' | 'negative'
}

export default function StatCard({ label, value, format, hint, icon, tone = 'default' }: StatCardProps) {
  const animated = useCountUp(value)
  const valueColor =
    tone === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'negative'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-slate-900 dark:text-white'

  return (
    <div className="card card-hover flex items-start justify-between gap-3 !p-4">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${valueColor}`}>{format(animated)}</p>
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
