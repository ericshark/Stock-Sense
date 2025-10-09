import Plot from 'react-plotly.js'

interface ChartProps {
  data: Plotly.Data[]
  layout?: Partial<Plotly.Layout>
  config?: Partial<Plotly.Config>
}

export default function Chart({ data, layout, config }: ChartProps) {
  return <Plot data={data} layout={{ autosize: true, ...layout }} config={config} style={{ width: '100%', height: '100%' }} />
}
