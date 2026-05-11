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
      const raw = output.result ?? output.value ?? output.response ?? output.outputImage ?? null
      const coerced = raw == null ? null : typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)
      updateNodeData(nodeId, { output: coerced })
      break
    }
  }
}

const POLL_INTERVAL_MS = 2_000
const CLEAR_DELAY_MS   = 3_000

export function useSSE(workflowId: string) {
  const { isLoaded }   = useAuth()
  const setNodeStatus  = useWorkflowStore((s) => s.setNodeStatus)
  const setActiveRunId = useWorkflowStore((s) => s.setActiveRunId)
  const clearExecution = useWorkflowStore((s) => s.clearExecutionState)
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)
  const activeRunId    = useWorkflowStore((s) => s.activeRunId)

  const stopRef       = useRef(false)
  const timerRef      = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!workflowId || !isLoaded || !activeRunId) return
    const runId = activeRunId

    stopRef.current = false

    async function poll() {
      if (stopRef.current) return
      try {
        const { workflowRun } = await api.runs.get(workflowId, runId)
        if (stopRef.current) return

        for (const exec of workflowRun.nodeExecutions ?? []) {
          setNodeStatus(exec.nodeId, exec.status as never, exec.status === 'failed' ? (exec.error ?? null) : null)
          if (exec.output && exec.status === 'success') {
            const { nodes } = useWorkflowStore.getState()
            const node = nodes.find((n) => n.id === exec.nodeId)
            const type = node?.type ?? exec.nodeType
            applyOutput(exec.nodeId, type, exec.output, updateNodeData)
          }
        }

        const done = ['success', 'failed', 'partial'].includes(workflowRun.status)
        if (done) {
          setActiveRunId(workflowRun.id)
          clearTimerRef.current = setTimeout(clearExecution, CLEAR_DELAY_MS)
          return
        }
      } catch {
        // swallow poll errors, keep trying
      }

      if (!stopRef.current) {
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    poll()

    return () => {
      stopRef.current = true
      clearTimeout(timerRef.current)
      clearTimeout(clearTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, isLoaded, activeRunId])
}
