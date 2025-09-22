import React, { useMemo, useState, useEffect } from 'react'
import Chip from './components/Chip.jsx'
import TemplatePanel from './components/TemplatePanel.jsx'
import Toasts from './components/Toasts.jsx'
import { seed, loadState, saveState } from './data.js'

const fmtDateTime = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
const overlaps = (a, b) => { const s1 = +new Date(a.start), e1 = +new Date(a.end); const s2 = +new Date(b.start), e2 = +new Date(b.end); return Math.max(s1, s2) < Math.min(e1, e2) }

export default function App() {
  const [state, setState] = useState(loadState())
  const [tab, setTab] = useState('dashboard')
  const [toasts, setToasts] = useState([])

  useEffect(() => saveState(state), [state])

  const pushToast = (title, body) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts(t => [...t, { id, title, body }])
  }

  const courseById = id => state.courses.find(c => c.id === id)
  const assignmentById = id => state.assignments.find(a => a.id === id)

  const suggestedOH = useMemo(() => {
    const busy = [
      ...state.calendar,
      ...state.bookings.map(b => state.officeHours.find(o => o.id === b.ohId)).map(o => ({ start: o.start, end: o.end }))
    ]
    const picks = []
    for (const c of state.courses) {
      const oh = state.officeHours.filter(o => o.courseId === c.id)
      const chosen = []
      for (const slot of oh) {
        const slotRange = { start: slot.start, end: slot.end }
        const conflict = busy.some(b => overlaps({ start: b.start, end: b.end }, slotRange))
        const already = state.bookings.some(b => b.ohId === slot.id)
        if (!conflict && !already) chosen.push(slot)
        if (chosen.length === 2) break
      }
      picks.push({ course: c, slots: chosen })
    }
    return picks
  }, [state.calendar, state.bookings, state.officeHours, state.courses])

  const triggerPolicyUpdate = () => {
    if (state.meta.policyPushed) return pushToast('Already applied', "This week's policy change is already reflected.")
    setState(prev => {
      const next = { ...prev, meta: { ...prev.meta, policyPushed: true } }
      next.assignments = prev.assignments.map(a => a.id !== 'cs182-milestone' ? a : ({
        ...a,
        due: '2025-09-23T23:59:00',
        policy: { ...a.policy, version: a.policy.version + 1, citation: 'required for outline exports', lastUpdated: '2025-09-22T09:05:00' },
        urgent: true,
      }))
      next.announcements = [
        { id: 'a2', courseId: 'CS182', title: 'Milestone due date moved (Wed → Tue)', body: 'AI brainstorming OK; outline export must be cited.', time: '2025-09-22T09:05:00' },
        ...prev.announcements,
      ]
      return next
    })
    pushToast('CS 182 Project Milestone moved', 'Due Wed 11:59pm → Tue 11:59pm. AI: brainstorming OK; outline export must be cited.')
  }

  const addInterviewConflict = () => {
    const exists = state.calendar.some(e => e.id === 'cal-int1')
    if (exists) return pushToast('Interview already added', 'Asterion Technical Screen is already on your calendar.')
    setState(prev => ({
      ...prev,
      calendar: [...prev.calendar, { id: 'cal-int1', title: 'Interview: Asterion (Technical Screen)', start: '2025-09-23T15:00:00', end: '2025-09-23T15:45:00', type: 'interview' }]
    }))
    pushToast('New conflict added', 'Interview added: Tue 3:00–3:45pm. Check Smart Scheduling for alternatives.')
  }

  const bookOH = (slot) => {
    if (state.bookings.some(b => b.ohId === slot.id)) return pushToast('Already booked', 'This OH is already on your calendar.')
    const conflict = [...state.calendar, ...state.bookings.map(b => state.officeHours.find(o => o.id === b.ohId))]
      .some(e => overlaps({ start: e.start, end: e.end }, { start: slot.start, end: slot.end }))
    if (conflict) return pushToast('Time conflict', 'That time overlaps an existing event.')
    setState(prev => ({ ...prev, bookings: [...prev.bookings, { ohId: slot.id }] }))
    pushToast('Office hour booked', `${courseById(slot.courseId).name} with ${slot.ta} on ${fmtDate(slot.start)} ${fmtTime(slot.start)}`)
  }

  const cancelBooking = (ohId) => {
    setState(prev => ({ ...prev, bookings: prev.bookings.filter(b => b.ohId !== ohId) }))
    pushToast('Booking cancelled', 'Office hour removed.')
  }

  const findRebookFor = (ohId) => {
    const oh = state.officeHours.find(o => o.id === ohId)
    if (!oh) return []
    const busy = [...state.calendar, ...state.bookings.filter(b => b.ohId !== ohId).map(b => state.officeHours.find(o => o.id === b.ohId))]
    return state.officeHours.filter(o => o.courseId === oh.courseId && o.id !== ohId && !busy.some(e => overlaps({ start: e.start, end: e.end }, { start: o.start, end: o.end })))
  }

  const policyDiff = (a) => {
    if (a.id !== 'cs182-milestone' || !state.meta.policyPushed) return null
    return (
      <div className="mt-2 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2">
        <div className="font-semibold text-amber-800">Policy Update (v{a.policy.version}) — {fmtDateTime(a.policy.lastUpdated)}</div>
        <ul className="list-disc ml-5 text-amber-900 mt-1">
          <li>Due date changed: <span className="line-through">Wed 11:59pm</span> → <span className="font-semibold">Tue 11:59pm</span></li>
          <li>Citation updated: <span className="line-through">optional</span> → <span className="font-semibold">required for outline exports</span></li>
        </ul>
      </div>
    )
  }

  const handleUsage = (u) => setState(prev => ({ ...prev, aiUsage: [...prev.aiUsage, { id: Math.random().toString(36).slice(2, 9), ...u }] }))

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 text-slate-900">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Unified AI Workspace</h1>
          <p className="text-slate-600">{state.meta.weekLabel}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={triggerPolicyUpdate} className="px-3 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700">Trigger Monday Alert</button>
          <button onClick={addInterviewConflict} className="px-3 py-2 bg-slate-900 text-white rounded-lg shadow hover:bg-slate-800">Add Interview Conflict</button>
        </div>
      </header>

      <nav className="mt-6 grid grid-cols-2 md:flex md:gap-2">
        {[
          ['dashboard','Dashboard'],
          ['schedule','Smart Scheduling'],
          ['ai','AI Template'],
          ['submit','Submission']
        ].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-xl text-sm font-medium border ${tab===key? 'bg-white shadow border-slate-200':'bg-slate-100 hover:bg-slate-200 border-transparent'}`}>{label}</button>
        ))}
      </nav>

      {tab === 'dashboard' && (
        <section className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Assignments & Requirements</h2>
                <div className="text-xs text-slate-500">Urgent ↑</div>
              </div>
              <div className="divide-y divide-slate-100">
                {[...state.assignments].sort((a,b)=> (b.urgent?-1:0) - (a.urgent?-1:0)).map(a => (
                  <div key={a.id} className="py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{a.title} · <span className="text-slate-500">{courseById(a.courseId).name}</span></div>
                        <div className="text-sm text-slate-600">Due {fmtDateTime(a.due)}</div>
                      </div>
                      <div className="space-x-1">
                        {a.policy.allowed.map(x => <Chip key={x} label={`Allowed: ${x}`} tone="emerald" />)}
                        {a.policy.prohibited.map(x => <Chip key={x} label={`No: ${x}`} tone="rose" />)}
                      </div>
                    </div>
                    {policyDiff(a)}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-4">
              <h2 className="font-semibold mb-2">Announcements</h2>
              {state.announcements.length === 0 && <div className="text-sm text-slate-500">No announcements yet.</div>}
              <div className="space-y-2">
                {state.announcements.map(an => (
                  <div key={an.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-sm font-medium">{an.title} <span className="text-slate-500">· {courseById(an.courseId).id}</span></div>
                    <div className="text-xs text-slate-500">{fmtDateTime(an.time)}</div>
                    {an.body && <div className="text-sm mt-1">{an.body}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-4">
              <h2 className="font-semibold mb-2">This Week (Your Calendar)</h2>
              <div className="space-y-2">
                {[...state.calendar].sort((a,b)=> +new Date(a.start) - +new Date(b.start)).map(ev => (
                  <div key={ev.id} className="p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{ev.title}</div>
                      <div className="text-xs text-slate-500">{fmtDate(ev.start)} · {fmtTime(ev.start)}–{fmtTime(ev.end)}</div>
                    </div>
                    <Chip label={ev.type} tone={ev.type==='interview'?'violet': ev.type==='class'?'indigo':'slate'} />
                  </div>
                ))}
                {state.bookings.map(b => {
                  const oh = state.officeHours.find(o => o.id === b.ohId)
                  return (
                    <div key={b.ohId} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">OH: {courseById(oh.courseId).id} with {oh.ta} ({oh.mode})</div>
                        <div className="text-xs text-slate-600">{fmtDate(oh.start)} · {fmtTime(oh.start)}–{fmtTime(oh.end)} · {oh.location}</div>
                      </div>
                      <button onClick={() => cancelBooking(oh.id)} className="text-xs px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50">Cancel</button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-4">
              <h2 className="font-semibold mb-2">Quick Actions</h2>
              <div className="flex flex-col gap-2">
                <button onClick={() => setTab('schedule')} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Find conflict-free OH</button>
                <button onClick={() => setTab('ai')} className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800">Open AI Template</button>
                <button onClick={() => setTab('submit')} className="px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100">Open Submission Card</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === 'schedule' && (
        <section className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-4">
            <h2 className="font-semibold mb-2">Suggested Office Hours</h2>
            <p className="text-sm text-slate-600 mb-3">We scanned your calendar and proposed up to two slots per course.</p>
            <div className="space-y-3">
              {suggestedOH.map(({ course, slots }) => (
                <div key={course.id} className="border border-slate-100 rounded-xl p-3">
                  <div className="font-medium mb-2">{course.name}</div>
                  {slots.length === 0 && <div className="text-sm text-slate-500">No conflict-free slots. Try removing a block or check virtual OH.</div>}
                  <div className="grid sm:grid-cols-2 gap-2">
                    {slots.map(slot => (
                      <div key={slot.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-sm font-medium">{fmtDate(slot.start)} · {fmtTime(slot.start)}–{fmtTime(slot.end)}</div>
                        <div className="text-xs text-slate-600">{slot.ta} · {slot.mode} · {slot.location}</div>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => bookOH(slot)} className="text-xs px-2 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Book</button>
                          <button onClick={() => pushToast('Not implemented', 'Waitlist flow will be available in v2.')} className="text-xs px-2 py-1 rounded-lg bg-white border border-slate-200">Join waitlist</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-4">
            <h2 className="font-semibold mb-2">Resolve Conflicts</h2>
            <p className="text-sm text-slate-600 mb-3">If an interview conflicts with a booked OH, we suggest alternatives that preserve context.</p>
            {state.bookings.length === 0 && <div className="text-sm text-slate-500">No bookings yet. Book something first.</div>}
            <div className="space-y-3">
              {state.bookings.map(b => {
                const oh = state.officeHours.find(o => o.id === b.ohId)
                const conflict = state.calendar.some(e => overlaps({ start: e.start, end: e.end }, { start: oh.start, end: oh.end }))
                const alts = findRebookFor(b.ohId)
                return (
                  <div key={b.ohId} className="border border-slate-100 rounded-xl p-3">
                    <div className="text-sm font-medium">{courseById(oh.courseId).name} with {oh.ta}</div>
                    <div className="text-xs text-slate-600">Current: {fmtDate(oh.start)} · {fmtTime(oh.start)}–{fmtTime(oh.end)}</div>
                    {conflict ? (
                      <div className="mt-2">
                        <Chip label="Conflict detected" tone="rose" />
                        <div className="mt-2 grid sm:grid-cols-2 gap-2">
                          {alts.length === 0 && <div className="text-sm text-slate-500">No alternatives found. Try removing a block.</div>}
                          {alts.map(s => (
                            <div key={s.id} className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                              <div className="text-sm font-medium">{fmtDate(s.start)} · {fmtTime(s.start)}–{fmtTime(s.end)}</div>
                              <div className="text-xs text-slate-700">{s.ta} · {s.mode} · {s.location}</div>
                              <div className="mt-2 flex gap-2">
                                <button onClick={() => { cancelBooking(oh.id); bookOH(s); }} className="text-xs px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Rebook here</button>
                                <button onClick={() => pushToast('Not implemented', 'Request TA override coming soon.')} className="text-xs px-2 py-1 rounded-lg bg-white border border-slate-200">Request override</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2"><Chip label="No conflicts" tone="emerald" /></div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {tab === 'ai' && (
        <section className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-4">
            <h2 className="font-semibold mb-2">Professor AI Template — CS 182 Milestone</h2>
            {(() => { const a = assignmentById('cs182-milestone'); return (
              <>
                <div className="text-sm text-slate-600">Policy v{a.policy.version} · Updated {fmtDateTime(a.policy.lastUpdated)}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {a.policy.allowed.map(x => <Chip key={x} label={`Allowed: ${x}`} tone="emerald" />)}
                  {a.policy.prohibited.map(x => <Chip key={x} label={`No: ${x}`} tone="rose" />)}
                  <Chip label={`Citation: ${a.policy.citation}`} tone="indigo" />
                </div>
              </>
            ) })()}
            <TemplatePanel assignment={assignmentById('cs182-milestone')} onUsage={handleUsage} onToast={pushToast} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-4">
            <h2 className="font-semibold mb-2">Usage Log (metadata)</h2>
            <p className="text-sm text-slate-600 mb-2">We store template name and timestamp (no content) unless you opt in.</p>
            <div className="space-y-2">
              {state.aiUsage.length === 0 && <div className="text-sm text-slate-500">No usage yet.</div>}
              {[...state.aiUsage].reverse().map(u => (
                <div key={u.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-sm font-medium">{u.templateName}</div>
                  <div className="text-xs text-slate-600">{fmtDateTime(u.timestamp)}</div>
                  <div className="text-xs text-slate-500">Allowed actions: {u.allowed.join(', ')}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === 'submit' && (
        <section className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-4">
            <h2 className="font-semibold mb-2">Submission — CS 182 Project Milestone</h2>
            <ol className="text-sm text-slate-700 list-decimal ml-5 space-y-1">
              <li>Have you cited AI brainstorming (if used)?</li>
              <li>Did you attach design notes?</li>
            </ol>
            <div className="mt-3">
              <label className="text-sm font-medium">Notes to instructor</label>
              <textarea
                value={state.submissionNotes['cs182-milestone']}
                onChange={e => setState(prev => ({...prev, submissionNotes: { ...prev.submissionNotes, 'cs182-milestone': e.target.value }}))}
                className="w-full mt-1 h-28 p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Optional notes or citations..."
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => {
                const last = [...state.aiUsage].filter(u => u.assignmentId === 'cs182-milestone').pop()
                if (!last) return pushToast('No AI usage found', 'Use the template first to generate a declaration.')
                const declaration = `AI Usage Declaration: Used professor-provided brainstorming template (v${assignmentById('cs182-milestone').policy.version}) on ${new Date(last.timestamp).toLocaleString()}; actions: ${last.allowed.join(', ')}; no code generation.`
                setState(prev => ({...prev, submissionNotes: { ...prev.submissionNotes, 'cs182-milestone': (prev.submissionNotes['cs182-milestone']? prev.submissionNotes['cs182-milestone'] + '\n' : '') + declaration }}))
                pushToast('Declaration inserted', 'A standardized AI usage note was added.')
              }} className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800">Declare AI Usage</button>
              <button onClick={() => pushToast('Not implemented', 'File uploads are mocked in this prototype.')} className="px-3 py-2 rounded-lg bg-white border border-slate-200">Attach design notes</button>
            </div>
            <div className="mt-4">
              <button onClick={() => pushToast('Submitted!', 'Your milestone has been submitted with notes.')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Submit</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-4">
            <h2 className="font-semibold mb-2">What will be submitted</h2>
            <div className="text-sm text-slate-600">Preview of your notes:</div>
            <pre className="mt-2 p-3 bg-slate-50 border border-slate-100 rounded-xl whitespace-pre-wrap text-sm">{state.submissionNotes['cs182-milestone'] || '—'}</pre>
            <div className="mt-3 text-xs text-slate-500">Policy version: v{assignmentById('cs182-milestone').policy.version} · Due {fmtDateTime(assignmentById('cs182-milestone').due)}</div>
          </div>
        </section>
      )}

      <Toasts toasts={toasts} />

      <footer className="mt-10 text-center text-xs text-slate-400">
        Synthetic demo data · Some controls purposely show "Not implemented" messages per prototype spec.
        <div className="mt-1"><button className="underline" onClick={() => { localStorage.removeItem('uaw_state'); location.reload(); }}>Reset demo data</button></div>
      </footer>
    </div>
  )
}
