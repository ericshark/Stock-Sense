import { useMemo, useState } from 'react'
import { useTickers } from '../lib/api'
import { meanVarianceSchema, kellySchema, volTargetSchema } from '../lib/validation'

interface ControlsProps {
  onRun: (strategy: string, payload: Record<string, unknown>) => void
}

const strategies = ['mean-variance', 'kelly', 'vol-target'] as const

type Strategy = (typeof strategies)[number]

export default function Controls({ onRun }: ControlsProps) {
  const { data: tickers } = useTickers()
  const [selected, setSelected] = useState<string[]>([])
  const [riskFree, setRiskFree] = useState(0.02)
  const [strategy, setStrategy] = useState<Strategy>('mean-variance')

  const basePayload = useMemo(
    () => ({
      tickers: selected,
      risk_free: riskFree,
    }),
    [selected, riskFree],
  )

  const run = () => {
    if (selected.length === 0) return
    let payload: Record<string, unknown> = basePayload
    if (strategy === 'mean-variance') {
      payload = meanVarianceSchema.parse({ ...basePayload, method: 'max_sharpe' })
    } else if (strategy === 'kelly') {
      payload = kellySchema.parse(basePayload)
    } else {
      payload = volTargetSchema.parse({ ...basePayload, target_vol: 0.1 })
    }
    onRun(strategy, payload)
  }

  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-800">Controls</h2>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <label className="font-medium text-slate-600">Tickers</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {tickers?.map((ticker) => {
              const active = selected.includes(ticker)
              return (
                <button
                  key={ticker}
                  type="button"
                  onClick={() =>
                    setSelected((prev) =>
                      prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker],
                    )
                  }
                  className={`rounded border px-3 py-1 ${active ? 'border-blue-500 bg-blue-100' : 'border-slate-300'}`}
                >
                  {ticker}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label className="font-medium text-slate-600">Risk-free rate</label>
          <input
            type="number"
            step="0.001"
            value={riskFree}
            onChange={(event) => setRiskFree(Number(event.target.value))}
            className="mt-1 w-24 rounded border border-slate-300 px-2 py-1"
          />
        </div>
        <div>
          <label className="font-medium text-slate-600">Strategy</label>
          <div className="mt-2 flex gap-2">
            {strategies.map((name) => (
              <button
                key={name}
                type="button"
                className={`rounded border px-3 py-1 text-xs uppercase ${
                  strategy === name ? 'border-blue-500 bg-blue-100' : 'border-slate-300'
                }`}
                onClick={() => setStrategy(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={run}
          className="mt-3 w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={selected.length === 0}
        >
          Run Optimization
        </button>
      </div>
    </div>
  )
}
