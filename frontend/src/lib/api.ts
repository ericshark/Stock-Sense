import axios from 'axios'
import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query'

const client = axios.create({
  baseURL: '/api',
})

export const useTickers = () =>
  useQuery({
    queryKey: ['tickers'],
    queryFn: async () => {
      const { data } = await client.get<{ tickers: string[] }>('/data/tickers')
      return data.tickers
    },
  })

export const useUploadCsv = () =>
  useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await client.post('/data/upload_csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.summary as { ticker: string; rows: number }[]
    },
  })

export interface OptimizationParams {
  tickers: string[]
  start_date?: string
  end_date?: string
  risk_free?: number
}

export const runMeanVariance = async (payload: Record<string, unknown>) => {
  const { data } = await client.post('/optimize/mean-variance', payload)
  return data
}

export const runKelly = async (payload: Record<string, unknown>) => {
  const { data } = await client.post('/optimize/kelly', payload)
  return data
}

export const runVolTarget = async (payload: Record<string, unknown>) => {
  const { data } = await client.post('/optimize/vol-target', payload)
  return data
}

export const fetchCorrelation = async (tickers: string[]) => {
  const { data } = await client.get('/metrics/correlation', {
    params: { tickers },
  })
  return data as { matrix: number[][]; tickers: string[] }
}
