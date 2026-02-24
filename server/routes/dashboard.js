import { Router } from 'express'
import { supabase } from '../db/supabase.js'

const router = Router()

// ── GET /api/dashboard/stats ──────────────────────────────────
router.get('/stats', async (req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { count: totalStudents },
    { count: totalSessions },
    { count: todayPresent },
    { data: allAttendance },
    { data: allSessions },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('sessions').select('*', { count: 'exact', head: true }),
    supabase.from('attendance')
      .select('*', { count: 'exact', head: true })
      .gte('marked_at', today.toISOString()),
    supabase.from('attendance').select('student_id, session_id'),
    supabase.from('sessions').select('id, course_code'),
  ])

  // Calculate average attendance % across all students
  let avgAttendance = 0
  if (allSessions?.length && allAttendance?.length) {
    const { data: students } = await supabase
      .from('students')
      .select('id, course_code')

    if (students?.length) {
      const percentages = students.map(s => {
        const courseSessions = allSessions.filter(se => se.course_code === s.course_code)
        if (!courseSessions.length) return null
        const attended = allAttendance.filter(a => a.student_id === s.id).length
        return (attended / courseSessions.length) * 100
      }).filter(p => p !== null)

      if (percentages.length) {
        avgAttendance = Math.round(
          percentages.reduce((sum, p) => sum + p, 0) / percentages.length
        )
      }
    }
  }

  res.json({
    totalStudents: totalStudents ?? 0,
    totalSessions: totalSessions ?? 0,
    todayPresent:  todayPresent  ?? 0,
    avgAttendance,
  })
})

export default router