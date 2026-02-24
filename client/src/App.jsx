import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { loadModels } from './utils/faceApi'

import Dashboard  from './pages/Dashboard'
import Register   from './pages/Register'
import Attendance from './pages/Attendance'
import Students   from './pages/Students'

export default function App() {
  const [modelsReady, setModelsReady] = useState(false)
  const [modelError, setModelError]   = useState(null)

  useEffect(() => {
    loadModels()
      .then(() => setModelsReady(true))
      .catch(err => {
        console.error(err)
        setModelError(err.message)
      })
  }, [])

  const navItems = [
    { to: '/',           label: 'Dashboard',  icon: '📊' },
    { to: '/register',   label: 'Register',   icon: '➕' },
    { to: '/attendance', label: 'Attendance', icon: '📷' },
    { to: '/students',   label: 'Students',   icon: '👥' },
  ]

  return (
    <BrowserRouter>
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>Face Recognition</span>
          <h2>Attendance System</h2>
        </div>

        <nav>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Model status indicator */}
        <div style={{ marginTop: 'auto', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: modelError ? 'var(--danger)' : modelsReady ? 'var(--success)' : 'var(--warning)',
              display: 'inline-block', flexShrink: 0
            }} />
            <span style={{ color: 'var(--muted)' }}>
              {modelError ? 'Models failed' : modelsReady ? 'AI models ready' : 'Loading models…'}
            </span>
          </div>
          {modelError && (
            <p style={{ color: 'var(--danger)', fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>
              {modelError}
            </p>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content">
        {!modelsReady && !modelError ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted)', marginTop: 40 }}>
            <span className="spinner" />
            Loading AI face detection models…
          </div>
        ) : (
          <Routes>
            <Route path="/"           element={<Dashboard />}  />
            <Route path="/register"   element={<Register />}   />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/students"   element={<Students />}   />
          </Routes>
        )}
      </main>
    </div>
    </BrowserRouter>
  )
}