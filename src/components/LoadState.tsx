export function Loading({ text = 'Haetaan TASOsta…' }: { text?: string }) {
  return <p className="text-sm text-zinc-500" role="status">{text}</p>
}

export function LoadFailed({ onRetry, what = 'Tietoja' }: { onRetry: () => void; what?: string }) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 space-y-2" role="alert">
      <p className="text-sm text-rose-200">{what} ei saatu ladattua. TASO ei vastannut juuri nyt – tämä ei tarkoita, ettei tietoja ole.</p>
      <button type="button" onClick={onRetry} className="min-h-11 px-4 rounded-xl bg-zinc-800 text-xs font-bold">Yritä uudelleen</button>
    </div>
  )
}
