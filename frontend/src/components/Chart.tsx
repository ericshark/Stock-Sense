import Plotly from 'plotly.js-dist-min'
import createPlotlyComponent from 'react-plotly.js/factory'
import { useTheme } from '../lib/theme'

const Plot = createPlotlyComponent(Plotly)

export const CHART_COLORS = [
  '#6366f1', '#22d3ee', '#f59e0b', '#34d399', '#f472b6',
  '#a78bfa', '#fb7185', '#38bdf8', '#fbbf24', '#4ade80',
]

interface ChartProps {
  data: Record<string, unknown>[]
  layout?: Record<string, unknown>
  config?: Record<string, unknown>
  height?: number
}

export default function Chart({ data, layout, config, height = 320 }: ChartProps) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const axisColor = dark ? '#334155' : '#e2e8f0'
  const fontColor = dark ? '#94a3b8' : '#64748b'

  const baseAxis = {
    gridcolor: axisColor,
    zerolinecolor: axisColor,
    linecolor: axisColor,
  }

  return (
    <Plot
      data={data}
      layout={{
        autosize: true,
        height,
        margin: { t: 16, r: 16, b: 48, l: 56 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: 'Inter, system-ui, sans-serif', color: fontColor, size: 12 },
        colorway: CHART_COLORS,
        xaxis: { ...baseAxis, ...((layout?.xaxis as object) ?? {}) },
        yaxis: { ...baseAxis, ...((layout?.yaxis as object) ?? {}) },
        ...Object.fromEntries(Object.entries(layout ?? {}).filter(([k]) => k !== 'xaxis' && k !== 'yaxis')),
      }}
      config={{ displayModeBar: false, responsive: true, ...config }}
      style={{ width: '100%' }}
      useResizeHandler
    />
  )
}
