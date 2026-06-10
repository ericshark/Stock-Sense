import { useState } from 'react'
import { BarChart3, Loader2, Play, Scale, Sigma, Target } from 'lucide-react'
import { useTickers } from '../lib/api'
import { kellySchema, meanVarianceSchema, riskParitySchema, volTargetSchema } from '../lib/validation'

interface ControlsProps {
  onRun: (strategy: string, payload: Record<string, unknown>) => void
  loading?: boolean
}

const strategies = [
  {
    id: 'mean-variance',
    label: 'Mean-Variance',
    icon: BarChart3,
    description: 'Markowitz max-Sharpe or minimum-variance frontier',
  },
  {
    id: 'risk-parity',
    label: 'Risk Parity',
    icon: Scale,
    description: 'Equal risk contribution from every asset',
  },
  {
    id: 'kelly',
    label: 'Kelly',
    icon: Sigma,
    description: 'Growth-optimal sizing from Σ⁻¹(μ − rf)',
  },
  {
    id: 'vol-target',
    label: 'Vol Target',
    icon: Target,
    description: 'Scale exposure to hit a target volatility',
  },
] as const

type StrategyId = (typeof strategies)[number]['id']

export default function Controls({ onRun, loading = false }: ControlsProps) {
  const { data: tickers, isLoading: tickersLoading } = useTickers()
  const [selected, setSelected] = useState<string[]>([])
  const [strategy, setStrategy] = useState<StrategyId>('mean-variance')
  const [riskFree, setRiskFree] = useState(2.0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  // Strategy-specific knobs
  const [mvMethod, setMvMethod] = useState<'max_sharpe' | 'min_variance' | 'efficient_frontier'>('efficient_frontier')
  const [allowShort, setAllowShort] = useState(false)
  const [kellyFraction, setKellyFraction] = useState(0.5)
  const [longOnly, setLongOnly] = useState(true)
  const [targetVol, setTargetVol] = useState(10)
  const [lookback, setLookback] = useState(60)
  const [leverageCap, setLeverageCap] = useState(2)

  const toggleTicker = (ticker: string) =>
    setSelected((prev) => (prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker]))

  const run = () => {
    if (selected.length === 0) return
    const base = {
      tickers: selected,
      risk_free: riskFree / 100,
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    }
    let payload: Record<string, unknown>
    if (strategy === 'mean-variance') {
      payload = meanVarianceSchema.parse({ ...base, method: mvMethod, allow_short: allowShort })
    } else if (strategy === 'risk-parity') {
      payload = riskParitySchema.parse(base)
    } else if (strategy === 'kelly') {
      payload = kellySchema.parse({ ...base, long_only: longOnly, fraction: kellyFraction })
    } else {
      payload = volTargetSchema.parse({
        ...base,
        target_vol: targetVol / 100,
        lookback,
        leverage_cap: leverageCap,
      })
    }
    onRun(strategy, payload)
  }

  return (
    <div className="card animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Optimization Setup</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Pick assets, choose a strategy, then run.
          </p>
        </div>
        <button type="button" onClick={run} className="btn-primary" disabled={selected.length === 0 || loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {loading ? 'Optimizing…' : 'Run Optimization'}
        </button>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <span className="label mb-0">Assets ({selected.length} selected)</span>
            {tickers && tickers.length > 0 && (
              <div className="flex gap-3 text-xs font-medium">
                <button type="button" className="text-brand-600 hover:underline dark:text-brand-400" onClick={() => setSelected(tickers)}>
                  Select all
                </button>
                <button type="button" className="text-slate-400 hover:underline" onClick={() => setSelected([])}>
                  Clear
                </button>
              </div>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {tickersLoading && <span className="text-sm text-slate-400">Loading tickers…</span>}
            {!tickersLoading && (!tickers || tickers.length === 0) && (
              <span className="text-sm text-slate-400">No data yet — upload a price CSV first.</span>
            )}
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

        <div>
          <span className="label">Strategy</span>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {strategies.map(({ id, label, icon: Icon, description }) => {
              const active = strategy === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStrategy(id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/30'
                      : 'border-slate-200 hover:border-brand-300 dark:border-slate-800 dark:hover:border-brand-700'
                  }`}
                >
                  <span className={`flex items-center gap-2 text-sm font-semibold ${active ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'}`}>
                    <Icon size={15} />
                    {label}
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-slate-500 dark:text-slate-400">{description}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="risk-free">Risk-free rate (%)</label>
            <input
              id="risk-free"
              type="number"
              step="0.1"
              min="-5"
              max="25"
              value={riskFree}
              onChange={(e) => setRiskFree(Number(e.target.value))}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="start-date">Start date</label>
            <input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="end-date">End date</label>
            <input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          </div>

          {strategy === 'mean-variance' && (
            <>
              <div>
                <label className="label" htmlFor="mv-method">Objective</label>
                <select id="mv-method" value={mvMethod} onChange={(e) => setMvMethod(e.target.value as typeof mvMethod)} className="input">
                  <option value="efficient_frontier">Max Sharpe + frontier</option>
                  <option value="max_sharpe">Max Sharpe</option>
                  <option value="min_variance">Minimum variance</option>
                </select>
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={allowShort} onChange={(e) => setAllowShort(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
                Allow shorting (−30%)
              </label>
            </>
          )}

          {strategy === 'kelly' && (
            <>
              <div>
                <label className="label" htmlFor="kelly-fraction">Kelly fraction ({kellyFraction.toFixed(2)})</label>
                <input
                  id="kelly-fraction"
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={kellyFraction}
                  onChange={(e) => setKellyFraction(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-600"
                />
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={longOnly} onChange={(e) => setLongOnly(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
                Long only
              </label>
            </>
          )}

          {strategy === 'vol-target' && (
            <>
              <div>
                <label className="label" htmlFor="target-vol">Target vol (%)</label>
                <input id="target-vol" type="number" step="1" min="1" max="100" value={targetVol} onChange={(e) => setTargetVol(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="lookback">Lookback (days)</label>
                <input id="lookback" type="number" step="5" min="10" max="756" value={lookback} onChange={(e) => setLookback(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="leverage-cap">Leverage cap</label>
                <input id="leverage-cap" type="number" step="0.25" min="1" max="5" value={leverageCap} onChange={(e) => setLeverageCap(Number(e.target.value))} className="input" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
