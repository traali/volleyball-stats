import { Link, useParams } from 'react-router-dom'
import { LoadFailed, Loading } from '../components/LoadState'
import { useTaso } from '../hooks/useTaso'
import { fetchClub } from '../services/discovery'

function s(v: unknown) { return v == null ? '' : String(v).trim() }

export function ClubPage() {
  const { clubId = '' } = useParams()
  const load = useTaso(() => fetchClub(clubId), [clubId])
  const club = load.state === 'ok' ? load.data : null
  const teams = Array.isArray(club?.teams) ? club.teams as Record<string, unknown>[] : []
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
      {load.state === 'loading' && <Loading />}
      {load.state === 'failed' && <LoadFailed what="Seuraa" onRetry={load.retry} />}
      {load.state === 'notfound' && <p className="text-sm text-zinc-400">TASO sanoo, ettei seuraa {clubId} ole.</p>}
      {club && (
        <>
          <h1 className="text-2xl font-black">{s(club.name) || 'Seura'}</h1>
          <p className="text-xs text-zinc-500">{s(club.city_name)}</p>
          {teams.length === 0 && <p className="text-sm text-zinc-500">TASOssa ei ole seuralle joukkueita.</p>}
          <ul className="space-y-2">
            {teams.map((t) => (
              <li key={s(t.team_id)}>
                <Link to={`/team/${s(t.team_id)}`} className="block min-h-[44px] rounded-xl border border-zinc-800 px-3 py-2 text-sm">
                  {s(t.team_name)} <span className="text-zinc-500">{s(t.primary_category) || s(t.age_group)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
