import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/index'
import Leads from './pages/leads'
import Summary from './pages/summary'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/summary" element={<Summary />} />
      </Routes>
    </Layout>
  )
}

export default App