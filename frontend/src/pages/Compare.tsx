import { useState } from 'react'
import { Crown, GitCompare, Loader2, Play } from 'lucide-react'
import Chart, { CHART_COLORS } from '../components/Chart'
import {
  OptimizationResponse,
  PerformanceResponse,
  extractErrorMessage,
  fetchPerformance,
  runOptimization,
  useTickers,
} from '../lib/api'
import { useToast } from '../lib/toast'
import { formatNumber, formatPercent } from '../lib/format'

interface StrategyRun {
  id: string
  label: string
  response: OptimizationResponse
  performance?: PerformanceResponse
}

const STRATEGIES: { id: string; label: string; payload: (tickers: string[], rf: number) => Record<string, unknown> }[] = [
  {
    id: 'mean-variance',
    label: 'Max Sharpe',
    payload: (tickers, rf) => ({ tickers, risk_free: rf, method: 'max_sharpe' }),
  },
  {
    id: 'mean-variance-minvar',
    label: 'Min Variance',
    payload: (tickers, rf) => ({ tickers, risk_free: rf, method: 'min_variance' }),
  },
  {
    id: 'risk-parity',
    label: 'Risk Parity',
    payload: (tickers, rf) => ({ tickers, risk_free: rf }),
  },
  {
    id: 'kelly',
    label: 'Kelly (long only)',
    payload: (tickers, rf) => ({ tickers, risk_free: rf, long_only: true, fraction: 1 }),
  },
  {
    id: 'vol-target',
    label: 'Vol Target 10%',
    payload: (tickers, rf) => ({ tickers, risk_free: rf, target_vol: 0.1, lookback: 60, leverage_cap: 2 }),
  },
]

const endpointFor = (id: string) => (id === 'mean-variance-minvar' ? 'mean-variance' : id)

export default function Compare() {
  const { data: tickers } = useTickers()
  const toast = useToast()
  const [selected, setSelected] = useState<string[]>([])
  const [riskFree, setRiskFree] = useState(2.0)
  const [runs, setRuns] = useState<StrategyRun[]>([])
  const [loading, setLoading] = useState(false)

  const toggleTicker = (ticker: string) =>
    setSelected((prev) => (prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker]))

  const runAll = async () => {
    if (selected.length === 0) return
    setLoading(true)
    setRuns([])
    const rf = riskFree / 100
    const settled = await Promise.allSettled(
      STRATEGIES.map(async (strategy): Promise<StrategyRun> => {
        const response = await runOptimization(endpointFor(strategy.id), strategy.payload(selected, rf))
        let performance: PerformanceResponse | undefined
        try {
          performance = await fetchPerformance({ tickers: selected, weights: response.weights, risk_free: rf })
        } catch {
          performance = undefined
        }
        return { id: strategy.id, label: strategy.label, response, performance }
      }),
    )
    const ok: StrategyRun[] = []
    settled.forEach((res, i) => {
      if (res.status === 'fulfilled') ok.push(res.value)
      else toast.error(`${STRATEGIES[i].label} failed: ${extractErrorMessage(res.reason)}`)
    })
    setRuns(ok)
    if (ok.length > 0) toast.success(`Compared ${ok.length} strategies`)
    setLoading(false)
  }

  const bestSharpe = runs.length > 0 ? Math.max(...runs.map((r) => r.performance?.stats.sharpe ?? r.response.sharpe)) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Strategy Comparison</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Run every optimizer on the same universe and see which one earns its keep.
        </p>
      </div>

      <div className="card animate-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="label">Assets ({selected.length} selected)</span>
            <div className="flex flex-wrap gap-2">
              {tickers?.map((ticker) => (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => toggleTicker(ticker)}
                  className={`chip ${selected.includes(ticker) ? 'chip-active' : 'chip-inactive'}`}
                >
                  {ticker}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <label className="label" htmlFor="cmp-rf">Risk-free (%)</label>
              <input
                id="cmp-rf"
                type="number"
                step="0.1"
                value={riskFree}
                onChange={(e) => setRiskFree(Number(e.target.value))}
                className="input !w-24"
              />
            </div>
            <button type="button" className="btn-primary" onClick={runAll} disabled={selected.length === 0 || loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {loading ? 'Running…' : 'Run All Strategies'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-40" />
          ))}
        </div>
      )}

      {!loading && runs.length === 0 && (
        <div className="card flex flex-col items-center py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-900/40 dark:text-brand-300">
            <GitCompare size={28} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Five strategies, one verdict</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Select assets and run the shootout: Max Sharpe, Min Variance, Risk Parity, Kelly, and Vol Targeting — backtested side by side.
          </p>
        </div>
      )}

      {runs.length > 0 && !loading && (
        <div className="animate-fade-up space-y-6">
          <div className="card overflow-x-auto">
            <h3 className="card-title">Scoreboard</h3>
            <table className="table-base mt-2">
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th className="!text-right">Exp. Return</th>
                  <th className="!text-right">Volatility</th>
                  <th className="!text-right">Sharpe</th>
                  <th className="!text-right">Sortino</th>
                  <th className="!text-right">Max DD</th>
                  <th className="!text-right">Total Return</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const sharpe = run.performance?.stats.sharpe ?? run.response.sharpe
                  const best = bestSharpe !== null && sharpe === bestSharpe
                  return (
                    <tr key={run.id} className={best ? 'bg-brand-50/60 dark:bg-brand-900/20' : ''}>
                      <td className="font-semibold text-slate-800 dark:text-slate-100">
                        <span className="inline-flex items-center gap-1.5">
                          {best && <Crown size={14} className="text-amber-500" />}
                          {run.label}
                        </span>
                      </td>
                      <td className="text-right">{formatPercent(run.response.mu, 1)}</td>
                      <td className="text-right">{formatPercent(run.response.sigma, 1)}</td>
                      <td className="text-right font-semibold">{formatNumber(sharpe)}</td>
                      <td className="text-right">{run.performance ? formatNumber(run.performance.stats.sortino) : '—'}</td>
                      <td className="text-right text-rose-600 dark:text-rose-400">
                        {run.performance ? formatPercent(run.performance.stats.max_drawdown, 1) : '—'}
                      </td>
                      <td className="text-right">
                        {run.performance ? formatPercent(run.performance.stats.total_return, 1) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              Sharpe, Sortino, drawdown and total return come from the daily-rebalanced backtest over the full window.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h3 className="card-title">Backtest — Growth of $1</h3>
              <Chart
                data={runs
                  .filter((run) => run.performance)
                  .map((run, i) => ({
                    type: 'scatter',
                    mode: 'lines',
                    name: run.label,
                    x: run.performance!.dates,
                    y: run.performance!.equity_curve,
                    line: { color: CHART_COLORS[i % CHART_COLORS.length], width: 2 },
                  }))}
                layout={{ legend: { orientation: 'h', y: 1.14 }, hovermode: 'x unified' }}
                height={380}
              />
            </div>
            <div className="card">
              <h3 className="card-title">Weights by Strategy</h3>
              <Chart
                data={runs.map((run, i) => ({
                  type: 'bar',
                  name: run.label,
                  x: selected,
                  y: selected.map((t) => run.response.weights[t] ?? 0),
                  marker: { color: CHART_COLORS[i % CHART_COLORS.length] },
                }))}
                layout={{
                  barmode: 'group',
                  legend: { orientation: 'h', y: 1.14 },
                  yaxis: { tickformat: '.0%' },
                }}
                height={380}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
