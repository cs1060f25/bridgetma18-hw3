import { useEffect, useState } from 'react'

export default function Toasts({ toasts }) {
  const [active, setActive] = useState([])

  useEffect(() => {
    setActive(toasts.map(t => ({ ...t, show: true })))
    const timers = toasts.map(t => setTimeout(() => setActive(a => a.filter(x => x.id !== t.id)), 3000))
    return () => timers.forEach(clearTimeout)
  }, [toasts])

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2">
      {active.map(t => (
        <div key={t.id} className="toast-enter toast-show bg-white shadow-lg ring-1 ring-slate-200 rounded-xl px-4 py-3 text-sm max-w-md">
          <div className="font-medium">{t.title}</div>
          {t.body && <div className="text-slate-600 mt-0.5">{t.body}</div>}
        </div>
      ))}
    </div>
  )
}
