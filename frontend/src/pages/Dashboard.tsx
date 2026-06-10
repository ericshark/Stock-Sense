import { useState } from 'react'
import {
  Activity,
  AlertCircle,
  BookmarkPlus,
  Check,
  Copy,
  Download,
  Percent,
  TrendingDown,
  TrendingUp,
  Waves,
} from 'lucide-react'
import Controls from '../components/Controls'
import StatCard from '../components/ResultsCard'
import Chart, { CHART_COLORS } from '../components/Chart'
import {
  OptimizationResponse,
  PerformanceResponse,
  extractErrorMessage,
  fetchCorrelation,
  fetchPerformance,
  runOptimization,
  useSavePortfolio,
} from '../lib/api'
import { useToast } from '../lib/toast'
import { formatNumber, formatPercent } from '../lib/format'

interface ResultState {
  strategy: string
  response: OptimizationResponse
  correlation?: { matrix: number[][]; tickers: string[] }
  performance?: PerformanceResponse
}

const strategyTitles: Record<string, string> = {
  'mean-variance': 'Mean-Variance',
  'risk-parity': 'Risk Parity',
  kelly: 'Kelly Criterion',
  'vol-target': 'Volatility Targeting',
}

const pct = (v: number) => formatPercent(v)
const pct1 = (v: number) => formatPercent(v, 1)
const num = (v: number) => formatNumber(v)

export default function Dashboard() {
  const [result, setResult] = useState<ResultState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [portfolioName, setPortfolioName] = useState('')
  const savePortfolio = useSavePortfolio()
  const toast = useToast()

  const onRun = async (strategy: string, payload: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    savePortfolio.reset()
    try {
      const response = await runOptimization(strategy, payload)
      const tickers = payload.tickers as string[]
      const [correlation, performance] = await Promise.allSettled([
        fetchCorrelation(tickers),
        fetchPerformance({
          tickers,
          weights: response.weights,
          risk_free: payload.risk_free as number | undefined,
          start_date: payload.start_date as string | undefined,
          end_date: payload.end_date as string | undefined,
        }),
      ])
      setResult({
        strategy,
        response,
        correlation: correlation.status === 'fulfilled' ? correlation.value : undefined,
        performance: performance.status === 'fulfilled' ? performance.value : undefined,
      })
    } catch (err) {
      setError(extractErrorMessage(err))
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const onSave = () => {
    if (!result || !portfolioName.trim()) return
    savePortfolio.mutate(
      { name: portfolioName.trim(), weights: result.response.weights },
      {
        onSuccess: (data) => toast.success(`Saved “${data.name}” to portfolios`),
        onError: (err) => toast.error(extractErrorMessage(err)),
      },
    )
  }

  const copyWeights = async () => {
    if (!result) return
    await navigator.clipboard.writeText(JSON.stringify(result.response.weights, null, 2))
    toast.success('Weights copied as JSON')
  }

  const downloadWeights = () => {
    if (!result) return
    const rows = Object.entries(result.response.weights)
      .map(([t, w]) => `${t},${w.toFixed(6)}`)
      .join('\n')
    const blob = new Blob([`ticker,weight\n${rows}\n`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stocksense-${result.strategy}-weights.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const weights = result ? Object.entries(result.response.weights).sort((a, b) => b[1] - a[1]) : []
  const stats = result?.performance?.stats
  const frontier = result?.response.efficient_frontier

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Portfolio Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Optimize allocations, inspect risk, and backtest the result — all from your uploaded price history.
        </p>
      </div>

      <Controls onRun={onRun} loading={loading} />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {!result && !loading && !error && (
        <div className="card flex flex-col items-center py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-900/40 dark:text-brand-300">
            <Activity size={28} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Ready when you are</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Select at least one asset and run a strategy. Results, risk analytics, and a backtest will appear here.
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-24" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="skeleton h-96" />
            <div className="skeleton h-96" />
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="animate-fade-up space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {strategyTitles[result.strategy] ?? result.strategy} Result
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-ghost !px-2.5" title="Copy weights as JSON" onClick={copyWeights}>
                <Copy size={15} />
              </button>
              <button type="button" className="btn-ghost !px-2.5" title="Download weights as CSV" onClick={downloadWeights}>
                <Download size={15} />
              </button>
              <input
                type="text"
                placeholder="Portfolio name"
                value={portfolioName}
                onChange={(e) => setPortfolioName(e.target.value)}
                className="input !w-44"
              />
              <button
                type="button"
                className="btn-primary"
                onClick={onSave}
                disabled={!portfolioName.trim() || savePortfolio.isLoading}
              >
                {savePortfolio.isSuccess ? <Check size={16} /> : <BookmarkPlus size={16} />}
                {savePortfolio.isSuccess ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Expected Return"
              value={result.response.mu}
              format={pct}
              hint="Annualized"
              icon={<TrendingUp size={18} />}
              tone={result.response.mu >= 0 ? 'positive' : 'negative'}
            />
            <StatCard label="Volatility" value={result.response.sigma} format={pct} hint="Annualized σ" icon={<Waves size={18} />} />
            <StatCard
              label="Sharpe Ratio"
              value={result.response.sharpe}
              format={num}
              hint="Excess return / risk"
              icon={<Percent size={18} />}
            />
            {stats ? (
              <StatCard
                label="Max Drawdown"
                value={stats.max_drawdown}
                format={pct}
                hint="Backtest, daily rebalance"
                icon={<TrendingDown size={18} />}
                tone="negative"
              />
            ) : (
              <StatCard label="Assets" value={weights.length} format={(v) => String(Math.round(v))} hint="In the optimized portfolio" />
            )}
          </div>

          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Return" value={stats.total_return} format={pct} hint="Over selected window" tone={stats.total_return >= 0 ? 'positive' : 'negative'} />
              <StatCard label="Sortino" value={stats.sortino} format={num} hint="Downside-risk adjusted" />
              <StatCard label="Calmar" value={stats.calmar} format={num} hint="Return / max drawdown" />
              <StatCard label="CVaR 95%" value={stats.cvar_95} format={pct} hint="Avg. of worst 5% days" tone="negative" />
            </div>
          )}

          {(result.response.growth !== undefined || result.response.achieved_vol !== undefined) && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {result.response.growth !== undefined && (
                <StatCard label="Expected Log-Growth" value={result.response.growth} format={pct} hint="Kelly objective g" />
              )}
              {result.response.achieved_vol !== undefined && (
                <StatCard label="Achieved Vol" value={result.response.achieved_vol} format={pct} hint="After scaling" />
              )}
              {result.response.scale !== undefined && (
                <StatCard label="Exposure Scale" value={result.response.scale} format={(v) => `${formatNumber(v)}×`} hint="Applied to base weights" />
              )}
              {result.response.cash_weight !== undefined && (
                <StatCard label="Cash Weight" value={result.response.cash_weight} format={pct} hint="Earns the risk-free rate" />
              )}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h3 className="card-title">Allocation</h3>
              <Chart
                data={[
                  {
                    type: 'pie',
                    hole: 0.55,
                    labels: weights.map(([t]) => t),
                    values: weights.map(([, w]) => Math.abs(w)),
                    textinfo: 'label+percent',
                    marker: { colors: CHART_COLORS },
                    sort: false,
                  },
                ]}
                layout={{ showlegend: false, margin: { t: 24, b: 24, l: 24, r: 24 } }}
              />
              <ul className="mt-2 space-y-2">
                {weights.map(([ticker, weight], i) => (
                  <li key={ticker} className="flex items-center gap-3 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="w-14 font-semibold text-slate-700 dark:text-slate-200">{ticker}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${weight >= 0 ? 'bg-brand-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(Math.abs(weight) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-medium tabular-nums text-slate-600 dark:text-slate-300">
                      {pct1(weight)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {frontier && (
              <div className="card">
                <h3 className="card-title">Efficient Frontier</h3>
                <Chart
                  data={[
                    {
                      type: 'scatter',
                      mode: 'lines+markers',
                      name: 'Frontier',
                      x: frontier.vols,
                      y: frontier.target_returns,
                      line: { color: '#6366f1', width: 2 },
                      marker: { size: 5 },
                      hovertemplate: 'σ %{x:.1%}<br>μ %{y:.1%}<extra></extra>',
                    },
                    {
                      type: 'scatter',
                      mode: 'markers',
                      name: 'Optimal',
                      x: [result.response.sigma],
                      y: [result.response.mu],
                      marker: { color: '#f59e0b', size: 14, symbol: 'star' },
                      hovertemplate: 'Max Sharpe<br>σ %{x:.1%}<br>μ %{y:.1%}<extra></extra>',
                    },
                  ]}
                  layout={{
                    showlegend: false,
                    xaxis: { title: { text: 'Volatility' }, tickformat: '.0%' },
                    yaxis: { title: { text: 'Return' }, tickformat: '.0%' },
                  }}
                  height={380}
                />
              </div>
            )}

            {result.response.risk_contributions && (
              <div className="card">
                <h3 className="card-title">Risk Contributions</h3>
                <Chart
                  data={[
                    {
                      type: 'bar',
                      x: Object.keys(result.response.risk_contributions),
                      y: Object.values(result.response.risk_contributions),
                      marker: { color: '#22d3ee' },
                      hovertemplate: '%{x}: %{y:.1%}<extra></extra>',
                    },
                  ]}
                  layout={{ yaxis: { title: { text: 'Share of portfolio risk' }, tickformat: '.0%' } }}
                />
              </div>
            )}

            {result.correlation && (
              <div className="card">
                <h3 className="card-title">Return Correlation</h3>
                <Chart
                  data={[
                    {
                      type: 'heatmap',
                      z: result.correlation.matrix,
                      x: result.correlation.tickers,
                      y: result.correlation.tickers,
                      zmin: -1,
                      zmax: 1,
                      colorscale: 'RdBu',
                      reversescale: true,
                      hovertemplate: '%{x} × %{y}: %{z:.2f}<extra></extra>',
                    },
                  ]}
                  height={380}
                />
              </div>
            )}
          </div>

          {result.performance && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card">
                <h3 className="card-title">Backtest — Growth of $1</h3>
                <Chart
                  data={[
                    {
                      type: 'scatter',
                      mode: 'lines',
                      x: result.performance.dates,
                      y: result.performance.equity_curve,
                      line: { color: '#34d399', width: 2 },
                      fill: 'tozeroy',
                      fillcolor: 'rgba(52,211,153,0.08)',
                      hovertemplate: '%{x}<br>$%{y:.3f}<extra></extra>',
                    },
                  ]}
                />
              </div>
              <div className="card">
                <h3 className="card-title">Drawdown</h3>
                <Chart
                  data={[
                    {
                      type: 'scatter',
                      mode: 'lines',
                      x: result.performance.dates,
                      y: result.performance.drawdown_curve,
                      line: { color: '#fb7185', width: 2 },
                      fill: 'tozeroy',
                      fillcolor: 'rgba(251,113,133,0.12)',
                      hovertemplate: '%{x}<br>%{y:.1%}<extra></extra>',
                    },
                  ]}
                  layout={{ yaxis: { tickformat: '.0%' } }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
