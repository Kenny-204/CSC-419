/**
 * Students.jsx
 * List all registered students + their attendance stats.
 */

import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Students() {
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [deleting, setDeleting] = useState(null)
  const [backendDown, setBackendDown] = useState(false)

  useEffect(() => { fetchStudents() }, [])

  async function fetchStudents() {
    setLoading(true)
    setBackendDown(false)
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/students?includeStats=true`)
      setStudents(Array.isArray(data) ? data : [])
    } catch {
      setBackendDown(true)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  async function deleteStudent(id, name) {
    if (!confirm(`Remove ${name}? This will also delete their attendance history.`)) return
    setDeleting(id)
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/students/${id}`)
      setStudents(prev => prev.filter(s => s.id !== id))
    } catch {
      alert('Could not delete student. Is the backend running?')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.matricNumber?.toLowerCase().includes(search.toLowerCase()) ||
    s.courseCode?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h1>Registered Students</h1>
        <p>{students.length} student(s) in the system</p>
      </div>

      {backendDown && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          ⚠ Backend API not reachable. Start your Node.js server on port 5000.
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-16" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, maxWidth: 320 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, matric number, or course…"
              />
            </div>
          </div>
          <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={fetchStudents}>↺ Refresh</button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '24px 0', color: 'var(--muted)' }}>
            <span className="spinner" /> Loading students…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>👥</p>
            {students.length === 0
              ? <><p style={{ fontSize: 14 }}>No students registered yet</p>
                  <p style={{ fontSize: 13, marginTop: 6 }}>Go to the <strong>Register</strong> page to add students</p></>
              : <p style={{ fontSize: 14 }}>No students match your search</p>
            }
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Matric No.</th><th>Course</th>
                  <th>Sessions</th><th>Attendance %</th><th>Registered</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const pct = s.totalSessions > 0
                    ? Math.round((s.attendedSessions / s.totalSessions) * 100)
                    : null
                  return (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td style={{ color: 'var(--muted)' }}>{s.matricNumber}</td>
                      <td><span className="badge badge-info">{s.courseCode}</span></td>
                      <td style={{ color: 'var(--muted)' }}>{s.attendedSessions ?? 0} / {s.totalSessions ?? 0}</td>
                      <td>
                        {pct !== null ? (
                          <div style={{ minWidth: 80 }}>
                            <span style={{
                              fontSize: 13, fontWeight: 600,
                              color: pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'
                            }}>{pct}%</span>
                            <div className="progress-bar-wrap">
                              <div className="progress-bar-fill" style={{
                                width: `${pct}%`,
                                background: pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'
                              }} />
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 13 }}>No sessions</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '5px 12px', fontSize: 12, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          disabled={deleting === s.id}
                          onClick={() => deleteStudent(s.id, s.name)}
                        >
                          {deleting === s.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '🗑 Remove'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}