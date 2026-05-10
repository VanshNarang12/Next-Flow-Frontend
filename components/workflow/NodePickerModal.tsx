'use client'

import { useState, useEffect, useRef } from 'react'

const NODES = [
  {
    type: 'requestInputs',
    label: 'Request Inputs',
    category: 'IO',
    description: 'Collect text and image inputs from the user',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="3" y="4" width="12" height="3" rx="1" stroke="#fb923c" strokeWidth="1.5" />
        <rect x="3" y="9" width="12" height="5" rx="1" stroke="#fb923c" strokeWidth="1.5" strokeDasharray="2 1.5" />
        <circle cx="14.5" cy="5.5" r="1" fill="#fb923c" />
      </svg>
    ),
    accent: 'border-orange-500/30 hover:border-orange-400/50',
    dot: 'bg-orange-400',
  },
  {
    type: 'cropImage',
    label: 'Crop Image',
    category: 'Image',
    description: 'Crop an image with percentage-based coordinates',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="3" y="3" width="12" height="12" rx="1.5" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 2" />
        <rect x="5" y="5" width="8" height="8" rx="1" fill="#60a5fa" fillOpacity="0.2" stroke="#60a5fa" strokeWidth="1.5" />
      </svg>
    ),
    accent: 'border-blue-500/30 hover:border-blue-400/50',
    dot: 'bg-blue-400',
  },
  {
    type: 'gemini',
    label: 'Gemini',
    category: 'AI',
    description: 'Generate text or analyze images with Gemini',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2C9 2 13 6 13 9C13 12 9 16 9 16C9 16 5 12 5 9C5 6 9 2 9 2Z" stroke="#a78bfa" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M2 9C2 9 6 13 9 13C12 13 16 9 16 9C16 9 12 5 9 5C6 5 2 9 2 9Z" stroke="#a78bfa" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="9" cy="9" r="1.5" fill="#a78bfa" />
      </svg>
    ),
    accent: 'border-violet-500/30 hover:border-violet-400/50',
    dot: 'bg-violet-400',
  },
  {
    type: 'response',
    label: 'Response',
    category: 'IO',
    description: 'Display the final workflow result',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="3" y="3" width="12" height="12" rx="2" stroke="#34d399" strokeWidth="1.5" />
        <path d="M6 9H12M9 6V12" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    accent: 'border-emerald-500/30 hover:border-emerald-400/50',
    dot: 'bg-emerald-400',
  },
]

type Props = {
  onClose: () => void
  onSelect: (type: string) => void
}

export default function NodePickerModal({ onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = NODES.filter(
    (n) =>
      n.label.toLowerCase().includes(query.toLowerCase()) ||
      n.category.toLowerCase().includes(query.toLowerCase())
  )

  // Focus search on open
  useEffect(() => { inputRef.current?.focus() }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-20" onClick={onClose} />

      {/* Modal */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-80 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white/30 flex-shrink-0">
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes…"
            className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-white/25 hover:text-white/50 text-xs">
              ✕
            </button>
          )}
        </div>

        {/* Node list */}
        <div className="p-2 flex flex-col gap-1 max-h-72 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-center text-white/25 text-xs py-6">No nodes found</p>
          )}

          {filtered.map((node) => (
            <button
              key={node.type}
              onClick={() => onSelect(node.type)}
              className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl border bg-white/[0.02] hover:bg-white/5 transition-all ${node.accent}`}
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                {node.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{node.label}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${node.dot}`} />
                  <span className="text-xs text-white/30">{node.category}</span>
                </div>
                <p className="text-xs text-white/40 truncate mt-0.5">{node.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
