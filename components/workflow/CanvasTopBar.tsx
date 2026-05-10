'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useWorkflowStore } from '@/store/workflow'
import { api } from '@/lib/api'
import type { TriggerRunBody } from '@/lib/api'

type Props = {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
}

export default function CanvasTopBar({ saveStatus }: Props) {
  const router = useRouter()
  const workflowId   = useWorkflowStore((s) => s.workflowId)
  const workflowName = useWorkflowStore((s) => s.workflowName)
  const setName      = useWorkflowStore((s) => s.setWorkflowName)
  const nodes        = useWorkflowStore((s) => s.nodes)
  const edges        = useWorkflowStore((s) => s.edges)

  const [editing, setEditing]   = useState(false)
  const [nameVal, setNameVal]   = useState(workflowName)
  const [running, setRunning]   = useState(false)
  const [importing, setImporting] = useState(false)
  const inputRef    = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keep local value in sync when store name changes externally
  useEffect(() => {
    if (!editing) setNameVal(workflowName)
  }, [workflowName, editing])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  async function commitName() {
    const trimmed = nameVal.trim()
    if (!trimmed || trimmed === workflowName) {
      setNameVal(workflowName)
      setEditing(false)
      return
    }
    setName(trimmed)
    setEditing(false)
    try {
      await api.workflows.updateName(workflowId, trimmed)
    } catch {
      // revert on failure
      setName(workflowName)
      setNameVal(workflowName)
    }
  }

  const selectedNodes = nodes.filter((n) => n.selected)

  async function handleRun() {
    if (running || !workflowId) return
    setRunning(true)
    try {
      let body: TriggerRunBody
      if (selectedNodes.length === 1) {
        body = { scope: 'single', nodeId: selectedNodes[0].id }
      } else if (selectedNodes.length > 1) {
        body = { scope: 'partial', nodeIds: selectedNodes.map((n) => n.id) }
      } else {
        body = { scope: 'full' }
      }
      await api.runs.trigger(workflowId, body)
    } finally {
      setRunning(false)
    }
  }

  function handleExport() {
    const payload = JSON.stringify(
      { name: workflowName, nodes, edges, exportedAt: new Date().toISOString() },
      null,
      2
    )
    const blob = new Blob([payload], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${workflowName.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      // Validate minimal shape
      if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
        throw new Error('Invalid workflow JSON')
      }
      const created = await api.workflows.create(data.name ?? 'Imported Workflow')
      await api.workflows.updateCanvas(created.id, data.nodes, data.edges)
      router.push(`/canvas/${created.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import workflow')
    } finally {
      setImporting(false)
      // Reset so the same file can be re-imported
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const saveLabel = {
    idle:   '',
    saving: 'Saving…',
    saved:  'Saved',
    error:  'Save failed',
  }[saveStatus]

  const saveColor = {
    idle:   '',
    saving: 'text-white/30',
    saved:  'text-green-400/70',
    error:  'text-red-400',
  }[saveStatus]

  return (
    <header className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-white/8 bg-[#0d0d0d] z-10">
      {/* ── Left: back + name ───────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/8 text-white/40 hover:text-white transition-colors flex-shrink-0"
          aria-label="Back to dashboard"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.5 2.5L4 7L8.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        {editing ? (
          <input
            ref={inputRef}
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  { e.preventDefault(); commitName() }
              if (e.key === 'Escape') { setNameVal(workflowName); setEditing(false) }
            }}
            maxLength={100}
            className="bg-transparent border-b border-violet-500 text-sm font-medium text-white outline-none px-0.5 w-48"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-white/80 hover:text-white truncate max-w-xs transition-colors"
          >
            {workflowName || 'Untitled Workflow'}
          </button>
        )}

        {saveLabel && (
          <span className={`text-xs flex-shrink-0 ${saveColor}`}>{saveLabel}</span>
        )}
      </div>

      {/* ── Right: actions ──────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/8 rounded-md transition-all disabled:opacity-40"
        >
          {importing ? (
            <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1V8M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 10H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          Import
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/8 rounded-md transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 8V1M3 4L6 1L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1 10H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Export
        </button>

        {/* Run — label changes based on selection */}
        <button
          onClick={handleRun}
          disabled={running}
          title={
            selectedNodes.length === 1 ? 'Run selected node'
            : selectedNodes.length > 1 ? `Run ${selectedNodes.length} selected nodes`
            : 'Run full workflow'
          }
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors"
        >
          {running ? (
            <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
              <path d="M1 1L9 6L1 11V1Z" fill="currentColor" />
            </svg>
          )}
          {selectedNodes.length > 0 ? `Run (${selectedNodes.length})` : 'Run'}
        </button>
      </div>
    </header>
  )
}
