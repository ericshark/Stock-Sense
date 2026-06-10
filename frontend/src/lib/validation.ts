import { z } from 'zod'

export const optimizationSchema = z.object({
  tickers: z.array(z.string().min(1)).min(1),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  risk_free: z.number().min(-0.05).max(0.25).default(0.02),
})

export const meanVarianceSchema = optimizationSchema.extend({
  allow_short: z.boolean().default(false),
  bounds: z.tuple([z.number(), z.number()]).optional(),
  method: z.enum(['max_sharpe', 'min_variance', 'efficient_frontier']).default('max_sharpe'),
})

export const riskParitySchema = optimizationSchema

export const kellySchema = optimizationSchema.extend({
  long_only: z.boolean().default(true),
  fraction: z.number().gt(0).max(1).default(1),
})

export const volTargetSchema = optimizationSchema.extend({
  base: z.enum(['equal', 'mv_max_sharpe']).default('equal'),
  lookback: z.number().min(10).max(756).default(60),
  target_vol: z.number().min(0.01).max(1).default(0.1),
  leverage_cap: z.number().min(1).max(5).default(2),
})
