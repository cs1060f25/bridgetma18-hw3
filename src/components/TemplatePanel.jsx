import { useState } from 'react'

export default function TemplatePanel({ assignment, onUsage, onToast }) {
  const [input, setInput] = useState('Draft an outline for the milestone report focusing on system design and evaluation plan.')
  const [output, setOutput] = useState('')
  const [optInSave, setOptInSave] = useState(false)

  const disallowedPatterns = [/```/, /\bfunction\b/, /\bclass\b/, /\bdef\b/, /;\s*$/m, /\{[\s\S]*\}/]

  const generate = () => {
    const looksLikeCode = disallowedPatterns.some(r => r.test(input))
    if (looksLikeCode) {
      setOutput('⚠️ Code generation is prohibited for this assignment. I can help by clarifying syntax or proposing an outline.\n\n• Outline sections: Problem, Approach, System Design, Experiments, Risks, Timeline\n• Syntax tip: For Python list comprehensions, use [f(x) for x in xs if cond(x)].')
      onToast('Code generation blocked', 'Switched to syntax clarification mode.')
    } else {
      setOutput('Proposed Outline:\n1. Problem & Objectives\n2. Related Work (1–2 bullets)\n3. System Architecture (diagram + components)\n4. Data & Evaluation Plan (metrics, baselines)\n5. Risks & Mitigations\n6. Timeline & Milestones')
      onToast('Brainstorm saved', 'Your outline metadata was logged.')
    }
    onUsage({
      assignmentId: assignment.id,
      templateName: `${assignment.courseId} · Brainstorming Template`,
      allowed: assignment.policy.allowed,
      timestamp: Date.now(),
      content: optInSave ? input.slice(0, 500) : undefined,
    })
  }

  return (
    <div className="mt-3">
      <label className="text-sm font-medium">Prompt</label>
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        className="w-full mt-1 h-28 p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Ask clarifying questions or request an outline (no code generation)."
      />
      <div className="mt-2 flex items-center gap-2">
        <input id="opt" type="checkbox" className="rounded border-slate-300" checked={optInSave} onChange={e => setOptInSave(e.target.checked)} />
        <label htmlFor="opt" className="text-sm text-slate-600">Opt in to save up to 500 chars of prompt with the usage log</label>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={generate} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Generate (Respect Policy)</button>
        <button onClick={() => onToast('Not implemented', 'Export to doc coming soon.')} className="px-3 py-2 rounded-lg bg-white border border-slate-200">Export outline</button>
      </div>
      <div className="mt-3">
        <label className="text-sm font-medium">Output</label>
        <pre className="mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl whitespace-pre-wrap text-sm min-h-[6rem]">{output || '—'}</pre>
      </div>
    </div>
  )
}
