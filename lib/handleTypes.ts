import type { Node, Edge } from '@xyflow/react'
import type { NodeField } from './api'

// ─────────────────────────────────────────────────────────────────────────────
// Data types that flow through edges
// ─────────────────────────────────────────────────────────────────────────────

export type HandleDataType = 'text' | 'image' | 'audio' | 'video' | 'file' | 'any'

// Static handle-id → type map (covers every named handle in the system)
const STATIC_TYPES: Record<string, HandleDataType> = {
  // CropImageNode
  inputImage:  'image',
  outputImage: 'image',

  // GeminiNode
  prompt:       'text',
  systemPrompt: 'text',
  response:     'text',
  video:        'video',
  audio:        'audio',
  file:         'file',

  // ResponseNode
  input: 'any',
}

// Which source types can plug into which target types
const COMPATIBLE: Record<HandleDataType, HandleDataType[]> = {
  text:  ['text', 'any'],
  image: ['image', 'any'],
  audio: ['audio', 'any'],
  video: ['video', 'any'],
  file:  ['file', 'any'],
  any:   ['text', 'image', 'audio', 'video', 'file', 'any'],
}

// ─────────────────────────────────────────────────────────────────────────────
// Handle type resolution
// ─────────────────────────────────────────────────────────────────────────────

export function getHandleType(
  handleId: string | null | undefined,
  nodeId: string,
  nodes: Node[],
): HandleDataType {
  if (!handleId) return 'any'

  // RequestInputsNode: field-{fieldId} handles — type comes from the field definition
  if (handleId.startsWith('field-')) {
    const node   = nodes.find((n) => n.id === nodeId)
    const fields = node?.data?.fields as NodeField[] | undefined
    const field  = fields?.find((f) => `field-${f.id}` === handleId)
    if (field) return field.type === 'text_field' ? 'text' : 'image'
  }

  // GeminiNode: visionImages-0, visionImages-1, ...
  if (/^visionImages-\d+$/.test(handleId)) return 'image'

  return STATIC_TYPES[handleId] ?? 'any'
}

export function areCompatible(
  sourceType: HandleDataType,
  targetType: HandleDataType,
): boolean {
  return COMPATIBLE[sourceType]?.includes(targetType) ?? false
}

// ─────────────────────────────────────────────────────────────────────────────
// Cycle detection — BFS from targetNodeId; if we reach sourceNodeId it's a cycle
// ─────────────────────────────────────────────────────────────────────────────

export function hasCycle(
  sourceNodeId: string,
  targetNodeId: string,
  edges: Edge[],
): boolean {
  const visited = new Set<string>()
  const queue   = [targetNodeId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === sourceNodeId) return true
    if (visited.has(current)) continue
    visited.add(current)

    for (const edge of edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        queue.push(edge.target)
      }
    }
  }

  return false
}
