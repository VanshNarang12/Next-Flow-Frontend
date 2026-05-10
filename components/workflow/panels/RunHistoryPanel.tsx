'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useWorkflowStore } from '@/store/workflow'
import type { WorkflowRun, NodeExecution } from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000)  return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

function fmtRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─────────────────────────────────────────────────────────────────────────────
// Style maps
// ─────────────────────────────────────────────────────────────────────────────

const RUN_STATUS_STYLE: Record<string, string> = {
  running: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  failed:  'text-red-400    bg-red-400/10    border-red-400/20',
  partial: 'text-amber-400  bg-amber-400/10  border-amber-400/20',
}

const NODE_STATUS_DOT: Record<string, string> = {
  pending: 'bg-white/20',
  running: 'bg-violet-400 animate-pulse',
  success: 'bg-emerald-400',
  failed:  'bg-red-400',
  skipped: 'bg-white/10',
}

const SCOPE_LABEL: Record<string, string> = {
  full:    'Full',
  partial: 'Partial',
  single:  'Single',
}

// ─────────────────────────────────────────────────────────────────────────────
// NodeExecution row (inside an expanded run)
// ─────────────────────────────────────────────────────────────────────────────

function NodeRow({ exec }: { exec: NodeExecution }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
      <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${NODE_STATUS_DOT[exec.status] ?? 'bg-white/20'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-white/70 truncate">{exec.nodeName}</span>
          <span className="text-[10px] text-white/30 flex-shrink-0">{fmtDuration(exec.durationMs)}</span>
        </div>
        {exec.error && (
          <p className="text-[10px] text-red-400/80 mt-0.5 line-clamp-2">{exec.error}</p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Single run row — collapsed / expanded
// ─────────────────────────────────────────────────────────────────────────────

function RunRow({
  run,
  workflowId,
}: {
  run: WorkflowRun
  workflowId: string
}) {
  const [expanded,  setExpanded]  = useState(false)
  const [executions, setExecs]    = useState<NodeExecution[] | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [fetchErr,  setFetchErr]  = useState<string | null>(null)

  async function toggle() {
    if (expanded) { setExpanded(false); return }
    setExpanded(true)
    if (executions !== null) return       // already loaded
    setLoading(true)
    setFetchErr(null)
    try {
      const { workflowRun } = await api.runs.get(workflowId, run.id)
      setExecs(workflowRun.nodeExecutions ?? [])
    } catch {
      setFetchErr('Failed to load details')
    } finally {
      setLoading(false)
    }
  }

  const statusStyle = RUN_STATUS_STYLE[run.status] ?? 'text-white/40 bg-white/5 border-white/10'

  return (
    <div className="border-b border-white/6 last:border-0">
      {/* ── Collapsed header ─────────────────────────────────────── */}
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        {/* Run number */}
        <span className="text-xs text-white/30 flex-shrink-0 w-8">#{run.runNumber}</span>

        {/* Status badge */}
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 ${statusStyle}`}>
          {run.status}
        </span>

        {/* Scope */}
        <span className="text-[10px] text-white/30 flex-shrink-0">
          {SCOPE_LABEL[run.scope] ?? run.scope}
        </span>

        <div className="flex-1" />

        {/* Duration */}
        <span className="text-[10px] text-white/30 flex-shrink-0 tabular-nums">
          {fmtDuration(run.durationMs)}
        </span>

        {/* Relative time */}
        <span className="text-[10px] text-white/25 flex-shrink-0 w-14 text-right">
          {fmtRelative(run.startedAt)}
        </span>

        {/* Chevron */}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          className={`flex-shrink-0 text-white/25 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* ── Expanded node executions ──────────────────────────────── */}
      {expanded && (
        <div className="mx-4 mb-3 bg-[#111] rounded-lg border border-white/6 px-3 py-1">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <span className="w-4 h-4 border border-white/20 border-t-violet-400 rounded-full animate-spin" />
            </div>
          )}
          {fetchErr && (
            <p className="text-xs text-red-400/80 py-3 text-center">{fetchErr}</p>
          )}
          {executions !== null && executions.length === 0 && (
            <p className="text-xs text-white/25 py-3 text-center">No node executions recorded</p>
          )}
          {executions?.map((exec) => (
            <NodeRow key={exec.id} exec={exec} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  onClose: () => void
}

const PAGE_SIZE = 20

export default function RunHistoryPanel({ onClose }: Props) {
  const workflowId = useWorkflowStore((s) => s.workflowId)

  const [runs,       setRuns]       = useState<WorkflowRun[]>([])
  const [page,       setPage]       = useState(1)
  const [hasMore,    setHasMore]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fetchErr,   setFetchErr]   = useState<string | null>(null)

  const loadPage = useCallback(async (pageNum: number, append: boolean) => {
    if (!workflowId) return
    append ? setLoadingMore(true) : setLoading(true)
    setFetchErr(null)
    try {
      const result = await api.runs.list(workflowId, pageNum, PAGE_SIZE)
      setRuns((prev) => append ? [...prev, ...result.runns] : result.runns)
      setHasMore(result.isNextPresent)
      setPage(pageNum)
    } catch {
      setFetchErr('Failed to load runs')
    } finally {
      append ? setLoadingMore(false) : setLoading(false)
    }
  }, [workflowId])

  // Initial load
  useEffect(() => { loadPage(1, false) }, [loadPage])

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-[#131313] border-l border-white/8 z-20 flex flex-col animate-slide-in-right">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white/40">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M7 4V7.5L9.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-medium text-white/80">Run History</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-white/30 hover:text-white hover:bg-white/8 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {loading && (
          <div className="flex items-center justify-center h-32">
            <span className="w-5 h-5 border border-white/20 border-t-violet-400 rounded-full animate-spin" />
          </div>
        )}

        {fetchErr && !loading && (
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <p className="text-xs text-red-400/80">{fetchErr}</p>
            <button
              onClick={() => loadPage(1, false)}
              className="text-xs text-white/40 hover:text-white underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !fetchErr && runs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32">
            <p className="text-xs text-white/25">No runs yet</p>
          </div>
        )}

        {!loading && runs.map((run) => (
          <RunRow key={run.id} run={run} workflowId={workflowId} />
        ))}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="px-4 py-3">
            <button
              onClick={() => loadPage(page + 1, true)}
              disabled={loadingMore}
              className="w-full py-2 rounded-lg border border-white/8 text-xs text-white/40 hover:text-white hover:border-white/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingMore ? (
                <span className="w-3 h-3 border border-white/30 border-t-white/70 rounded-full animate-spin" />
              ) : (
                'Load more'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
