'use client'

import { useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useWorkflowStore } from '@/store/workflow'
import NodeContextMenu from './NodeContextMenu'

type ConnectableValue = { value: string | null; connectedFrom: { nodeId: string; handleId: string } | null }
type VisionSlot       = { connectedFrom: { nodeId: string; handleId: string } | null }

type GeminiData = {
  label:    string
  model:    string
  inputs: {
    prompt:       ConnectableValue
    systemPrompt: ConnectableValue
    visionImages: VisionSlot[]
  }
  settings: {
    temperature: number
    maxTokens:   number
    topP:        number
    topK:        number
  }
  outputs:         { response: string | null }
  status:          'idle' | 'running' | 'success' | 'failed'
  error?:          string | null
  numVisionSlots?: number
  triggerDevRunId: string | null
}

const MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
]

function glowClass(status: string) {
  if (status === 'running') return 'animate-glow'
  if (status === 'success') return 'animate-glow-success'
  if (status === 'failed')  return 'animate-glow-fail'
  return ''
}

export default function GeminiNode({ id, data, selected }: NodeProps) {
  const d              = data as GeminiData
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)
  const edges          = useWorkflowStore((s) => s.edges)

  const [showSysPrompt, setShowSysPrompt] = useState(false)
  const [showSettings,  setShowSettings]  = useState(false)

  // Defensive defaults — fields may be missing when loaded from DB
  const inputs = {
    prompt:       d.inputs?.prompt       ?? { value: null, connectedFrom: null },
    systemPrompt: d.inputs?.systemPrompt ?? { value: '',   connectedFrom: null },
    visionImages: d.inputs?.visionImages ?? [],
  }
  const settings = {
    temperature: d.settings?.temperature ?? 0.7,
    maxTokens:   d.settings?.maxTokens   ?? 1024,
    topP:        d.settings?.topP        ?? 0.95,
    topK:        d.settings?.topK        ?? 40,
  }
  const output         = d.outputs?.response ?? null
  const numVisionSlots = d.numVisionSlots ?? 1

  const promptConnected    = edges.some((e) => e.target === id && e.targetHandle === 'prompt')
  const sysPromptConnected = edges.some((e) => e.target === id && e.targetHandle === 'systemPrompt')

  function setModel(model: string) {
    updateNodeData(id, { model })
  }

  function setPrompt(value: string) {
    updateNodeData(id, { inputs: { ...inputs, prompt: { ...inputs.prompt, value } } })
  }

  function setSysPrompt(value: string) {
    updateNodeData(id, { inputs: { ...inputs, systemPrompt: { ...inputs.systemPrompt, value } } })
  }

  function setSetting(key: keyof GeminiData['settings'], value: number) {
    updateNodeData(id, { settings: { ...settings, [key]: value } })
  }

  function addVisionSlot() {
    if (numVisionSlots >= 4) return
    updateNodeData(id, { numVisionSlots: numVisionSlots + 1 })
  }

  return (
    <div className={`w-60 bg-[#1a1a1a] rounded-xl border shadow-xl transition-shadow ${
      selected ? 'border-violet-500/70' : 'border-white/10'
    } ${glowClass(d.status)}`}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
        <div className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-white/80 flex-1 truncate">{d.label}</span>
        <NodeContextMenu nodeId={id} />
      </div>

      {/* Model selector */}
      <div className="px-3 pt-2">
        <select
          value={d.model}
          onChange={(e) => setModel(e.target.value)}
          className="nodrag nopan w-full bg-[#111] border border-white/10 rounded-md px-2 py-1 text-xs text-white/70 outline-none focus:border-violet-500/50 transition-colors cursor-pointer"
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* ── Inputs ────────────────────────────────────────────────────────────── */}
      <div className="px-3 py-2.5 flex flex-col gap-2.5">

        {/* Prompt */}
        <div className="relative">
          <Handle
            type="target"
            position={Position.Left}
            id="prompt"
            className="!w-3 !h-3 !border-2 !border-[#1a1a1a] !bg-violet-400"
            style={{ left: -8, top: 10 }}
          />
          <label className="text-[10px] text-white/35 block mb-1 pl-1">Prompt</label>
          {promptConnected ? (
            <div className="h-8 rounded-md border border-violet-400/30 bg-violet-400/5 flex items-center px-2">
              <span className="text-xs text-white/30">Connected</span>
            </div>
          ) : (
            <textarea
              value={inputs.prompt.value ?? ''}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter prompt…"
              rows={2}
              className="nodrag nopan w-full bg-[#111] border border-white/10 rounded-md px-2 py-1.5 text-xs text-white placeholder-white/20 outline-none resize-none focus:border-violet-400/50 transition-colors"
            />
          )}
        </div>

        {/* System prompt (collapsible) */}
        <div className="relative">
          <Handle
            type="target"
            position={Position.Left}
            id="systemPrompt"
            className="!w-3 !h-3 !border-2 !border-[#1a1a1a] !bg-violet-400/60"
            style={{ left: -8, top: 10 }}
          />
          <button
            onClick={() => setShowSysPrompt((o) => !o)}
            className="w-full flex items-center justify-between pl-1 text-[10px] text-white/35 hover:text-white/60 transition-colors mb-1"
          >
            <span>System prompt</span>
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              className={`transition-transform ${showSysPrompt ? 'rotate-180' : ''}`}
            >
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {showSysPrompt && (
            sysPromptConnected ? (
              <div className="h-8 rounded-md border border-violet-400/20 bg-violet-400/5 flex items-center px-2">
                <span className="text-xs text-white/30">Connected</span>
              </div>
            ) : (
              <textarea
                value={inputs.systemPrompt.value ?? ''}
                onChange={(e) => setSysPrompt(e.target.value)}
                placeholder="You are a helpful assistant…"
                rows={2}
                className="nodrag nopan w-full bg-[#111] border border-white/10 rounded-md px-2 py-1.5 text-xs text-white placeholder-white/20 outline-none resize-none focus:border-violet-400/40 transition-colors"
              />
            )
          )}
        </div>

        {/* Vision images */}
        <div>
          <div className="flex items-center justify-between pl-1 mb-1">
            <span className="text-[10px] text-white/35">Vision images</span>
            {numVisionSlots < 4 && (
              <button
                onClick={addVisionSlot}
                className="text-[10px] text-white/30 hover:text-violet-400 transition-colors"
              >
                + Add
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: numVisionSlots }).map((_, i) => {
              const isConnected = edges.some((e) => e.target === id && e.targetHandle === `visionImages-${i}`)
              return (
                <div key={i} className="relative">
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`visionImages-${i}`}
                    className="!w-3 !h-3 !border-2 !border-[#1a1a1a] !bg-blue-400"
                    style={{ left: -8 }}
                  />
                  <div className={`h-7 rounded-md border flex items-center px-2 ${
                    isConnected
                      ? 'border-blue-400/30 bg-blue-400/5'
                      : 'border-dashed border-white/12 bg-white/[0.02]'
                  }`}>
                    <span className="text-xs text-white/25">
                      {isConnected ? `Image ${i + 1} connected` : `Image ${i + 1}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Settings (collapsible) */}
        <div>
          <button
            onClick={() => setShowSettings((o) => !o)}
            className="w-full flex items-center justify-between pl-1 text-[10px] text-white/35 hover:text-white/60 transition-colors"
          >
            <span>Settings</span>
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              className={`transition-transform ${showSettings ? 'rotate-180' : ''}`}
            >
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showSettings && (
            <div className="mt-2 flex flex-col gap-2 pl-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/35 w-16 flex-shrink-0">Temp</span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={settings.temperature}
                  onChange={(e) => setSetting('temperature', Number(e.target.value))}
                  className="nodrag nopan flex-1 h-1 accent-violet-400 cursor-pointer"
                />
                <span className="text-[10px] text-white/40 w-8 text-right tabular-nums">
                  {settings.temperature.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/35 w-16 flex-shrink-0">Max tokens</span>
                <input
                  type="number"
                  min={1}
                  max={65536}
                  value={settings.maxTokens}
                  onChange={(e) => setSetting('maxTokens', Number(e.target.value))}
                  className="nodrag nopan flex-1 bg-[#111] border border-white/10 rounded px-2 py-0.5 text-xs text-white outline-none focus:border-violet-400/50 transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Response output */}
        <div className="relative">
          <Handle
            type="source"
            position={Position.Right}
            id="response"
            className="!w-3 !h-3 !border-2 !border-[#1a1a1a] !bg-violet-400"
            style={{ right: -8, top: 10 }}
          />
          <label className="text-[10px] text-white/35 block mb-1 pl-1">Response</label>
          <div className={`min-h-8 rounded-md border px-2 py-1.5 ${
            output
              ? 'border-violet-400/20 bg-violet-400/5'
              : 'border-dashed border-white/12 bg-white/[0.02]'
          }`}>
            {output ? (
              <p className="text-xs text-white/70 whitespace-pre-wrap line-clamp-6">{output}</p>
            ) : (
              <span className="text-xs text-white/20 pr-3">Output will appear here</span>
            )}
          </div>
        </div>

        {/* Error message */}
        {d.status === 'failed' && d.error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5">
            <p className="text-[10px] text-red-400 break-words line-clamp-4">{d.error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
