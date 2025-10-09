import { Route, Routes } from 'react-router-dom'
import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Portfolios from './pages/Portfolios'
import Layout from './components/Layout'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/portfolios" element={<Portfolios />} />
      </Routes>
    </Layout>
  )
}
