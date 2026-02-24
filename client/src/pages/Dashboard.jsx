/**
 * Dashboard.jsx
 * Overview stats + recent attendance records.
 */

import { useEffect, useState } from "react";
import axios from "axios";

function safeArray(data) {
  return Array.isArray(data) ? data : [];
}

function safeStats(data) {
  if (data && typeof data === "object" && !Array.isArray(data)) return data;
  return {
    totalStudents: 0,
    totalSessions: 0,
    todayPresent: 0,
    avgAttendance: 0,
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSessions: 0,
    todayPresent: 0,
    avgAttendance: 0,
  });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setBackendDown(false);
    try {
      const [statsRes, recordsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/stats`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/attendance?limit=10`),
      ]);
      setStats(safeStats(statsRes.data));
      setRecords(safeArray(recordsRes.data));
    } catch {
      setBackendDown(true);
      setStats({
        totalStudents: 0,
        totalSessions: 0,
        todayPresent: 0,
        avgAttendance: 0,
      });
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: "var(--muted)",
          marginTop: 40,
        }}
      >
        <span className="spinner" /> Loading dashboard…
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents,
      icon: "👥",
      color: "var(--accent)",
    },
    {
      label: "Sessions Run",
      value: stats.totalSessions,
      icon: "📅",
      color: "var(--success)",
    },
    {
      label: "Present Today",
      value: stats.todayPresent,
      icon: "✅",
      color: "#9c27b0",
    },
    {
      label: "Avg Attendance",
      value: `${stats.avgAttendance ?? 0}%`,
      icon: "📈",
      color: "var(--warning)",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of attendance activity</p>
      </div>

      {backendDown && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          ⚠ Backend API not reachable — showing empty state. Start your Node.js
          server on port 5000.
        </div>
      )}

      <div className="stats-grid">
        {statCards.map((s) => (
          <div className="stat-card" key={s.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <p className="stat-label">{s.label}</p>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
            </div>
            <p className="stat-value" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-16">
          <div>
            <p className="card-title">Recent Attendance</p>
            <p className="card-subtitle">Last 10 records across all sessions</p>
          </div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 13 }}
            onClick={fetchData}
          >
            ↺ Refresh
          </button>
        </div>

        {records.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--muted)",
            }}
          >
            <p style={{ fontSize: 40, marginBottom: 12 }}>📋</p>
            <p style={{ fontSize: 14 }}>No attendance records yet</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>
              Start a session on the <strong>Attendance</strong> page
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Matric No.</th>
                  <th>Course</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{r.studentName}</td>
                    <td style={{ color: "var(--muted)" }}>{r.matricNumber}</td>
                    <td>
                      <span className="badge badge-info">{r.courseCode}</span>
                    </td>
                    <td style={{ color: "var(--muted)" }}>
                      {new Date(r.markedAt).toLocaleDateString()}
                    </td>
                    <td style={{ color: "var(--muted)" }}>
                      {new Date(r.markedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <span className="badge badge-success">Present</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 24,
        }}
      >
        <div
          className="card"
          style={{ display: "flex", alignItems: "center", gap: 16 }}
        >
          <span style={{ fontSize: 36 }}>➕</span>
          <div>
            <p
              style={{
                fontWeight: 600,
                color: "var(--white)",
                marginBottom: 4,
              }}
            >
              Register a Student
            </p>
            <p className="text-muted">Add new students with face data</p>
          </div>
        </div>
        <div
          className="card"
          style={{ display: "flex", alignItems: "center", gap: 16 }}
        >
          <span style={{ fontSize: 36 }}>📷</span>
          <div>
            <p
              style={{
                fontWeight: 600,
                color: "var(--white)",
                marginBottom: 4,
              }}
            >
              Take Attendance
            </p>
            <p className="text-muted">Start a class session now</p>
          </div>
        </div>
      </div>
    </div>
  );
}
