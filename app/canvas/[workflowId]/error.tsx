'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function CanvasError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Canvas error]', error)
  }, [error])

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center max-w-xs">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 7V10.5M10 13.5H10.01M3 17H17L10 3L3 17Z" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-white/80 text-sm font-medium mb-2">Canvas failed to load</h2>
        <p className="text-white/35 text-xs mb-6 leading-relaxed">{error.message}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-md transition-colors"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-1.5 text-white/40 hover:text-white text-xs underline transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
