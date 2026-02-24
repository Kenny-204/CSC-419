import { Router } from "express";
import { supabase } from "../db/supabase.js";

const router = Router();

// ── POST /api/attendance ──────────────────────────────────────
// Mark a student present in a session


router.post("/", async (req, res) => {
  const { sessionId, studentId } = req.body;

  if (!sessionId || !studentId) {
    return res
      .status(400)
      .json({ error: "sessionId and studentId are required" });
  }

  const { data, error } = await supabase
    .from("attendance")
    .insert({ session_id: sessionId, student_id: studentId })
    .select()
    .single();

  if (error) {
    // Unique constraint = already marked in this session
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "Student already marked present in this session" });
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ id: data.id, markedAt: data.marked_at });
});

// ── GET /api/attendance ───────────────────────────────────────
// Fetch attendance records joined with student + session info
// ?limit=10           → limit results (default 50)
// ?sessionId=xxx      → filter by session
// ?studentId=xxx      → filter by student
router.get("/", async (req, res) => {
  const { limit = 50, sessionId, studentId } = req.query;

  let query = supabase
    .from("attendance")
    .select(
      `
      id,
      marked_at,
      students ( name, matric_number ),
      sessions ( course_code, started_at )
    `,
    )
    .order("marked_at", { ascending: false })
    .limit(Number(limit));

  if (sessionId) query = query.eq("session_id", sessionId);
  if (studentId) query = query.eq("student_id", studentId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json(
    data.map((r) => ({
      id: r.id,
      markedAt: r.marked_at,
      studentName: r.students?.name,
      matricNumber: r.students?.matric_number,
      courseCode: r.sessions?.course_code,
    })),
  );
});

export default router;
