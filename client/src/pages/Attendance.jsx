/**
 * Attendance.jsx
 * ─────────────────────────────────────────────────────────────
 * Instructor starts a session → camera opens → student stands
 * in front → system detects face → compares against all stored
 * embeddings → marks PRESENT if matched.
 *
 * Matching happens client-side (face-api.js) to avoid sending
 * raw video to the server — only the matched student ID is sent.
 */

import { useRef, useState, useEffect } from "react";
import axios from "axios";
import {
  getEmbeddingFromVideo,
  matchEmbedding,
  drawDetections,
} from "../utils/faceApi";

const SCAN_INTERVAL_MS = 2000;

export default function Attendance() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scannerRef = useRef(null);
  const drawLoopRef = useRef(null);
  // Store session + students in refs so the interval always sees current values
  const sessionRef = useRef(null);
  const studentsRef = useRef([]);

  const [session, setSession] = useState(null);
  const [courseCode, setCourseCode] = useState("");
  const [students, setStudents] = useState([]);
  const [markedToday, setMarkedToday] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
    return () => stopEverything();
  }, []);

  async function fetchStudents() {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/students`,
      );
      const arr = Array.isArray(data) ? data : [];
      setStudents(arr);
      studentsRef.current = arr;
      console.log(`Loaded ${arr.length} students for matching`);
    } catch (err) {
      console.error("Could not load students", err);
    }
  }

  async function startSession() {
    if (!courseCode.trim()) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/sessions`, {
        courseCode: courseCode.trim(),
      });
      // Store in ref immediately so the scanner interval can see it
      sessionRef.current = data;
      setSession(data);
      setMarkedToday([]);
      await openCamera();
    } catch (err) {
      console.error(err);
      alert("Could not start session. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function openCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    await videoRef.current.play();
    setCameraOn(true);
    startDrawLoop();
    startScanner();
    setScanning(true);
  }

  function startDrawLoop() {
    const loop = async () => {
      if (videoRef.current && canvasRef.current) {
        await drawDetections(videoRef.current, canvasRef.current);
      }
      drawLoopRef.current = requestAnimationFrame(loop);
    };
    drawLoopRef.current = requestAnimationFrame(loop);
  }

  function startScanner() {
    scannerRef.current = setInterval(async () => {
      await runScan();
    }, SCAN_INTERVAL_MS);
  }

  async function runScan() {
    const currentSession = sessionRef.current;
    const currentStudents = studentsRef.current;

    if (!videoRef.current) {
      console.log("Scan skipped: no video");
      return;
    }
    if (!currentSession) {
      console.log("Scan skipped: no session");
      return;
    }
    if (currentStudents.length === 0) {
      setLastResult({
        type: "warning",
        message: "⚠ No registered students found",
      });
      return;
    }

    const liveEmbedding = await getEmbeddingFromVideo(videoRef.current);
    if (!liveEmbedding) {
      setLastResult({
        type: "info",
        message: "No face detected — step closer to the camera",
      });
      return;
    }

    const match = matchEmbedding(liveEmbedding, currentStudents, 0.5);
    if (!match) {
      setLastResult({
        type: "warning",
        message: "⚠ Face not recognised — not a registered student",
      });
      return;
    }

    const { student } = match;

    // Already marked this session?
    if (markedToday.find((s) => s.id === student.id)) {
      setLastResult({
        type: "info",
        message: `ℹ ${student.name} already marked present`,
      });
      return;
    }

    // Mark present on the server
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/attendance`, {
        sessionId: currentSession.id,
        studentId: student.id,
      });
      setMarkedToday((prev) => [...prev, student]);
      setLastResult({
        type: "success",
        message: `✅ ${student.name} marked PRESENT`,
      });
    } catch (err) {
      console.error("Failed to mark attendance", err);
    }
  }

  async function endSession() {
    stopEverything();
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/sessions/${sessionRef.current.id}/end`,
      );
    // eslint-disable-next-line no-empty, no-unused-vars
    } catch (_) {}
    sessionRef.current = null;
    setSession(null);
    setCameraOn(false);
    setScanning(false);
    setLastResult(null);
  }

  function stopEverything() {
    clearInterval(scannerRef.current);
    cancelAnimationFrame(drawLoopRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  const sessionDuration = session
    ? Math.floor((Date.now() - new Date(session.startedAt)) / 60000)
    : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Take Attendance</h1>
        <p>Start a class session and let students scan their faces</p>
      </div>

      {!session ? (
        <div className="card mb-16" style={{ maxWidth: 480 }}>
          <p className="card-title">Start Class Session</p>
          <p className="card-subtitle">
            Enter the course code then start the session
          </p>
          <div className="flex gap-12 items-center">
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <input
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="Course code (e.g. CSC401)"
              />
            </div>
            <button
              className="btn btn-primary"
              disabled={!courseCode.trim() || loading || students.length === 0}
              onClick={startSession}
              style={{ whiteSpace: "nowrap" }}
            >
              {loading ? (
                <>
                  <span className="spinner" /> Starting…
                </>
              ) : (
                "▶ Start Session"
              )}
            </button>
          </div>
          {students.length === 0 && (
            <p className="text-muted" style={{ marginTop: 10 }}>
              ⚠ No students registered yet. Register students first.
            </p>
          )}
        </div>
      ) : (
        <div
          className="card mb-16"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            maxWidth: 720,
          }}
        >
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Course
              </p>
              <p style={{ fontWeight: 700, fontSize: 18 }}>
                {session.courseCode}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Present
              </p>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--success)",
                }}
              >
                {markedToday.length}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Duration
              </p>
              <p style={{ fontWeight: 700, fontSize: 18 }}>
                {sessionDuration}m
              </p>
            </div>
          </div>
          <button className="btn btn-danger" onClick={endSession}>
            ⏹ End Session
          </button>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card">
          <p className="card-title">Live Camera</p>
          <p className="card-subtitle">
            {scanning ? "Scanning every 2 seconds…" : "Camera inactive"}
          </p>

          {lastResult && (
            <div className={`alert alert-${lastResult.type}`}>
              {lastResult.message}
            </div>
          )}

          <div className="camera-wrap" style={{ maxWidth: "100%" }}>
            {!cameraOn && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--muted)",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 48 }}>📷</span>
                <p style={{ fontSize: 13 }}>
                  Start a session to activate camera
                </p>
              </div>
            )}
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ display: cameraOn ? "block" : "none" }}
            />
            <canvas
              ref={canvasRef}
              style={{ display: cameraOn ? "block" : "none" }}
            />
            {scanning && (
              <div className="camera-overlay-text">🔍 Scanning every 2s…</div>
            )}
          </div>

          <p
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "var(--muted)",
              lineHeight: 1.6,
            }}
          >
            Students should stand in front of the camera one at a time. The
            system automatically detects and marks them present every 2 seconds.
          </p>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-16">
            <div>
              <p className="card-title">Present Today</p>
              <p className="card-subtitle">
                {markedToday.length} student(s) marked
              </p>
            </div>
            <span className="badge badge-success">
              {session ? "Session Active" : "No Session"}
            </span>
          </div>

          {markedToday.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 0",
                color: "var(--muted)",
              }}
            >
              <p style={{ fontSize: 32, marginBottom: 8 }}>🕐</p>
              <p style={{ fontSize: 13 }}>No one marked yet</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Matric No.</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {markedToday.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ color: "var(--muted)" }}>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td style={{ color: "var(--muted)" }}>
                        {s.matricNumber}
                      </td>
                      <td>
                        <span className="badge badge-success">
                          {new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
