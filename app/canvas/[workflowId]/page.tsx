'use client'

import { useParams } from 'next/navigation'
import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CanvasView from '@/components/workflow/CanvasView'

export default function CanvasPage() {
  const params   = useParams()
  const workflowId = params.workflowId as string

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/*
        ReactFlowProvider wraps both CanvasTopBar and CanvasView so every
        child component can call useReactFlow() if needed.
      */}
      <ReactFlowProvider>
        {/* CanvasTopBar is rendered inside CanvasView so it shares saveStatus state */}
        <CanvasView workflowId={workflowId} />
      </ReactFlowProvider>
    </div>
  )
}
