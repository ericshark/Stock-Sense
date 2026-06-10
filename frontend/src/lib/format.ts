export const formatPercent = (value: number, digits = 2) =>
  `${(value * 100).toFixed(digits)}%`

export const formatNumber = (value: number, digits = 2) => value.toFixed(digits)

export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
