'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/lib/api'
import { useWorkflowStore } from '@/store/workflow'

function applyOutput(
  nodeId: string,
  nodeType: string,
  output: Record<string, unknown>,
  updateNodeData: (id: string, patch: Record<string, unknown>) => void,
) {
  switch (nodeType) {
    case 'cropImage':
      updateNodeData(nodeId, { outputs: { outputImage: output.outputImage ?? null } })
      break
    case 'gemini':
      updateNodeData(nodeId, { outputs: { response: output.response ?? null } })
      break
    case 'response': {
      const raw = output.result ?? output.input ?? output.value ?? output.response ?? output.outputImage ?? null
      const coerced = raw == null ? null : typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)
      updateNodeData(nodeId, { output: coerced })
      break
    }
  }
}

const CLEAR_DELAY_MS = 3_000

export function useSSE(workflowId: string) {
  const { isLoaded }   = useAuth()
  const setNodeStatus  = useWorkflowStore((s) => s.setNodeStatus)
  const setActiveRunId = useWorkflowStore((s) => s.setActiveRunId)
  const clearExecution = useWorkflowStore((s) => s.clearExecutionState)
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)
  const activeRunId    = useWorkflowStore((s) => s.activeRunId)

  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!workflowId || !isLoaded || !activeRunId) return
    const runId = activeRunId

    let cancelled = false
    let es: EventSource | null = null

    async function connect() {
      let localEs: EventSource
      try {
        localEs = await api.runs.stream(workflowId)
      } catch {
        return
      }

      if (cancelled) {
        localEs.close()
        return
      }

      es = localEs

      es.addEventListener('node-status', (e: MessageEvent) => {
        const data = JSON.parse(e.data)
        if (data.runId !== runId) return
        setNodeStatus(data.nodeId, 'running', null)
      })

      es.addEventListener('node-complete', (e: MessageEvent) => {
        const data = JSON.parse(e.data)
        if (data.runId !== runId) return
        setNodeStatus(data.nodeId, 'success', null)
        if (data.output) {
          const { nodes } = useWorkflowStore.getState()
          const node = nodes.find((n) => n.id === data.nodeId)
          applyOutput(data.nodeId, node?.type ?? '', data.output, updateNodeData)
        }
      })

      es.addEventListener('node-failed', (e: MessageEvent) => {
        const data = JSON.parse(e.data)
        if (data.runId !== runId) return
        setNodeStatus(data.nodeId, data.status ?? 'failed', data.error ?? null)
      })

      es.addEventListener('run-complete', (e: MessageEvent) => {
        const data = JSON.parse(e.data)
        if (data.runId !== runId) return
        es?.close()
        es = null
        setActiveRunId(runId)
        clearTimerRef.current = setTimeout(clearExecution, CLEAR_DELAY_MS)
      })

      es.onerror = () => {
        es?.close()
        es = null
      }
    }

    connect()

    return () => {
      cancelled = true
      es?.close()
      clearTimeout(clearTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, isLoaded, activeRunId])
}
