'use client'

import { useState, useRef } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useWorkflowStore } from '@/store/workflow'
import { api } from '@/lib/api'
import type { NodeField } from '@/lib/api'

type RequestInputsData = {
  label: string
  deletable: boolean
  fields: NodeField[]
  status: 'idle' | 'running' | 'success' | 'failed'
  triggerDevRunId: string | null
}

function glowClass(status: string) {
  if (status === 'running') return 'animate-glow'
  if (status === 'success') return 'animate-glow-success'
  if (status === 'failed') return 'animate-glow-fail'
  return ''
}

function FieldLabel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() {
    const trimmed = draft.trim()
    onChange(trimmed || value)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        maxLength={60}
        className="nodrag nopan bg-transparent border-b border-violet-500 text-xs text-white outline-none w-full px-0.5"
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      className="text-xs text-white/60 hover:text-white truncate max-w-full text-left transition-colors"
    >
      {value}
    </button>
  )
}

function ImageUploadField({
  fieldId,
  nodeId,
  previewUrl,
  fileName,
  onUploaded,
}: {
  fieldId: string
  nodeId: string
  previewUrl?: string | null
  fileName?: string | null
  onUploaded: (data: { value: string; previewUrl: string; fileName: string; mimeType: string }) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    try {
      const { url } = await api.upload.uploadFile(file, fieldId, nodeId)
      onUploaded({ value: url, previewUrl: url, fileName: file.name, mimeType: file.type })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="mt-1">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      {previewUrl ? (
        <div className="relative group rounded-md overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={fileName ?? 'uploaded image'}
            className="w-full h-20 object-cover"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 text-xs text-white transition-opacity"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="nodrag nopan w-full h-16 border border-dashed border-white/20 hover:border-blue-400/50 rounded-md flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/60 transition-all disabled:opacity-50"
        >
          {uploading ? (
            <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-xs">Upload image</span>
            </>
          )}
        </button>
      )}
      {error && <p className="text-xs text-red-400 mt-1 truncate">{error}</p>}
    </div>
  )
}

export default function RequestInputsNode({ id, data, selected }: NodeProps) {
  const d = data as RequestInputsData
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)

  const [addingField, setAddingField] = useState(false)
  const fields: NodeField[] = d.fields ?? []

  function addField(type: 'text_field' | 'image_field') {
    const newField: NodeField = {
      id: `field-${Date.now()}`,
      type,
      label: type === 'text_field' ? 'Text Input' : 'Image Input',
      value: null,
    }
    updateNodeData(id, { fields: [...fields, newField] })
    setAddingField(false)
  }

  function removeField(fieldId: string) {
    updateNodeData(id, { fields: fields.filter((f) => f.id !== fieldId) })
  }

  function updateField(fieldId: string, patch: Partial<NodeField>) {
    updateNodeData(id, {
      fields: fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
    })
  }

  return (
    <div
      className={`min-w-56 max-w-72 bg-[#1a1a1a] rounded-xl border shadow-xl transition-shadow ${selected ? 'border-violet-500/70' : 'border-white/10'
        } ${glowClass(d.status)}`}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
        <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-white/80 flex-1 truncate">{d.label}</span>

        {/* Add-field button + dropdown */}
        <div className="relative">
          <button
            onClick={() => setAddingField((o) => !o)}
            className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors leading-none"
            title="Add field"
          >
            +
          </button>
          {addingField && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAddingField(false)} />
              <div className="absolute right-0 top-6 z-50 w-36 bg-[#252525] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                <button
                  onClick={() => addField('text_field')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/8 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                  Text field
                </button>
                <button
                  onClick={() => addField('image_field')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/8 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  Image field
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-3 py-2 flex flex-col gap-3">
        {fields.length === 0 && (
          <p className="text-xs text-white/25 text-center py-3">Click + to add a field</p>
        )}

        {fields.map((field) => (
          <div key={field.id} className="relative pr-2">
            {/* Source handle — one per field, positioned mid-height of this row */}
            <Handle
              type="source"
              position={Position.Right}
              id={`field-${field.id}`}
              className={`!w-3 !h-3 !border-2 !border-[#1a1a1a] ${field.type === 'text_field' ? '!bg-orange-400' : '!bg-blue-400'
                }`}
            />

            {/* Label row */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${field.type === 'text_field' ? 'bg-orange-400' : 'bg-blue-400'
                }`} />
              <div className="flex-1 min-w-0">
                <FieldLabel
                  value={field.label}
                  onChange={(label) => updateField(field.id, { label })}
                />
              </div>
              <button
                onClick={() => removeField(field.id)}
                className="text-white/20 hover:text-red-400 transition-colors text-xs flex-shrink-0"
                title="Remove field"
              >
                ✕
              </button>
            </div>

            {/* Field body */}
            {field.type === 'text_field' ? (
              <textarea
                value={field.value ?? ''}
                onChange={(e) => updateField(field.id, { value: e.target.value })}
                placeholder="Enter value…"
                rows={2}
                className="nodrag nopan w-full bg-[#111] border border-white/10 rounded-md px-2 py-1.5 text-xs text-white placeholder-white/25 outline-none resize-none focus:border-orange-400/50 transition-colors"
              />
            ) : (
              <ImageUploadField
                fieldId={field.id}
                nodeId={id}
                previewUrl={field.previewUrl}
                fileName={field.fileName}
                onUploaded={(patch) => updateField(field.id, patch)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
