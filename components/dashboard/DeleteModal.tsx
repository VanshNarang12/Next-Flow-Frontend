type Props = {
  name: string
  deleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteModal({ name, deleting, onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-white mb-1">Delete workflow?</h2>
        <p className="text-sm text-white/50 mb-6 leading-relaxed">
          <span className="text-white/80">"{name}"</span> and all its run history will be
          permanently deleted. This cannot be undone.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {deleting && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
