'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type IsValidConnection,
} from '@xyflow/react'
import { useWorkflowStore } from '@/store/workflow'
import { api } from '@/lib/api'
import { nodeTypes } from '@/components/workflow/nodes'
import { getHandleType, areCompatible, hasCycle } from '@/lib/handleTypes'
import { useSSE } from '@/hooks/useSSE'
import CanvasBottomBar from '@/components/workflow/CanvasBottomBar'
import NodePickerModal from '@/components/workflow/NodePickerModal'
import CanvasTopBar from '@/components/workflow/CanvasTopBar'
import RunHistoryPanel from '@/components/workflow/panels/RunHistoryPanel'

function makeNode(type: string, position: { x: number; y: number }, existingCount: number): Node {
  const num    = existingCount + 1
  const id     = `node-${type}-${Date.now()}`

  if (type === 'requestInputs') {
    return {
      id,
      type,
      position,
      deletable: true,
      data: {
        label:          `Request Inputs #${num}`,
        deletable:      true,
        fields:         [],
        status:         'idle',
        triggerDevRunId: null,
      },
    }
  }

  if (type === 'response') {
    return {
      id,
      type,
      position,
      deletable: true,
      data: {
        label:  `Response #${num}`,
        deletable: true,
        inputs: { input: { value: null, connectedFrom: null } },
        output: null,
        status: 'idle',
        triggerDevRunId: null,
      },
    }
  }

  if (type === 'cropImage') {
    return {
      id,
      type,
      position,
      deletable: true,
      data: {
        label: `Crop Image #${num}`,
        deletable: true,
        inputs: {
          inputImage: { value: null, connectedFrom: null },
          x:          { value: 0,    connectedFrom: null },
          y:          { value: 0,    connectedFrom: null },
          width:      { value: 100,  connectedFrom: null },
          height:     { value: 100,  connectedFrom: null },
        },
        outputs:        { outputImage: null },
        status:         'idle',
        triggerDevRunId: null,
      },
    }
  }

  // gemini
  return {
    id,
    type,
    position,
    deletable: true,
    data: {
      label: `Gemini #${num}`,
      deletable: true,
      model: 'gemini-2.5-pro',
      inputs: {
        prompt:       { value: null, connectedFrom: null },
        systemPrompt: { value: '',   connectedFrom: null },
        visionImages: [],
        video:        { value: null, connectedFrom: null },
        audio:        { value: null, connectedFrom: null },
        file:         { value: null, connectedFrom: null },
      },
      settings: { temperature: 0.7, maxTokens: 1024, topP: 0.95, topK: 40 },
      outputs:         { response: null },
      status:          'idle',
      triggerDevRunId: null,
    },
  }
}


type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function CanvasView({ workflowId }: { workflowId: string }) {
  const { fitView, screenToFlowPosition } = useReactFlow()

  const store = useWorkflowStore()

  // Opens a persistent SSE stream for this workflow and drives node status + output state
  useSSE(workflowId)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const saveTimerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // Skip the auto-save that would fire right after initWorkflow populates nodes/edges
  const skipSaveRef   = useRef(true)

  // ── Load workflow ───────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const wf = await api.workflows.get(workflowId)
        if (cancelled) return
        store.initWorkflow(wf.id, wf.name, wf.nodes as Node[], wf.edges as Edge[])
        setLoading(false)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load workflow')
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId])

  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false
      return
    }
    setSaveStatus('saving')
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.workflows.updateCanvas(workflowId, store.nodes, store.edges as never)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 500)

    return () => clearTimeout(saveTimerRef.current)
  // store.nodes / store.edges are the only values that should trigger a save
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.nodes, store.edges, workflowId])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      // Don't hijack shortcuts while the user is typing
      if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return

      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo() }
      if (e.key === 'z' &&  e.shiftKey) { e.preventDefault(); store.redo() }
      if (e.key === 'y') { e.preventDefault(); store.redo() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [store.undo, store.redo])

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    if (changes.some((c) => c.type === 'remove')) store.pushHistory()
    store.onNodesChange(changes)
  }, [store])

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (changes.some((c) => c.type === 'remove')) store.pushHistory()
    store.onEdgesChange(changes)
  }, [store])

  const handleConnect = useCallback((connection: Connection) => {
    store.pushHistory()
    store.onConnect(connection)
  }, [store])

  const isValidConnection = useCallback<IsValidConnection>((connection) => {
    const { source, sourceHandle, target, targetHandle } = connection
    if (!source || !target)   return false
    if (source === target)    return false
    if (hasCycle(source, target, store.edges)) return false
    const srcType = getHandleType(sourceHandle, source, store.nodes)
    const tgtType = getHandleType(targetHandle ?? null, target, store.nodes)
    return areCompatible(srcType, tgtType)
  }, [store.nodes, store.edges])


  const handleAddNode = useCallback((type: string) => {
    const position = screenToFlowPosition({
      x: window.innerWidth  / 2,
      y: window.innerHeight / 2,
    })

    // Offset so stacked nodes don't land exactly on top of each other
    const existingCount = store.nodes.filter((n) => n.type === type).length
    position.x += existingCount * 40
    position.y += existingCount * 40

    const newNode = makeNode(type, position, existingCount)
    store.pushHistory()
    store.setNodes([...store.nodes, newNode])
    setPickerOpen(false)
  }, [screenToFlowPosition, store])


  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); store.initWorkflow('', '', [], []) }}
            className="text-xs text-white/40 hover:text-white underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CanvasTopBar saveStatus={saveStatus} />
      <div className="flex-1 relative overflow-hidden">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]">
            <span className="w-6 h-6 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
          </div>
        )}

        <ReactFlow
          nodes={store.nodes}
          edges={store.edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          isValidConnection={isValidConnection}
          onNodeDragStop={() => store.pushHistory()}
          onDoubleClick={() => fitView({ duration: 300 })}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          deleteKeyCode="Delete"
          className="bg-[#0a0a0a]"
        >
          <Background
            variant={'dots' as never}
            gap={16}
            size={1}
            color="#2a2a2a"
          />
          <Controls
            className="[&>button]:bg-[#1a1a1a] [&>button]:border-white/10 [&>button]:text-white/50 [&>button:hover]:bg-white/10"
          />
          <MiniMap
            nodeColor="#8b5cf6"
            maskColor="rgba(0,0,0,0.75)"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </ReactFlow>

        {/* Bottom floating toolbar */}
        <CanvasBottomBar
          pickerOpen={pickerOpen}
          onTogglePicker={() => setPickerOpen((o) => !o)}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((o) => !o)}
        />

        {/* Node picker */}
        {pickerOpen && (
          <NodePickerModal
            onClose={() => setPickerOpen(false)}
            onSelect={handleAddNode}
          />
        )}

        {/* Run history panel */}
        {historyOpen && (
          <RunHistoryPanel onClose={() => setHistoryOpen(false)} />
        )}
      </div>
    </div>
  )
}
