import { Link } from 'react-router-dom'
import { useState } from 'react'
import { LoadFailed, Loading } from '../components/LoadState'
import { isTournamentCompetition } from '../domain/tournament'
import { useTaso } from '../hooks/useTaso'
import { fetchCompetitions, type Competition } from '../services/discovery'

const filters = [
  { id: 'all', label: 'Kaikki' },
  { id: 'turnaus', label: 'Turnaukset' },
  { id: 'nuoret', label: 'Nuoret' },
  { id: 'liitto', label: 'Liitto' },
  { id: 'alue', label: 'Alue' },
] as const

function dates(c: Competition) {
  const d = (x: string) => (/^\d{4}-\d{2}-\d{2}$/.test(x) && !x.startsWith('0000') ? x.split('-').reverse().join('.') : '')
  const a = d(c.start)
  const b = d(c.end)
  return a && b ? (a === b ? a : `${a}–${b}`) : ''
}

export function BrowsePage() {
  const load = useTaso(() => fetchCompetitions(), [])
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all')
  const [q, setQ] = useState('')

  const rows = load.state === 'ok' ? load.data : []
  const shown = rows.filter((r) => {
    const name = r.name.toLowerCase()
    if (filter === 'turnaus' && !isTournamentCompetition(r)) return false
    if (filter === 'nuoret' && !name.includes('nuor') && !name.includes('u9') && !name.includes('power cup')) return false
    if (filter === 'liitto' && !name.includes('liiton')) return false
    if (filter === 'alue' && !name.includes('suomi')) return false
    if (q && !name.includes(q.toLowerCase())) return false
    return true
  })

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-black">Selaa sarjoja ja turnauksia</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suodata kilpailun nimellä…" className="w-full min-h-12 rounded-2xl bg-zinc-900 border border-zinc-800 px-4 text-sm" />
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={`min-h-9 px-3 py-1.5 rounded-full text-xs font-semibold border ${filter === f.id ? 'border-amber-400 text-amber-300' : 'border-zinc-700 text-zinc-400'}`}>{f.label}</button>
        ))}
      </div>
      {load.state === 'loading' && <Loading />}
      {load.state === 'failed' && <LoadFailed what="Sarjoja" onRetry={load.retry} />}
      {load.state === 'ok' && shown.length === 0 && <p className="text-sm text-zinc-500">Ei kilpailuja tällä suodatuksella.</p>}
      <ul className="space-y-2">
        {shown.map((r) => (
          <li key={r.id}>
            <Link to={`/competition/${r.id}`} className="block rounded-2xl border border-zinc-800 px-4 py-3 min-h-14">
              <span className="flex items-center gap-2">
                <span className="font-semibold">{r.name}</span>
                {isTournamentCompetition(r) && <span className="rounded-full border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">Turnaus</span>}
              </span>
              {(dates(r) || r.location) && <span className="block text-xs text-zinc-500">{[dates(r), r.location].filter(Boolean).join(' · ')}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
