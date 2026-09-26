import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCompetitions } from '../services/discovery'

const filters = [
  { id: 'all', label: 'Kaikki' },
  { id: 'nuoret', label: 'Nuoret' },
  { id: 'liitto', label: 'Liitto' },
  { id: 'alue', label: 'Alue' },
] as const

export function BrowsePage() {
  const [rows, setRows] = useState<Array<{ id: string; name: string }>>([])
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all')
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    fetchCompetitions().then(setRows).catch(() => setErr('Sarjoja ei saatu TASOsta.'))
  }, [])

  const shown = rows.filter((r) => {
    const name = r.name.toLowerCase()
    if (filter === 'nuoret' && !name.includes('nuor') && !name.includes('u9')) return false
    if (filter === 'liitto' && !name.includes('liiton')) return false
    if (filter === 'alue' && !name.includes('suomi')) return false
    if (q && !name.includes(q.toLowerCase())) return false
    return true
  })

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-black">Selaa sarjoja</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suodata kilpailun nimellä…" className="w-full min-h-12 rounded-2xl bg-zinc-900 border border-zinc-800 px-4 text-sm" />
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filter === f.id ? 'border-amber-400 text-amber-300' : 'border-zinc-700 text-zinc-400'}`}>{f.label}</button>
        ))}
      </div>
      {err && <p className="text-sm text-zinc-500">{err}</p>}
      <ul className="space-y-2">
        {shown.map((r) => (
          <li key={r.id}><Link to={`/competition/${r.id}`} className="block rounded-2xl border border-zinc-800 px-4 py-3">{r.name}</Link></li>
        ))}
      </ul>
    </main>
  )
}
