/**
 * Register.jsx
 * ─────────────────────────────────────────────────────────────
 * Admin fills in student info → opens camera → captures 5 face
 * samples → averages them into one embedding → POSTs to backend.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  // captureFaceSamples,
  averageEmbeddings,
  drawDetections,
} from "../utils/faceApi";

const CAPTURE_SAMPLES = 5;

export default function Register() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const drawLoopRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    matricNumber: "",
    courseCode: "",
  });
  const [step, setStep] = useState("form"); // 'form' | 'camera' | 'capturing' | 'done' | 'error'
  const [captureProgress, setCaptureProgress] = useState(0);
  const [status, setStatus] = useState(null); // { type, message }

  // Clean up camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  function handleInput(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function formIsValid() {
    return (
      form.name.trim() && form.matricNumber.trim() && form.courseCode.trim()
    );
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStep("camera");
      startDrawLoop();
    } catch (err) {
      setStatus({
        type: "danger",
        message: "Camera access denied. Please allow camera permissions.",
      });
    }
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

  function stopCamera() {
    cancelAnimationFrame(drawLoopRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function captureAndRegister() {
    setStep("capturing");
    setStatus(null);

    try {
      // 1. Capture samples with progress feedback
      const samples = [];
      for (let i = 0; i < CAPTURE_SAMPLES; i++) {
        const { captureFaceSamples: _, ...rest } =
          await import("../utils/faceApi");
        // Inline capture with progress
        const { getEmbeddingFromVideo } = await import("../utils/faceApi");
        const emb = await getEmbeddingFromVideo(videoRef.current);
        if (emb) samples.push(emb);
        setCaptureProgress(Math.round(((i + 1) / CAPTURE_SAMPLES) * 100));
        await new Promise((r) => setTimeout(r, 400));
      }

      if (samples.length < 3) {
        setStatus({
          type: "danger",
          message:
            "Could not detect your face clearly. Ensure good lighting and face the camera directly.",
        });
        setStep("camera");
        return;
      }

      // 2. Average the samples into one stable embedding
      const embedding = averageEmbeddings(samples);

      // 3. POST to backend
      await axios.post(`${import.meta.env.VITE_API_URL}/api/students`, {
        name: form.name.trim(),
        matricNumber: form.matricNumber.trim(),
        courseCode: form.courseCode.trim(),
        embedding,
      });

      stopCamera();
      setStep("done");
      setStatus({
        type: "success",
        message: `✅ ${form.name} registered successfully!`,
      });
      setForm({ name: "", matricNumber: "", courseCode: "" });
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error || "Registration failed. Please try again.";
      setStatus({ type: "danger", message: msg });
      setStep("camera");
    }
  }

  function resetForm() {
    setStep("form");
    setStatus(null);
    setCaptureProgress(0);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Register Student</h1>
        <p>Add a new student and capture their facial data</p>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* ── Left: Form ── */}
        <div className="card">
          <p className="card-title">Student Details</p>
          <p className="card-subtitle">
            Fill in the student's information first
          </p>

          {status && step !== "camera" && step !== "capturing" && (
            <div className={`alert alert-${status.type}`}>{status.message}</div>
          )}

          <div className="form-group">
            <label>Full Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleInput}
              placeholder="e.g. John Adebayo"
              disabled={step === "camera" || step === "capturing"}
            />
          </div>

          <div className="form-group">
            <label>Matric Number</label>
            <input
              name="matricNumber"
              value={form.matricNumber}
              onChange={handleInput}
              placeholder="e.g. CSC/2021/042"
              disabled={step === "camera" || step === "capturing"}
            />
          </div>

          <div className="form-group">
            <label>Course Code</label>
            <input
              name="courseCode"
              value={form.courseCode}
              onChange={handleInput}
              placeholder="e.g. CSC401"
              disabled={step === "camera" || step === "capturing"}
            />
          </div>

          <div className="flex gap-12 mt-16">
            {step === "form" || step === "done" ? (
              <button
                className="btn btn-primary"
                disabled={!formIsValid()}
                onClick={startCamera}
              >
                📷 Open Camera
              </button>
            ) : (
              <>
                <button
                  className="btn btn-success"
                  disabled={step === "capturing"}
                  onClick={captureAndRegister}
                >
                  {step === "capturing" ? (
                    <>
                      <span className="spinner" /> Capturing… {captureProgress}%
                    </>
                  ) : (
                    "✔ Capture & Register"
                  )}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    stopCamera();
                    setStep("form");
                  }}
                >
                  Cancel
                </button>
              </>
            )}

            {step === "done" && (
              <button className="btn btn-ghost" onClick={resetForm}>
                Register Another
              </button>
            )}
          </div>

          {/* Capture progress bar */}
          {step === "capturing" && (
            <div style={{ marginTop: 16 }}>
              <p className="text-muted" style={{ marginBottom: 6 }}>
                Capturing face samples… {captureProgress}%
              </p>
              <div className="progress-bar-wrap">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${captureProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Step guide */}
          <div
            style={{
              marginTop: 24,
              borderTop: "1px solid var(--border)",
              paddingTop: 20,
            }}
          >
            <p
              style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}
            >
              HOW IT WORKS
            </p>
            {[
              ["1", "Fill in student details above"],
              ["2", 'Click "Open Camera" — face the camera directly'],
              ["3", 'Click "Capture & Register" — hold still for 2 seconds'],
              ["4", "Done! The student can now mark attendance"],
            ].map(([n, text]) => (
              <div
                key={n}
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 10,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {n}
                </span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Camera ── */}
        <div className="card">
          <p className="card-title">Camera Preview</p>
          <p className="card-subtitle">
            Face detection will highlight automatically
          </p>

          {status && (step === "camera" || step === "capturing") && (
            <div className={`alert alert-${status.type}`}>{status.message}</div>
          )}

          <div className="camera-wrap" style={{ maxWidth: "100%" }}>
            {step === "form" || step === "done" ? (
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
                <p style={{ fontSize: 13 }}>Camera will appear here</p>
              </div>
            ) : null}

            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                display: step === "form" || step === "done" ? "none" : "block",
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                display: step === "form" || step === "done" ? "none" : "block",
              }}
            />

            {(step === "camera" || step === "capturing") && (
              <div className="camera-overlay-text">
                {step === "capturing"
                  ? `Scanning… ${captureProgress}%`
                  : "Look directly at the camera"}
              </div>
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
            💡 Tip: Ensure good lighting and a clear background. Avoid hats or
            sunglasses. The system captures 5 samples and averages them for
            accuracy.
          </p>
        </div>
      </div>
    </div>
  );
}
