// Synthetic demo data for Week of Sep 22–28, 2025
export const seed = () => ({
  meta: { seededAt: Date.now(), weekLabel: 'Week of Sep 22–28, 2025', policyPushed: false },
  courses: [
    { id: 'CS182', name: 'CS 182: Machine Learning' },
    { id: 'CS124', name: 'CS 124: Algorithms' },
  ],
  assignments: [
    {
      id: 'cs182-milestone', courseId: 'CS182', title: 'Project Milestone',
      due: '2025-09-24T23:59:00',
      policy: {
        version: 1,
        allowed: ['brainstorming', 'outline'],
        prohibited: ['code generation'],
        citation: 'optional',
        lastUpdated: '2025-09-18T09:00:00'
      },
      urgent: true,
    },
    {
      id: 'cs124-pset2', courseId: 'CS124', title: 'PSet 2',
      due: '2025-09-26T17:00:00',
      policy: {
        version: 1,
        allowed: ['clarify problem statement'],
        prohibited: ['full solutions'],
        citation: 'required if AI consulted',
        lastUpdated: '2025-09-16T12:15:00'
      },
      urgent: false,
    }
  ],
  announcements: [
    { id: 'a1', courseId: 'CS124', title: 'Section slides posted', body: 'Greedy vs DP examples', time: '2025-09-21T18:45:00' }
  ],
  calendar: [
    { id: 'cal1', title: 'CS 182 Lecture', start: '2025-09-22T10:30:00', end: '2025-09-22T11:45:00', type: 'class' },
    { id: 'cal2', title: 'CS 124 Lecture', start: '2025-09-22T13:00:00', end: '2025-09-22T14:15:00', type: 'class' },
    { id: 'cal3', title: 'CS 182 Lecture', start: '2025-09-24T10:30:00', end: '2025-09-24T11:45:00', type: 'class' },
    { id: 'cal4', title: 'CS 124 Lecture', start: '2025-09-24T13:00:00', end: '2025-09-24T14:15:00', type: 'class' },
    { id: 'cal5', title: 'Interview prep block', start: '2025-09-23T10:00:00', end: '2025-09-23T11:00:00', type: 'block' },
    { id: 'cal6', title: 'Online Assessment time', start: '2025-09-25T19:30:00', end: '2025-09-25T21:00:00', type: 'block' },
  ],
  officeHours: [
    { id: 'oh1', courseId: 'CS182', ta: 'Maya Patel', start: '2025-09-23T15:00:00', end: '2025-09-23T15:20:00', location: 'Pierce 301', mode: 'in-person' },
    { id: 'oh2', courseId: 'CS182', ta: 'Maya Patel', start: '2025-09-24T15:00:00', end: '2025-09-24T15:20:00', location: 'Virtual (Zoom)', mode: 'virtual' },
    { id: 'oh3', courseId: 'CS182', ta: 'Alex Kim', start: '2025-09-23T16:00:00', end: '2025-09-23T16:20:00', location: 'Virtual (Zoom)', mode: 'virtual' },
    { id: 'oh4', courseId: 'CS124', ta: 'Lina Zhou', start: '2025-09-25T14:30:00', end: '2025-09-25T14:50:00', location: 'Maxwell D-201', mode: 'in-person' },
    { id: 'oh5', courseId: 'CS124', ta: 'Lina Zhou', start: '2025-09-26T10:30:00', end: '2025-09-26T10:50:00', location: 'Virtual (Zoom)', mode: 'virtual' }
  ],
  bookings: [],
  aiUsage: [],
  submissionNotes: { 'cs182-milestone': '' }
})

export const loadState = () => {
  const raw = localStorage.getItem('uaw_state')
  if (!raw) return seed()
  try { return JSON.parse(raw) } catch { return seed() }
}
export const saveState = (s) => localStorage.setItem('uaw_state', JSON.stringify(s))
