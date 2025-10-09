import { useEffect, useState } from 'react'
import axios from 'axios'

interface PortfolioItem {
  id: number
  name: string
  created_at: string
  weights: Record<string, number>
}

export default function Portfolios() {
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([])

  useEffect(() => {
    axios.get('/api/portfolios').then((res) => setPortfolios(res.data.portfolios))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Saved Portfolios</h1>
      <div className="grid gap-4">
        {portfolios.map((portfolio) => (
          <div key={portfolio.id} className="rounded border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{portfolio.name}</h3>
              <span className="text-xs text-slate-500">{new Date(portfolio.created_at).toLocaleString()}</span>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {Object.entries(portfolio.weights).map(([ticker, weight]) => (
                <li key={ticker} className="flex justify-between">
                  <span>{ticker}</span>
                  <span>{weight.toFixed(3)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {portfolios.length === 0 && <p className="text-sm text-slate-500">No portfolios saved yet.</p>}
      </div>
    </div>
  )
}
