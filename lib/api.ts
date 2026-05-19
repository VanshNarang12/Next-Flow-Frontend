declare const process: { env: Record<string, string | undefined> }

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type WorkflowSummary = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  activeRunStatus: 'idle' | 'running'
}

export type NodeField = {
  id: string
  type: 'text_field' | 'image_field'
  label: string
  value: string | null
  previewUrl?: string | null
  fileName?: string | null
  mimeType?: string | null
}

export type NodeInputDef =
  | { value: unknown; connectedFrom: { nodeId: string; handleId: string } | null }
  | Array<{ connectedFrom: { nodeId: string; handleId: string } }>

export type WorkflowNode = {
  id: string
  type?: string
  position: { x: number; y: number }
  deletable?: boolean
  data: Record<string, unknown>
}

export type WorkflowEdge = {
  id: string
  source: string
  sourceHandle?: string | null
  target: string
  targetHandle?: string | null
  type?: string
  animated?: boolean
  style?: Record<string, unknown>
  markerEnd?: Record<string, unknown>
  data?: { sourceType: string; targetType: string }
}

export type Workflow = {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: string
  updatedAt: string
}

export type RunScope = 'full' | 'partial' | 'single'
export type RunStatus = 'running' | 'success' | 'failed' | 'partial'
export type NodeStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'

export type NodeExecution = {
  id: string
  nodeId: string
  nodeType: string
  nodeName: string
  status: NodeStatus
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  inputsUsed: Record<string, unknown>
  output: Record<string, unknown> | null
  error: string | null
  triggerDevRunId: string | null
}

export type WorkflowRun = {
  id: string
  runNumber: number
  scope: RunScope
  status: RunStatus
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  finalResult: unknown | null
  includedNodeIds: string[]
  triggeredBy: string
  nodeExecutions?: NodeExecution[]
}

export type RunsPage = {
  runns: WorkflowRun[]
  isNextPresent: boolean
  page: number
  limit: number
}

export type UploadResult = {
  url: string
}

export type TriggerRunBody =
  | { scope: 'full' }
  | { scope: 'single'; nodeId: string }
  | { scope: 'partial'; nodeIds: string[] }

export type TriggerRunResult = {
  runId: string
  runNumber: number
  status: 'running'
}

export type ApiError = {
  error: string
  details?: unknown[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch helper
// ─────────────────────────────────────────────────────────────────────────────

// Clerk loads itself onto window.Clerk after ClerkProvider mounts.
// getToken() returns the short-lived session JWT for cross-origin Authorization headers.
async function getToken(): Promise<string | null> {
  try {
    type ClerkWindow = typeof window & {
      Clerk?: { session?: { getToken: () => Promise<string | null> } }
    }
    return await (window as ClerkWindow).Clerk?.session?.getToken() ?? null
  } catch {
    return null
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getToken()

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    const err = new Error((body as ApiError).error ?? res.statusText) as Error & {
      status: number
      body: ApiError
    }
    err.status = res.status
    err.body = body
    throw err
  }

  // 204 No Content or empty body
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow endpoints
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  workflows: {
    list(): Promise<WorkflowSummary[]> {
      return request<{ data: WorkflowSummary[] }>('/api/workflows').then((res) => res.data)
    },

    create(name: string): Promise<Workflow> {
      return request('/api/workflows', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
    },

    createFromSample(): Promise<Workflow> {
      return request('/api/workflows/sample', { method: 'POST' })
    },

    get(id: string): Promise<Workflow> {
      return request(`/api/workflows/${id}`)
    },

    updateName(id: string, name: string): Promise<{ id: string; updatedAt: string }> {
      return request(`/api/workflows/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      })
    },

    updateCanvas(
      id: string,
      nodes: WorkflowNode[],
      edges: WorkflowEdge[]
    ): Promise<{ id: string; updatedAt: string }> {
      return request(`/api/workflows/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ nodes, edges }),
      })
    },

    delete(id: string): Promise<{ deleted: boolean }> {
      return request(`/api/workflows/${id}`, { method: 'DELETE' })
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Run endpoints
  // ─────────────────────────────────────────────────────────────────────────

  runs: {
    trigger(workflowId: string, body: TriggerRunBody): Promise<TriggerRunResult> {
      return request(`/api/workflows/${workflowId}/run`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
    },

    list(workflowId: string, page = 1, limit = 20): Promise<RunsPage> {
      return request(`/api/workflows/${workflowId}/runs?page=${page}&limit=${limit}`)
    },

    get(workflowId: string, runId: string): Promise<{ workflowRun: WorkflowRun }> {
      return request(`/api/workflows/${workflowId}/runs/${runId}`)
    },

    // Returns the raw EventSource — caller is responsible for closing it.
    // EventSource doesn't support custom headers, so the token is passed as a
    // query param which Clerk's middleware also accepts.
    async stream(workflowId: string): Promise<EventSource> {
      const token = await getToken()
      const url = new URL(`${BASE}/api/workflows/${workflowId}/runs/stream`)
      if (token) url.searchParams.set('__clerk_token', token)
      return new EventSource(url.toString(), { withCredentials: true })
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Upload endpoint
  // ─────────────────────────────────────────────────────────────────────────

  upload: {
    async uploadFile(file: File, fieldId: string, nodeId: string): Promise<UploadResult> {
      const token = await getToken()
      const fd = new FormData()
      fd.append('file', file)
      fd.append('fieldId', fieldId)
      fd.append('nodeId', nodeId)

      const res = await fetch(`${BASE}/api/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        const err = new Error((body as ApiError).error ?? res.statusText) as Error & { status: number; body: ApiError }
        err.status = res.status
        err.body = body
        throw err
      }

      return res.json()
    },
  },
}
