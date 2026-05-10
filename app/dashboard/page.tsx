'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { useAuth } from '@clerk/nextjs'
import { api, type WorkflowSummary } from '@/lib/api'
import WorkflowCard from '@/components/dashboard/WorkflowCard'
import DeleteModal from '@/components/dashboard/DeleteModal'

export default function DashboardPage() {
  const router = useRouter()
  const { isLoaded } = useAuth()

  const [workflows, setWorkflows]       = useState<WorkflowSummary[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [creating, setCreating]         = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WorkflowSummary | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const loadWorkflows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.workflows.list()
      setWorkflows(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (isLoaded) loadWorkflows() }, [loadWorkflows, isLoaded])

  async function handleCreate() {
    setCreating(true)
    setError(null)
    try {
      const wf = await api.workflows.create('Untitled Workflow')
      router.push(`/canvas/${wf.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create workflow')
      setCreating(false)
    }
  }

  async function handleRename(id: string, name: string) {
    // Optimistic update first
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)))
    try {
      await api.workflows.updateName(id, name)
    } catch (e: unknown) {
      // Roll back on failure
      setError(e instanceof Error ? e.message : 'Failed to rename workflow')
      loadWorkflows()
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.workflows.delete(deleteTarget.id)
      setWorkflows((prev) => prev.filter((w) => w.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete workflow')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="h-14 flex-shrink-0 border-b border-white/8 flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div className="w-6 h-6 rounded-md bg-violet-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-wide">NextFlow</span>
        </div>

        <UserButton afterSignOutUrl="/sign-in" />
      </header>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        {/* Page heading row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-white">My Workflows</h1>
            {!loading && (
              <p className="text-xs text-white/30 mt-0.5">
                {workflows.length === 0
                  ? 'No workflows yet'
                  : `${workflows.length} workflow${workflows.length === 1 ? '' : 's'}`}
              </p>
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {creating ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            New Workflow
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-36 bg-white/5 rounded-xl animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && workflows.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-40 gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/30">
                <path d="M12 3L21 7.5V16.5L12 21L3 16.5V7.5L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M12 3V21M3 7.5L21 16.5M21 7.5L3 16.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white/50 text-sm font-medium">No workflows yet</p>
              <p className="text-white/25 text-xs mt-1">Create your first workflow to get started</p>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 border border-violet-500/30 hover:border-violet-400/50 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
            >
              {creating ? (
                <span className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              Create your first workflow
            </button>
          </div>
        )}

        {/* Workflow grid */}
        {!loading && workflows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {workflows.map((wf) => (
              <WorkflowCard
                key={wf.id}
                workflow={wf}
                onOpen={() => router.push(`/canvas/${wf.id}`)}
                onRename={(name) => handleRename(wf.id, name)}
                onDelete={() => setDeleteTarget(wf)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Delete confirmation modal ──────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          deleting={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !deleting && setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
