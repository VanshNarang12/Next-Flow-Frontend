'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useWorkflowStore } from '@/store/workflow'
import NodeContextMenu from './NodeContextMenu'

type ConnectableNumber = { value: number; connectedFrom: { nodeId: string; handleId: string } | null }
type ConnectableImage  = { value: string | null; connectedFrom: { nodeId: string; handleId: string } | null }

type CropImageData = {
  label: string
  inputs: {
    inputImage: ConnectableImage
    x:          ConnectableNumber
    y:          ConnectableNumber
    width:      ConnectableNumber
    height:     ConnectableNumber
  }
  outputs: { outputImage: string | null }
  status:  'idle' | 'running' | 'success' | 'failed'
  triggerDevRunId: string | null
}

function glowClass(status: string) {
  if (status === 'running') return 'animate-glow'
  if (status === 'success') return 'animate-glow-success'
  if (status === 'failed')  return 'animate-glow-fail'
  return ''
}

function Slider({
  label,
  value,
  connected,
  onChange,
}: {
  label: string
  value: number
  connected: boolean
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/35 w-5 flex-shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={connected}
        onChange={(e) => onChange(Number(e.target.value))}
        className="nodrag nopan flex-1 h-1 accent-blue-400 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
      />
      <span className="text-[10px] text-white/40 w-7 text-right flex-shrink-0 tabular-nums">{value}%</span>
    </div>
  )
}

const DEFAULT_INPUT = { value: 0, connectedFrom: null }
const DEFAULT_IMAGE  = { value: null, connectedFrom: null }

export default function CropImageNode({ id, data, selected }: NodeProps) {
  const d              = data as CropImageData
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)

  // Guard against missing fields when node data is loaded from DB
  const inputs = {
    inputImage: d.inputs?.inputImage ?? DEFAULT_IMAGE,
    x:          d.inputs?.x          ?? { ...DEFAULT_INPUT, value: 0 },
    y:          d.inputs?.y          ?? { ...DEFAULT_INPUT, value: 0 },
    width:      d.inputs?.width      ?? { ...DEFAULT_INPUT, value: 100 },
    height:     d.inputs?.height     ?? { ...DEFAULT_INPUT, value: 100 },
  }
  const outputs = d.outputs ?? { outputImage: null }

  function setSlider(key: 'x' | 'y' | 'width' | 'height', value: number) {
    updateNodeData(id, {
      inputs: { ...inputs, [key]: { ...inputs[key], value } },
    })
  }

  const imageConnected = !!inputs.inputImage.connectedFrom

  return (
    <div className={`w-56 bg-[#1a1a1a] rounded-xl border shadow-xl transition-shadow ${
      selected ? 'border-violet-500/70' : 'border-white/10'
    } ${glowClass(d.status)}`}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
        <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-white/80 flex-1 truncate">{d.label}</span>
        <NodeContextMenu nodeId={id} />
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div className="px-3 py-2.5 flex flex-col gap-3">

        {/* Input image */}
        <div className="relative">
          <Handle
            type="target"
            position={Position.Left}
            id="inputImage"
            className="!w-3 !h-3 !border-2 !border-[#1a1a1a] !bg-blue-400"
            style={{ left: -8 }}
          />
          <div className={`h-11 rounded-lg border flex items-center justify-center ${
            imageConnected
              ? 'border-blue-400/40 bg-blue-400/5'
              : 'border-dashed border-white/12 bg-white/[0.02]'
          }`}>
            <span className="text-xs text-white/30 pl-3">
              {imageConnected ? 'Image connected' : 'Connect an image'}
            </span>
          </div>
        </div>

        {/* Coordinate sliders */}
        <div className="flex flex-col gap-2 px-0.5">
          <Slider label="X" value={inputs.x.value} connected={!!inputs.x.connectedFrom} onChange={(v) => setSlider('x', v)} />
          <Slider label="Y" value={inputs.y.value} connected={!!inputs.y.connectedFrom} onChange={(v) => setSlider('y', v)} />
          <Slider label="W" value={inputs.width.value} connected={!!inputs.width.connectedFrom} onChange={(v) => setSlider('width', v)} />
          <Slider label="H" value={inputs.height.value} connected={!!inputs.height.connectedFrom} onChange={(v) => setSlider('height', v)} />
        </div>

        {/* Output image */}
        <div className="relative">
          <Handle
            type="source"
            position={Position.Right}
            id="outputImage"
            className="!w-3 !h-3 !border-2 !border-[#1a1a1a] !bg-blue-400"
            style={{ right: -8, top: '50%' }}
          />
          {outputs.outputImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={outputs.outputImage}
              alt="Crop output"
              className="w-full h-24 object-cover rounded-lg border border-white/10"
            />
          ) : (
            <div className="h-11 rounded-lg border border-dashed border-white/12 bg-white/[0.02] flex items-center justify-center">
              <span className="text-xs text-white/20 pr-3">Output image</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
