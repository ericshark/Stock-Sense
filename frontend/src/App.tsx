import { Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Explore from './pages/Explore'
import Compare from './pages/Compare'
import Data from './pages/Data'
import Portfolios from './pages/Portfolios'
import Layout from './components/Layout'
import { ThemeProvider } from './lib/theme'
import { ToastProvider } from './lib/toast'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/data" element={<Data />} />
            <Route path="/upload" element={<Navigate to="/data" replace />} />
            <Route path="/portfolios" element={<Portfolios />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </ThemeProvider>
  )
}
