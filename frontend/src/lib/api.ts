import axios, { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

export function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg ?? '').join('; ')
    return error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}

export interface UploadSummaryItem {
  ticker: string
  rows: number
}

export interface PortfolioItem {
  id: number
  name: string
  created_at: string
  weights: Record<string, number>
}

export interface OptimizationResponse {
  weights: Record<string, number>
  mu: number
  sigma: number
  sharpe: number
  growth?: number
  achieved_vol?: number
  scale?: number
  cash_weight?: number
  risk_contributions?: Record<string, number>
  efficient_frontier?: {
    target_returns: number[]
    vols: number[]
    sharpe: number[]
    weights: number[][]
  }
}

export interface PerformanceResponse {
  dates: string[]
  equity_curve: number[]
  drawdown_curve: number[]
  stats: {
    total_return: number
    annual_return: number
    annual_volatility: number
    sharpe: number
    sortino: number
    calmar: number
    max_drawdown: number
    var_95: number
    cvar_95: number
  }
}

export const useTickers = () =>
  useQuery({
    queryKey: ['tickers'],
    queryFn: async () => {
      const { data } = await client.get<{ tickers: string[] }>('/data/tickers')
      return data.tickers
    },
  })

export const useUploadCsv = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await client.post('/data/upload_csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.summary as UploadSummaryItem[]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickers'] })
    },
  })
}

export const usePortfolios = () =>
  useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const { data } = await client.get<{ portfolios: PortfolioItem[] }>('/portfolios')
      return data.portfolios
    },
  })

export const useSavePortfolio = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; weights: Record<string, number> }) => {
      const { data } = await client.post('/portfolios', payload)
      return data as { id: number; name: string; created_at: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    },
  })
}

export const useDeletePortfolio = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await client.delete(`/portfolios/${id}`)
      return data as { deleted: number }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    },
  })
}

export const runOptimization = async (strategy: string, payload: Record<string, unknown>) => {
  const { data } = await client.post(`/optimize/${strategy}`, payload)
  return data as OptimizationResponse
}

export const fetchCorrelation = async (tickers: string[]) => {
  const { data } = await client.get('/metrics/correlation', {
    params: { tickers },
    paramsSerializer: { indexes: null },
  })
  return data as { matrix: number[][]; tickers: string[] }
}

export const fetchPerformance = async (payload: {
  tickers: string[]
  weights: Record<string, number>
  risk_free?: number
  start_date?: string
  end_date?: string
}) => {
  const { data } = await client.post('/metrics/performance', payload)
  return data as PerformanceResponse
}

export interface AssetSummary {
  ticker: string
  name: string | null
  rows: number
  start_date: string | null
  end_date: string | null
}

export interface SeriesResponse {
  dates: string[]
  series: Record<string, number[]>
}

export interface AssetStats {
  ticker: string
  total_return: number
  annual_return: number
  annual_volatility: number
  sharpe: number
  max_drawdown: number
}

export const useAssets = () =>
  useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data } = await client.get<{ assets: AssetSummary[] }>('/data/assets')
      return data.assets
    },
  })

export const useDeleteAsset = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ticker: string) => {
      const { data } = await client.delete(`/data/assets/${ticker}`)
      return data as { deleted: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['tickers'] })
    },
  })
}

export const fetchPrices = async (tickers: string[], options?: { normalize?: boolean; start_date?: string; end_date?: string }) => {
  const { data } = await client.get('/data/prices', {
    params: { tickers, ...options },
    paramsSerializer: { indexes: null },
  })
  return data as SeriesResponse
}

export const fetchRollingVol = async (tickers: string[], window: number, options?: { start_date?: string; end_date?: string }) => {
  const { data } = await client.get('/metrics/rolling-vol', {
    params: { tickers, window, ...options },
    paramsSerializer: { indexes: null },
  })
  return data as SeriesResponse & { window: number }
}

export const fetchAssetStats = async (tickers: string[], options?: { risk_free?: number; start_date?: string; end_date?: string }) => {
  const { data } = await client.get('/metrics/asset-stats', {
    params: { tickers, ...options },
    paramsSerializer: { indexes: null },
  })
  return data as { stats: AssetStats[] }
}
