import { Link, useParams } from 'react-router-dom'
import { FavButton } from '../components/FavButton'
import { LoadFailed, Loading } from '../components/LoadState'
import { MatchRow } from '../components/MatchRow'
import { useFavorites } from '../hooks/useFavorites'
import { useTaso } from '../hooks/useTaso'
import { federationUrl, fetchMatches, fetchTeam } from '../services/discovery'

function s(v: unknown) { return v == null || typeof v === 'object' ? '' : String(v).trim() }

/** primary_category is an object in getTeam ({ category_name, … }), a string elsewhere. */
function categoryName(v: unknown) {
  if (v && typeof v === 'object') return s((v as Record<string, unknown>).category_name)
  return s(v)
}

export function TeamPage() {
  const { teamId = '' } = useParams()
  const team = useTaso(() => fetchTeam(teamId), [teamId])
  const matches = useTaso(() => fetchMatches(teamId), [teamId])
  const { has, toggle } = useFavorites()
  const t = team.state === 'ok' ? team.data : null
  const name = s(t?.team_name) || s(t?.name)
  const roster = (Array.isArray(t?.players) ? (t?.players as Record<string, unknown>[]) : [])
    .filter((p) => s(p.player_id) && s(p.inactive) !== '1' && (!s(p.removed) || s(p.removed).startsWith('0000')))
  const groups = (Array.isArray(t?.groups) ? (t?.groups as Record<string, unknown>[]) : [])
    .filter((g) => s(g.competition_id) && s(g.category_id) && s(g.group_id))
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {team.state === 'loading' && <Loading />}
      {team.state === 'failed' && <LoadFailed what="Joukkuetta" onRetry={team.retry} />}
      {team.state === 'notfound' && <p className="text-sm text-zinc-400">TASO sanoo, ettei joukkuetta {teamId} ole.</p>}
      {t && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-black">{name || `Joukkue ${teamId}`}</h1>
            <p className="text-xs text-zinc-500">{[s(t.club_name), categoryName(t.primary_category)].filter(Boolean).join(' · ')}</p>
            <a href={federationUrl.team(teamId)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs text-zinc-400 underline">Tulospalvelu ↗</a>
          </div>
          {name && <FavButton item={{ kind: 'team', id: teamId, name }} on={has('team', teamId)} onToggle={toggle} />}
        </div>
      )}
      {groups.length > 0 && (
        <section className="space-y-1.5">
          <h2 className="text-sm font-bold">Sarjat ja lohkot</h2>
          <ul className="flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <li key={`${s(g.competition_id)}-${s(g.category_id)}-${s(g.group_id)}`}>
                <Link to={`/group/${s(g.competition_id)}/${s(g.category_id)}/${s(g.group_id)}`} className="inline-flex min-h-[44px] items-center rounded-xl border border-zinc-800 px-3 text-xs">
                  {s(g.category_name)} · {s(g.group_name) || `Lohko ${s(g.group_id)}`}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {roster.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold">Pelaajat ({roster.length})</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {roster.map((p) => (
              <li key={s(p.player_id)}>
                <Link to={`/player/${s(p.player_id)}`} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-800 px-3 text-sm">
                  {s(p.shirt_number) && <span className="font-mono text-amber-300 w-7">#{s(p.shirt_number)}</span>}
                  <span className="truncate">{`${s(p.first_name)} ${s(p.last_name)}`.trim()}</span>
                  {s(p.position_fi) && <span className="ml-auto text-[11px] text-zinc-500">{s(p.position_fi)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {matches.state === 'loading' && team.state !== 'loading' && <Loading text="Haetaan otteluita…" />}
      {matches.state === 'failed' && <LoadFailed what="Otteluita" onRetry={matches.retry} />}
      {matches.state === 'ok' && (
        <>
          <h2 className="text-sm font-bold">Ottelut ({matches.data.length})</h2>
          {matches.data.length === 0 && <p className="text-sm text-zinc-500">TASOssa ei ole otteluita tälle joukkueelle.</p>}
          <ul className="space-y-2">
            {matches.data.map((m) => <li key={s(m.match_id)}><MatchRow m={m} showDate /></li>)}
          </ul>
        </>
      )}
    </main>
  )
}
