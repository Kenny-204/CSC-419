import { Router } from 'express'
import { supabase } from '../db/supabase.js'

const router = Router()

// ── POST /api/students ────────────────────────────────────────
// Register a new student with their face embedding
router.post('/', async (req, res) => {
  const { name, matricNumber, courseCode, embedding } = req.body

  // Validate
  if (!name || !matricNumber || !courseCode || !embedding) {
    return res.status(400).json({ error: 'name, matricNumber, courseCode and embedding are required' })
  }
  if (!Array.isArray(embedding) || embedding.length !== 128) {
    return res.status(400).json({ error: 'embedding must be an array of 128 numbers' })
  }

  const { data, error } = await supabase
    .from('students')
    .insert({
      name,
      matric_number: matricNumber,
      course_code:   courseCode,
      embedding,
    })
    .select('id, name, matric_number, course_code, created_at')
    .single()

  if (error) {
    // Unique constraint = duplicate matric number
    if (error.code === '23505') {
      return res.status(409).json({ error: `Matric number "${matricNumber}" is already registered` })
    }
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json(formatStudent(data))
})

// ── GET /api/students ─────────────────────────────────────────
// Returns all students.
// ?includeStats=true  → also attach sessions/attendance counts
// Default includes embeddings so the frontend can do client-side matching
router.get('/', async (req, res) => {
  const { includeStats } = req.query

  const { data: students, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  if (!includeStats) {
    return res.json(students.map(formatStudent))
  }

  // Attach per-student attendance stats
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, course_code')

  const { data: attendanceRows } = await supabase
    .from('attendance')
    .select('student_id, session_id')

  const enriched = students.map(s => {
    const courseSessions = sessions?.filter(se => se.course_code === s.course_code) ?? []
    const attended = attendanceRows?.filter(a => a.student_id === s.id) ?? []

    return {
      ...formatStudent(s),
      totalSessions:    courseSessions.length,
      attendedSessions: attended.length,
    }
  })

  res.json(enriched)
})

// ── DELETE /api/students/:id ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ── Helpers ───────────────────────────────────────────────────
function formatStudent(s) {
  return {
    id:           s.id,
    name:         s.name,
    matricNumber: s.matric_number,
    courseCode:   s.course_code,
    embedding:    s.embedding,   // included so frontend can match client-side
    createdAt:    s.created_at,
  }
}

export default router