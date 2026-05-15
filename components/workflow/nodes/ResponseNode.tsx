'use client'

import { useState } from 'react'
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

async function downloadImage(url: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `output.${ext}`
    a.click()
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank')
  }
}

export default function ResponseNode({ id, data, selected }: NodeProps) {
  const d = data as ResponseData
  const [downloading, setDownloading] = useState(false)

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
          <div className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={output}
              alt="Result"
              className="w-full rounded-lg border border-white/10 object-cover max-h-48"
            />
            <button
              onClick={async (e) => {
                e.stopPropagation()
                if (downloading) return
                setDownloading(true)
                await downloadImage(output)
                setDownloading(false)
              }}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 rounded-md p-1.5 nodrag nopan"
              title="Download image"
            >
              {downloading ? (
                <span className="block w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v7m0 0L4.5 5.5M7 8l2.5-2.5M2 11h10" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        ) : (
          <div className="min-h-16 max-h-48 overflow-y-auto rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-2">
            <p className="text-xs text-white/70 whitespace-pre-wrap">{output}</p>
          </div>
        )}
      </div>
    </div>
  )
}
