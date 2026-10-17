import { Link, useParams } from 'react-router-dom'
import { LoadFailed, Loading } from '../components/LoadState'
import { useTaso } from '../hooks/useTaso'
import { fetchCategories } from '../services/discovery'

export function CompetitionPage() {
  const { compId = '' } = useParams()
  const load = useTaso(() => fetchCategories(compId), [compId])
  const rows = load.state === 'ok' ? load.data : []
  const title = rows[0]?.competitionName || compId
  const tournament = rows.some((r) => r.type === 'tournament')
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
      <p className="text-[11px] uppercase tracking-wider text-amber-400">{tournament ? 'Turnaus' : 'Kilpailu'}</p>
      <h1 className="text-2xl font-black">{title}</h1>
      {load.state === 'loading' && <Loading />}
      {load.state === 'failed' && <LoadFailed what="Sarjoja" onRetry={load.retry} />}
      {load.state === 'ok' && rows.length === 0 && <p className="text-sm text-zinc-500">TASOssa ei ole tälle kilpailulle sarjoja.</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id}>
            <Link to={`/competition/${compId}/category/${r.id}`} className="flex min-h-14 items-center justify-between gap-2 rounded-2xl border border-zinc-800 px-4 py-3">
              <span>{r.name}</span>
              <span className="text-[11px] text-zinc-500 shrink-0">
                {r.playingMethod === 'mini-tournament' ? 'turnauspäivät · ' : ''}
                {r.matchCount ? `${r.matchCount} ottelua` : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
