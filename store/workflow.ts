import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  MarkerType,
} from '@xyflow/react'
import { getHandleType } from '@/lib/handleTypes'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type NodeStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped'

type HistoryEntry = { nodes: Node[]; edges: Edge[] }

const MAX_HISTORY = 50

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────

interface WorkflowState {
  // Canvas — persisted to DB via auto-save
  nodes: Node[]
  edges: Edge[]

  // Workflow metadata
  workflowId: string
  workflowName: string

  // Undo / redo stacks
  past: HistoryEntry[]
  future: HistoryEntry[]

  // Execution state — ephemeral, never persisted
  runningNodeIds: Set<string>
  nodeOutputs: Record<string, unknown>
  activeRunId: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions shape
// ─────────────────────────────────────────────────────────────────────────────

interface WorkflowActions {
  // Canvas handlers wired directly into <ReactFlow>
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect

  // Bulk setters (used by canvas load and undo/redo)
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void

  // Workflow metadata
  setWorkflowName: (name: string) => void

  // History
  pushHistory: () => void
  undo: () => void
  redo: () => void

  // Per-node data mutation
  updateNodeData: (nodeId: string, patch: Record<string, unknown>) => void

  // Execution
  setNodeStatus: (nodeId: string, status: NodeStatus, error?: string | null) => void
  setNodeOutput: (nodeId: string, output: unknown) => void
  setActiveRunId: (runId: string | null) => void
  clearExecutionState: () => void

  // Initialise the store when a canvas page loads
  initWorkflow: (
    workflowId: string,
    workflowName: string,
    nodes: Node[],
    edges: Edge[]
  ) => void
}

export type WorkflowStore = WorkflowState & WorkflowActions

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────

  nodes: [],
  edges: [],
  workflowId: '',
  workflowName: '',
  past: [],
  future: [],
  runningNodeIds: new Set(),
  nodeOutputs: {},
  activeRunId: null,

  // ── Canvas handlers ────────────────────────────────────────────────────────

  onNodesChange(changes) {
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) }))
  },

  onEdgesChange(changes) {
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }))
  },

  onConnect(connection) {
    const { source, sourceHandle, target, targetHandle } = connection
    const { nodes } = get()

    const sourceType = getHandleType(sourceHandle, source ?? '', nodes)
    const targetType = getHandleType(targetHandle, target ?? '', nodes)

    const newEdge: Edge = {
      ...connection,
      id: `edge-${source}-${sourceHandle}-${target}-${targetHandle}`,
      type: 'animatedEdge',
      animated: true,
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
      data: { sourceType, targetType },
    }
    set((s) => ({ edges: addEdge(newEdge, s.edges) }))
  },

  // ── Bulk setters ───────────────────────────────────────────────────────────

  setNodes(nodes) {
    set({ nodes })
  },

  setEdges(edges) {
    set({ edges })
  },

  // ── Metadata ───────────────────────────────────────────────────────────────

  setWorkflowName(name) {
    set({ workflowName: name })
  },

  // ── History ────────────────────────────────────────────────────────────────

  pushHistory() {
    const { nodes, edges, past } = get()
    const snapshot: HistoryEntry = {
      nodes: nodes.map((n) => ({ ...n, data: { ...n.data } })),
      edges: [...edges],
    }
    set({
      past: [...past.slice(-MAX_HISTORY + 1), snapshot],
      future: [],
    })
  },

  undo() {
    const { nodes, edges, past, future } = get()
    if (past.length === 0) return

    const previous = past[past.length - 1]
    const currentSnapshot: HistoryEntry = {
      nodes: nodes.map((n) => ({ ...n, data: { ...n.data } })),
      edges: [...edges],
    }

    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: past.slice(0, -1),
      future: [currentSnapshot, ...future],
    })
  },

  redo() {
    const { nodes, edges, past, future } = get()
    if (future.length === 0) return

    const next = future[0]
    const currentSnapshot: HistoryEntry = {
      nodes: nodes.map((n) => ({ ...n, data: { ...n.data } })),
      edges: [...edges],
    }

    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, currentSnapshot],
      future: future.slice(1),
    })
  },

  // ── Node data ──────────────────────────────────────────────────────────────

  updateNodeData(nodeId, patch) {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    }))
  },

  // ── Execution ──────────────────────────────────────────────────────────────

  setNodeStatus(nodeId, status, error) {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, status, ...(error !== undefined && { error }) } } : n
      ),
      runningNodeIds:
        status === 'running'
          ? new Set([...s.runningNodeIds, nodeId])
          : (() => {
              const next = new Set(s.runningNodeIds)
              next.delete(nodeId)
              return next
            })(),
    }))
  },

  setNodeOutput(nodeId, output) {
    set((s) => ({
      nodeOutputs: { ...s.nodeOutputs, [nodeId]: output },
      nodes: s.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, output } }
          : n
      ),
    }))
  },

  setActiveRunId(runId) {
    set({ activeRunId: runId })
  },

  clearExecutionState() {
    set((s) => ({
      runningNodeIds: new Set(),
      nodeOutputs: {},
      activeRunId: null,
      // Reset every node's status back to idle
      nodes: s.nodes.map((n) => ({
        ...n,
        data: { ...n.data, status: 'idle' as NodeStatus },
      })),
    }))
  },

  // ── Init ───────────────────────────────────────────────────────────────────

  initWorkflow(workflowId, workflowName, nodes, edges) {
    set({
      workflowId,
      workflowName,
      nodes,
      edges,
      past: [],
      future: [],
      runningNodeIds: new Set(),
      nodeOutputs: {},
      activeRunId: null,
    })
  },
}))
