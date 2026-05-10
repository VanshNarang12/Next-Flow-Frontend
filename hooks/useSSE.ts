'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/lib/api'
import { useWorkflowStore } from '@/store/workflow'

// ─────────────────────────────────────────────────────────────────────────────
// Shapes the backend sends on each SSE event
// ─────────────────────────────────────────────────────────────────────────────

type RunStartedPayload    = { runId: string; runNumber: number }
type NodeStartedPayload   = { nodeId: string; nodeType: string }
type NodeCompletedPayload = { nodeId: string; nodeType: string; output: Record<string, unknown> }
type NodeFailedPayload    = { nodeId: string; error: string }
type NodeSkippedPayload   = { nodeId: string }
type RunEndedPayload      = { runId: string }

// ─────────────────────────────────────────────────────────────────────────────
// Patches node.data with the execution output based on node type.
// Each node type stores its output in a different shape.
// ─────────────────────────────────────────────────────────────────────────────

function applyOutput(
  nodeId:   string,
  nodeType: string,
  output:   Record<string, unknown>,
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
      // Accept any string value the backend put in the output object
      const raw = output.result ?? output.value ?? output.response ?? output.outputImage ?? null
      const coerced = raw == null ? null : typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)
      updateNodeData(nodeId, { output: coerced })
      break
    }
    default:
      break
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

const RECONNECT_DELAY_MS = 3_000
const CLEAR_DELAY_MS     = 3_000   // how long to show glow after run ends

export function useSSE(workflowId: string) {
  const { isLoaded } = useAuth()
  // Select only stable action references — avoids re-running the effect
  const setNodeStatus    = useWorkflowStore((s) => s.setNodeStatus)
  const setActiveRunId   = useWorkflowStore((s) => s.setActiveRunId)
  const clearExecution   = useWorkflowStore((s) => s.clearExecutionState)
  const updateNodeData   = useWorkflowStore((s) => s.updateNodeData)

  useEffect(() => {
    if (!workflowId || !isLoaded) return

    let es: EventSource
    let closed         = false
    let clearTimer:    ReturnType<typeof setTimeout>
    let reconnectTimer: ReturnType<typeof setTimeout>

    function parse<T>(e: Event): T {
      return JSON.parse((e as MessageEvent).data) as T
    }

    function attach(source: EventSource) {

      // ── Run lifecycle ────────────────────────────────────────────────────
      source.addEventListener('run:started', (e) => {
        const { runId } = parse<RunStartedPayload>(e)
        clearTimeout(clearTimer)
        setActiveRunId(runId)
      })

      source.addEventListener('run:completed', (e) => {
        const { runId } = parse<RunEndedPayload>(e)
        setActiveRunId(runId)
        clearTimer = setTimeout(clearExecution, CLEAR_DELAY_MS)
      })

      source.addEventListener('run:failed', () => {
        clearTimer = setTimeout(clearExecution, CLEAR_DELAY_MS)
      })

      // ── Node lifecycle ───────────────────────────────────────────────────
      source.addEventListener('node:started', (e) => {
        const { nodeId } = parse<NodeStartedPayload>(e)
        setNodeStatus(nodeId, 'running')
      })

      source.addEventListener('node:completed', (e) => {
        const { nodeId, nodeType, output } = parse<NodeCompletedPayload>(e)
        setNodeStatus(nodeId, 'success')

        // getState() reads current store synchronously — safe inside event handlers
        const { nodes } = useWorkflowStore.getState()
        const node = nodes.find((n) => n.id === nodeId)
        const type = node?.type ?? nodeType
        if (output) applyOutput(nodeId, type, output, updateNodeData)
      })

      source.addEventListener('node:failed', (e) => {
        const { nodeId } = parse<NodeFailedPayload>(e)
        setNodeStatus(nodeId, 'failed')
      })

      source.addEventListener('node:skipped', (e) => {
        const { nodeId } = parse<NodeSkippedPayload>(e)
        setNodeStatus(nodeId, 'skipped')
      })

      // ── Connection error → manual reconnect if browser closed the stream ─
      source.onerror = () => {
        if (closed) return
        if (source.readyState === EventSource.CLOSED) {
          source.close()
          reconnectTimer = setTimeout(async () => {
            if (!closed) {
              es = await api.runs.stream(workflowId)
              attach(es)
            }
          }, RECONNECT_DELAY_MS)
        }
        // readyState === CONNECTING means the browser is auto-retrying; do nothing
      }
    }

    api.runs.stream(workflowId).then((source) => {
      if (closed) { source.close(); return }
      es = source
      attach(es)
    })

    return () => {
      closed = true
      clearTimeout(clearTimer)
      clearTimeout(reconnectTimer)
      es?.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, isLoaded])
}
