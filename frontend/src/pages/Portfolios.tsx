import { FolderOpen, Loader2, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { extractErrorMessage, useDeletePortfolio, usePortfolios } from '../lib/api'
import { useToast } from '../lib/toast'
import { formatDate, formatPercent } from '../lib/format'
import { CHART_COLORS } from '../components/Chart'

export default function Portfolios() {
  const { data: portfolios, isLoading } = usePortfolios()
  const deletePortfolio = useDeletePortfolio()
  const toast = useToast()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Saved Portfolios</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Allocations you saved from the dashboard, newest first.
        </p>
      </div>

      {isLoading && (
        <div className="card flex items-center justify-center gap-3 py-16 text-slate-500 dark:text-slate-400">
          <Loader2 size={22} className="animate-spin text-brand-500" />
          Loading portfolios…
        </div>
      )}

      {!isLoading && (!portfolios || portfolios.length === 0) && (
        <div className="card flex flex-col items-center py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-900/40 dark:text-brand-300">
            <FolderOpen size={28} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Nothing saved yet</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Run an optimization on the dashboard and hit “Save” to keep the allocation here.
          </p>
          <Link to="/" className="btn-primary mt-5">Go to Dashboard</Link>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {portfolios?.map((portfolio) => {
          const weights = Object.entries(portfolio.weights).sort((a, b) => b[1] - a[1])
          return (
            <div key={portfolio.id} className="card animate-fade-up">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{portfolio.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{formatDate(portfolio.created_at)}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${portfolio.name}`}
                  onClick={() =>
                    deletePortfolio.mutate(portfolio.id, {
                      onSuccess: () => toast.success(`Deleted “${portfolio.name}”`),
                      onError: (err) => toast.error(extractErrorMessage(err)),
                    })
                  }
                  disabled={deletePortfolio.isLoading}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <ul className="mt-4 space-y-2.5">
                {weights.map(([ticker, weight], i) => (
                  <li key={ticker} className="flex items-center gap-3 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="w-14 font-semibold text-slate-700 dark:text-slate-200">{ticker}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${weight >= 0 ? 'bg-brand-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(Math.abs(weight) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-medium tabular-nums text-slate-600 dark:text-slate-300">
                      {formatPercent(weight, 1)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
