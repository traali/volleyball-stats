import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchClub } from '../services/discovery'

function s(v: unknown) { return v == null ? '' : String(v).trim() }

export function ClubPage() {
  const { clubId = '' } = useParams()
  const [club, setClub] = useState<Record<string, unknown> | null>(null)
  useEffect(() => { fetchClub(clubId).then(setClub) }, [clubId])
  const teams = Array.isArray(club?.teams) ? club.teams as Record<string, unknown>[] : []
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
      <h1 className="text-2xl font-black">{s(club?.name) || 'Seura'}</h1>
      <p className="text-xs text-zinc-500">{s(club?.city_name)}</p>
      {teams.length === 0 && <p className="text-sm text-zinc-500">Ei joukkueita.</p>}
      <ul className="space-y-2">
        {teams.map((t) => (
          <li key={s(t.team_id)}>
            <Link to={`/team/${s(t.team_id)}`} className="block rounded-xl border border-zinc-800 px-3 py-2 text-sm">
              {s(t.team_name)} <span className="text-zinc-500">{s(t.primary_category) || s(t.age_group)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
