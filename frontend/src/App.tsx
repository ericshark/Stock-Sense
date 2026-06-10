import { Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Portfolios from './pages/Portfolios'
import Layout from './components/Layout'
import { ThemeProvider } from './lib/theme'

export default function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/portfolios" element={<Portfolios />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}
