declare module 'plotly.js-dist-min'
declare module 'react-plotly.js/factory' {
  import { ComponentType } from 'react'

  interface PlotProps {
    data: Record<string, unknown>[]
    layout?: Record<string, unknown>
    config?: Record<string, unknown>
    style?: React.CSSProperties
    useResizeHandler?: boolean
  }

  export default function createPlotlyComponent(plotly: unknown): ComponentType<PlotProps>
}
