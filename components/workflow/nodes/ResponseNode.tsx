'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import NodeContextMenu from './NodeContextMenu'

type ResponseData = {
  label:  string
  inputs: { input: { value: unknown; connectedFrom: { nodeId: string; handleId: string } | null } }
  output: string | null
  status: 'idle' | 'running' | 'success' | 'failed'
  triggerDevRunId: string | null
}

function glowClass(status: string) {
  if (status === 'running') return 'animate-glow'
  if (status === 'success') return 'animate-glow-success'
  if (status === 'failed')  return 'animate-glow-fail'
  return ''
}

export default function ResponseNode({ id, data, selected }: NodeProps) {
  const d = data as ResponseData

  const inputConnected = d.inputs?.input?.connectedFrom ?? null
  const output         = d.output ?? null

  const isImageUrl =
    typeof output === 'string' &&
    /^https?:\/\/.+\.(png|jpe?g|gif|webp|avif|svg)/i.test(output)

  return (
    <div className={`w-56 bg-[#1a1a1a] rounded-xl border shadow-xl transition-shadow ${
      selected ? 'border-violet-500/70' : 'border-white/10'
    } ${glowClass(d.status)}`}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
        <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-white/80 flex-1 truncate">{d.label}</span>
        <NodeContextMenu nodeId={id} />
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div className="px-3 py-2.5">

        {/* Input handle */}
        <div className="relative mb-2.5">
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="!w-3 !h-3 !border-2 !border-[#1a1a1a] !bg-emerald-400"
            style={{ left: -8, top: '50%' }}
          />
          <div className={`h-7 rounded-md border flex items-center px-2 ${
            inputConnected
              ? 'border-emerald-400/30 bg-emerald-400/5'
              : 'border-dashed border-white/12 bg-white/[0.02]'
          }`}>
            <span className="text-xs text-white/30 pl-1">
              {inputConnected ? 'Input connected' : 'Connect an output'}
            </span>
          </div>
        </div>

        {/* Result display */}
        {output == null ? (
          <div className="min-h-16 rounded-lg border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center">
            <span className="text-xs text-white/20">Result will appear here</span>
          </div>
        ) : isImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={output}
            alt="Result"
            className="w-full rounded-lg border border-white/10 object-cover max-h-48"
          />
        ) : (
          <div className="min-h-16 max-h-48 overflow-y-auto rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-2">
            <p className="text-xs text-white/70 whitespace-pre-wrap">{output}</p>
          </div>
        )}
      </div>
    </div>
  )
}
