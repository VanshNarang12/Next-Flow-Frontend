'use client'

import { useWorkflowStore } from '@/store/workflow'

type Props = {
  pickerOpen:      boolean
  onTogglePicker:  () => void
  historyOpen:     boolean
  onToggleHistory: () => void
}

export default function CanvasBottomBar({
  pickerOpen,
  onTogglePicker,
  historyOpen,
  onToggleHistory,
}: Props) {
  const undo    = useWorkflowStore((s) => s.undo)
  const redo    = useWorkflowStore((s) => s.redo)
  const canUndo = useWorkflowStore((s) => s.past.length > 0)
  const canRedo = useWorkflowStore((s) => s.future.length > 0)

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-full px-3 py-2 shadow-2xl">
      {/* Workflow icon */}
      <div className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1L13 4V10L7 13L1 10V4L7 1Z"
            stroke="#8b5cf6"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Undo */}
      <button
        onClick={undo}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo (⌘Z)"
        className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-white/50"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M2 5H8.5C10.433 5 12 6.567 12 8.5C12 10.433 10.433 12 8.5 12H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.5 2.5L2 5L4.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Redo */}
      <button
        onClick={redo}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo (⌘⇧Z)"
        className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-white/50"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M11 5H4.5C2.567 5 1 6.567 1 8.5C1 10.433 2.567 12 4.5 12H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 2.5L11 5L8.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="w-px h-4 bg-white/10" />

      {/* Add node button */}
      <button
        onClick={onTogglePicker}
        aria-label="Add node"
        title="Add node"
        className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
          pickerOpen
            ? 'bg-violet-500 text-white rotate-45'
            : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <div className="w-px h-4 bg-white/10" />

      {/* Run history button */}
      <button
        onClick={onToggleHistory}
        aria-label="Run history"
        title="Run history"
        className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
          historyOpen
            ? 'bg-violet-500 text-white'
            : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6.5 3.5V6.5L8.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
