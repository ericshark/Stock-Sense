import { useState } from 'react'
import Controls from '../components/Controls'
import ResultsCard from '../components/ResultsCard'
import Chart from '../components/Chart'
import { runKelly, runMeanVariance, runVolTarget, fetchCorrelation } from '../lib/api'

interface ResultState {
  mu: number
  sigma: number
  sharpe: number
  weights: Record<string, number>
  extra?: Record<string, number>
  frontier?: { target_returns: number[]; vols: number[] }
  correlation?: number[][]
  tickers?: string[]
}

export default function Dashboard() {
  const [result, setResult] = useState<ResultState | null>(null)

  const onRun = async (strategy: string, payload: Record<string, unknown>) => {
    try {
      let response: any
      if (strategy === 'mean-variance') {
        response = await runMeanVariance(payload)
      } else if (strategy === 'kelly') {
        response = await runKelly(payload)
      } else {
        response = await runVolTarget(payload)
      }
      const corr = await fetchCorrelation(payload.tickers as string[])
      setResult({
        mu: response.mu,
        sigma: response.sigma,
        sharpe: response.sharpe,
        weights: response.weights,
        extra: {
          ...(response.growth ? { growth: response.growth } : {}),
          ...(response.achieved_vol ? { achieved_vol: response.achieved_vol } : {}),
        },
        frontier: response.efficient_frontier,
        correlation: corr.matrix,
        tickers: corr.tickers,
      })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Portfolio Dashboard</h1>
      <Controls onRun={onRun} />
      {result && (
        <div className="grid gap-6 md:grid-cols-2">
          <ResultsCard mu={result.mu} sigma={result.sigma} sharpe={result.sharpe} extra={result.extra} />
          <div className="rounded border border-slate-200 bg-white p-4">
            <h3 className="font-semibold">Allocations</h3>
            <Chart
              data={[
                {
                  type: 'bar',
                  x: Object.keys(result.weights),
                  y: Object.values(result.weights),
                },
              ]}
            />
          </div>
          {result.frontier && (
            <div className="rounded border border-slate-200 bg-white p-4">
              <h3 className="font-semibold">Efficient Frontier</h3>
              <Chart
                data={[
                  {
                    type: 'scatter',
                    mode: 'lines+markers',
                    x: result.frontier.vols,
                    y: result.frontier.target_returns,
                  },
                ]}
                layout={{ xaxis: { title: 'Volatility' }, yaxis: { title: 'Return' } }}
              />
            </div>
          )}
          {result.correlation && result.tickers && (
            <div className="rounded border border-slate-200 bg-white p-4">
              <h3 className="font-semibold">Correlation</h3>
              <Chart
                data={[
                  {
                    z: result.correlation,
                    x: result.tickers,
                    y: result.tickers,
                    type: 'heatmap',
                  } as any,
                ]}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
