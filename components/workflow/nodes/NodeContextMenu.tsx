'use client'

import { useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useWorkflowStore } from '@/store/workflow'
import { api } from '@/lib/api'

export default function NodeContextMenu({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(false)
  const { getNode }     = useReactFlow()

  const workflowId  = useWorkflowStore((s) => s.workflowId)
  const nodes       = useWorkflowStore((s) => s.nodes)
  const edges       = useWorkflowStore((s) => s.edges)
  const setNodes    = useWorkflowStore((s) => s.setNodes)
  const setEdges    = useWorkflowStore((s) => s.setEdges)
  const pushHistory = useWorkflowStore((s) => s.pushHistory)

  async function handleRun() {
    setOpen(false)
    if (!workflowId) return
    await api.runs.trigger(workflowId, { scope: 'single', nodeId })
  }

  function handleDuplicate() {
    setOpen(false)
    const node = getNode(nodeId)
    if (!node) return
    pushHistory()
    const clone = {
      ...node,
      id:       `${node.id}-copy-${Date.now()}`,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      selected: false,
    }
    setNodes([...nodes, clone])
  }

  function handleDelete() {
    setOpen(false)
    pushHistory()
    setNodes(nodes.filter((n) => n.id !== nodeId))
    setEdges(edges.filter((e) => e.source !== nodeId && e.target !== nodeId))
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className="w-5 h-5 flex items-center justify-center rounded text-white/25 hover:text-white hover:bg-white/10 transition-colors text-sm leading-none"
        title="Node actions"
      >
        ···
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-50 w-32 bg-[#252525] border border-white/10 rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={handleRun}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/8 transition-colors"
            >
              <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
                <path d="M0.5 0.5L8.5 5.5L0.5 10.5V0.5Z" fill="currentColor" />
              </svg>
              Run
            </button>
            <button
              onClick={handleDuplicate}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/8 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3 3V2A1.5 1.5 0 0 1 4.5 0.5H10A1.5 1.5 0 0 1 11.5 2V7.5A1.5 1.5 0 0 1 10 9H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Duplicate
            </button>
            <div className="h-px bg-white/8" />
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400/70 hover:text-red-400 hover:bg-white/8 transition-colors"
            >
              <svg width="11" height="12" viewBox="0 0 11 12" fill="none">
                <path d="M1 3H10M3.5 3V2H7.5V3M4.5 5V9M6.5 5V9M2.5 3L3 10H8L8.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
