interface MetricCardProps {
  mu: number
  sigma: number
  sharpe: number
  extra?: Record<string, number>
}

export default function ResultsCard({ mu, sigma, sharpe, extra }: MetricCardProps) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800">Portfolio Metrics</h3>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-slate-500">Annual Return (μ)</dt>
          <dd className="font-semibold">{mu.toFixed(4)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Annual Volatility (σ)</dt>
          <dd className="font-semibold">{sigma.toFixed(4)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Sharpe Ratio</dt>
          <dd className="font-semibold">{sharpe.toFixed(3)}</dd>
        </div>
        {extra &&
          Object.entries(extra).map(([key, value]) => (
            <div key={key}>
              <dt className="text-slate-500 capitalize">{key.replace('_', ' ')}</dt>
              <dd className="font-semibold">{value.toFixed(4)}</dd>
            </div>
          ))}
      </dl>
    </div>
  )
}
