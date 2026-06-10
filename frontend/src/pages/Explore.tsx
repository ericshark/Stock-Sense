import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Compass } from 'lucide-react'
import Chart, { CHART_COLORS } from '../components/Chart'
import { extractErrorMessage, fetchAssetStats, fetchPrices, fetchRollingVol, useTickers } from '../lib/api'
import { formatNumber, formatPercent } from '../lib/format'

const VOL_WINDOWS = [21, 63, 126]

export default function Explore() {
  const { data: tickers } = useTickers()
  const [selected, setSelected] = useState<string[]>([])
  const [volWindow, setVolWindow] = useState(21)

  // Pre-select the first few tickers once data arrives so the page is alive immediately.
  useEffect(() => {
    if (tickers && tickers.length > 0 && selected.length === 0) {
      setSelected(tickers.slice(0, 3))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers])

  const enabled = selected.length > 0

  const pricesQuery = useQuery({
    queryKey: ['prices', selected],
    queryFn: () => fetchPrices(selected, { normalize: true }),
    enabled,
  })
  const volQuery = useQuery({
    queryKey: ['rolling-vol', selected, volWindow],
    queryFn: () => fetchRollingVol(selected, volWindow),
    enabled,
  })
  const statsQuery = useQuery({
    queryKey: ['asset-stats', selected],
    queryFn: () => fetchAssetStats(selected),
    enabled,
  })

  const toggleTicker = (ticker: string) =>
    setSelected((prev) => (prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Explore Assets</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Compare price paths, volatility regimes, and headline stats before you optimize.
        </p>
      </div>

      <div className="card animate-fade-up">
        <span className="label">Assets</span>
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
          {tickers && tickers.length === 0 && (
            <span className="text-sm text-slate-400">No data yet — upload a price CSV on the Data page.</span>
          )}
        </div>
      </div>

      {!enabled && tickers && tickers.length > 0 && (
        <div className="card flex flex-col items-center py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-900/40 dark:text-brand-300">
            <Compass size={28} />
          </span>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Pick at least one asset to explore.</p>
        </div>
      )}

      {enabled && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card animate-fade-up lg:col-span-2">
            <h3 className="card-title">Relative Performance (rebased to 100)</h3>
            {pricesQuery.isLoading && <div className="skeleton mt-3 h-72" />}
            {pricesQuery.isError && (
              <p className="mt-3 text-sm text-rose-500">{extractErrorMessage(pricesQuery.error)}</p>
            )}
            {pricesQuery.data && (
              <Chart
                data={Object.entries(pricesQuery.data.series).map(([ticker, values], i) => ({
                  type: 'scatter',
                  mode: 'lines',
                  name: ticker,
                  x: pricesQuery.data.dates,
                  y: values,
                  line: { color: CHART_COLORS[i % CHART_COLORS.length], width: 2 },
                  hovertemplate: `${ticker}: %{y:.1f}<extra></extra>`,
                }))}
                layout={{ legend: { orientation: 'h', y: 1.12 }, hovermode: 'x unified' }}
                height={380}
              />
            )}
          </div>

          <div className="card animate-fade-up">
            <div className="flex items-center justify-between">
              <h3 className="card-title">Rolling Volatility (annualized)</h3>
              <div className="flex gap-1">
                {VOL_WINDOWS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setVolWindow(w)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      volWindow === w
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    {w}d
                  </button>
                ))}
              </div>
            </div>
            {volQuery.isLoading && <div className="skeleton mt-3 h-64" />}
            {volQuery.isError && <p className="mt-3 text-sm text-rose-500">{extractErrorMessage(volQuery.error)}</p>}
            {volQuery.data && (
              <Chart
                data={Object.entries(volQuery.data.series).map(([ticker, values], i) => ({
                  type: 'scatter',
                  mode: 'lines',
                  name: ticker,
                  x: volQuery.data.dates,
                  y: values,
                  line: { color: CHART_COLORS[i % CHART_COLORS.length], width: 1.8 },
                  hovertemplate: `${ticker}: %{y:.1%}<extra></extra>`,
                }))}
                layout={{ legend: { orientation: 'h', y: 1.14 }, yaxis: { tickformat: '.0%' } }}
              />
            )}
          </div>

          <div className="card animate-fade-up overflow-x-auto">
            <h3 className="card-title">Asset Statistics</h3>
            {statsQuery.isLoading && <div className="skeleton mt-3 h-64" />}
            {statsQuery.isError && <p className="mt-3 text-sm text-rose-500">{extractErrorMessage(statsQuery.error)}</p>}
            {statsQuery.data && (
              <table className="table-base mt-2">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th className="!text-right">Total</th>
                    <th className="!text-right">Ann. Return</th>
                    <th className="!text-right">Ann. Vol</th>
                    <th className="!text-right">Sharpe</th>
                    <th className="!text-right">Max DD</th>
                  </tr>
                </thead>
                <tbody>
                  {statsQuery.data.stats.map((row) => (
                    <tr key={row.ticker}>
                      <td className="font-semibold text-slate-800 dark:text-slate-100">{row.ticker}</td>
                      <td className={`text-right ${row.total_return >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatPercent(row.total_return, 1)}
                      </td>
                      <td className="text-right">{formatPercent(row.annual_return, 1)}</td>
                      <td className="text-right">{formatPercent(row.annual_volatility, 1)}</td>
                      <td className="text-right">{formatNumber(row.sharpe)}</td>
                      <td className="text-right text-rose-600 dark:text-rose-400">{formatPercent(row.max_drawdown, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
