export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
      <div className="text-center">
        <p className="text-6xl font-bold text-white/10">404</p>
        <p className="text-white/50 mt-3 text-sm">Page not found</p>
        <a href="/" className="mt-6 inline-block text-violet-400 hover:text-violet-300 text-sm transition-colors">
          Go home
        </a>
      </div>
    </div>
  )
}
