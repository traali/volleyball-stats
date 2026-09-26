import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchDiscovery, type Hit } from '../services/discovery'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const initial = params.get('q') || ''
  return <SearchBody key={initial} initial={initial} onSearch={(v) => setParams({ q: v })} />
}

function SearchBody({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [q, setQ] = useState(initial)
  const [hits, setHits] = useState<Hit[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'done'>(initial ? 'loading' : 'idle')

  useEffect(() => {
    if (!initial) return
    let cancel = false
    searchDiscovery(initial).then((rows) => {
      if (!cancel) { setHits(rows); setState('done') }
    })
    return () => { cancel = true }
  }, [initial])

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-black">Haku</h1>
      <form onSubmit={(e) => { e.preventDefault(); const v = q.trim(); if (v) onSearch(v) }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Seura, sarja tai linkki" className="flex-1 min-h-12 rounded-2xl bg-zinc-900 border border-zinc-800 px-4 text-sm" />
        <button className="min-h-12 px-4 rounded-2xl bg-amber-500 text-zinc-950 font-bold text-sm" type="submit">Hae</button>
      </form>
      {state === 'loading' && <p className="text-sm text-zinc-500">Haetaan TASOsta…</p>}
      {state === 'done' && hits.length === 0 && <p className="text-sm text-zinc-500">Ei osumia. Kokeile seuran nimeä tai sarjaa.</p>}
      <ul className="space-y-2">
        {hits.map((h) => (
          <li key={`${h.kind}-${h.id}`}>
            <Link to={h.href} className="block rounded-2xl border border-zinc-800 px-4 py-3 min-h-14">
              <p className="font-semibold">{h.title}</p>
              <p className="text-xs text-zinc-500">{h.subtitle}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
