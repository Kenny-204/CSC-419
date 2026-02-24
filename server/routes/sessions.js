import { Router } from 'express'
import { supabase } from '../db/supabase.js'

const router = Router()

// ── POST /api/sessions ────────────────────────────────────────
// Instructor starts a new class session
router.post('/', async (req, res) => {
  const { courseCode } = req.body

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode is required' })
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({ course_code: courseCode })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  res.status(201).json(formatSession(data))
})

// ── PATCH /api/sessions/:id/end ───────────────────────────────
// Instructor ends the session
router.patch('/:id/end', async (req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(formatSession(data))
})

// ── GET /api/sessions ─────────────────────────────────────────
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('started_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data.map(formatSession))
})

function formatSession(s) {
  return {
    id:         s.id,
    courseCode: s.course_code,
    startedAt:  s.started_at,
    endedAt:    s.ended_at,
  }
}

export default router