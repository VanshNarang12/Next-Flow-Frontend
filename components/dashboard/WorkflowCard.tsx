'use client'

import { useState, useRef, useEffect } from 'react'
import type { WorkflowSummary } from '@/lib/api'

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const STATUS = {
  idle:    { dot: 'bg-white/20',                    label: 'Idle',    text: 'text-white/40' },
  running: { dot: 'bg-violet-400 animate-pulse',    label: 'Running', text: 'text-violet-400' },
  failed:  { dot: 'bg-red-400',                     label: 'Failed',  text: 'text-red-400' },
} as const

type Props = {
  workflow: WorkflowSummary
  onOpen: () => void
  onRename: (name: string) => Promise<void>
  onDelete: () => void
}

export default function WorkflowCard({ workflow, onOpen, onRename, onDelete }: Props) {
  const [menuOpen, setMenuOpen]   = useState(false)
  const [renaming, setRenaming]   = useState(false)
  const [nameValue, setNameValue] = useState(workflow.name)
  const [saving, setSaving]       = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef  = useRef<HTMLDivElement>(null)

  // Keep display name in sync after parent optimistic update
  useEffect(() => {
    if (!renaming) setNameValue(workflow.name)
  }, [workflow.name, renaming])

  // Focus + select when rename mode opens
  useEffect(() => {
    if (renaming) inputRef.current?.select()
  }, [renaming])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [menuOpen])

  async function commitRename() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === workflow.name) {
      setNameValue(workflow.name)
      setRenaming(false)
      return
    }
    setSaving(true)
    try {
      await onRename(trimmed)
    } finally {
      setSaving(false)
      setRenaming(false)
    }
  }

  const status = STATUS[workflow.activeRunStatus] ?? STATUS.idle

  const menuItems = [
    { label: 'Open',   action: () => { setMenuOpen(false); onOpen() } },
    { label: 'Rename', action: () => { setMenuOpen(false); setRenaming(true) } },
    { label: 'Delete', action: () => { setMenuOpen(false); onDelete() }, danger: true },
  ]

  return (
    <div
      className="group relative flex flex-col gap-3 bg-[#141414] hover:bg-[#181818] border border-white/10 hover:border-violet-500/30 rounded-xl p-4 transition-all cursor-pointer select-none"
      onClick={() => { if (!renaming && !menuOpen) onOpen() }}
    >
      {/* Status badge + kebab */}
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-1.5 text-xs font-medium ${status.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`} />
          {status.label}
        </span>

        <div className="relative" ref={menuRef}>
          <button
            aria-label="Workflow options"
            className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-all text-base leading-none tracking-widest"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
          >
            •••
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 z-20 w-36 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl py-1 overflow-hidden">
              {menuItems.map(({ label, action, danger }) => (
                <button
                  key={label}
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                    danger
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                  onClick={(e) => { e.stopPropagation(); action() }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Name — inline editable */}
      {renaming ? (
        <input
          ref={inputRef}
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitRename() }
            if (e.key === 'Escape') { setNameValue(workflow.name); setRenaming(false) }
          }}
          onClick={(e) => e.stopPropagation()}
          disabled={saving}
          maxLength={100}
          className="w-full bg-[#0d0d0d] border border-violet-500/50 focus:border-violet-400 rounded-md px-2 py-1 text-sm font-medium text-white outline-none transition-colors disabled:opacity-50"
        />
      ) : (
        <p className="text-sm font-semibold text-white truncate">{nameValue}</p>
      )}

      {/* Footer */}
      <p className="text-xs text-white/25 mt-auto pt-1 border-t border-white/5">
        Edited {relativeTime(workflow.updatedAt)}
      </p>
    </div>
  )
}
