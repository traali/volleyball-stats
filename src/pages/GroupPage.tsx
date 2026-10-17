import { Link, useParams } from 'react-router-dom'
import { DayScheduleView } from '../components/DayScheduleView'
import { LoadFailed, Loading } from '../components/LoadState'
import { MatchRow } from '../components/MatchRow'
import { stageKind, stageLabel, standingColumns, standingsState } from '../domain/tournament'
import { useTaso } from '../hooks/useTaso'
import { fetchGroup } from '../services/discovery'

function s(v: unknown) { return v == null ? '' : String(v).trim() }

export function GroupPage() {
  const { compId = '', catId = '', groupId = '' } = useParams()
  const load = useTaso(() => fetchGroup(compId, catId, groupId), [compId, catId, groupId])
  if (load.state === 'loading') return <main className="max-w-3xl mx-auto px-4 py-6"><Loading /></main>
  if (load.state !== 'ok') {
    return <main className="max-w-3xl mx-auto px-4 py-6"><LoadFailed what="Lohkoa" onRetry={load.retry} /></main>
  }
  const data = load.data
  const kind = stageKind(data.groupType)
  const table = standingsState(data.groupType, data.teams)
  const teams = [...data.teams].sort((a, b) => Number(a.current_standing || 99) - Number(b.current_standing || 99))
  const cols = standingColumns(data.matchPoints, data.teams)
  const rounds = new Map<string, Record<string, unknown>[]>()
  if (kind === 'knockout') {
    for (const m of data.matches) {
      const key = s(m.round_name) || (s(m.round_id) ? `${s(m.round_id)}. kierros` : '')
      if (!rounds.has(key)) rounds.set(key, [])
      rounds.get(key)!.push(m)
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div>
        <Link to={`/competition/${compId}/category/${catId}`} className="text-[11px] uppercase tracking-wider text-amber-400">{data.competition} · {data.category}</Link>
        <h1 className="text-2xl font-black">{data.name || 'Lohko'}</h1>
        <p className="text-xs text-zinc-500">{data.phaseName && data.phaseName !== data.name ? `${data.phaseName} · ` : ''}{stageLabel(data.groupType)}</p>
      </div>

      {table === 'table' && (
        <section className="space-y-1.5">
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-xs">
              <thead className="text-zinc-500">
                <tr>
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">Joukkue</th>
                  {cols.map((c) => <th key={c.key} className="p-2" title={c.help}>{c.label}</th>)}
                  <th className="p-2" title="voitetut–hävityt erät">Erät</th>
                  <th className="p-2" title="sarjapisteet TASOn mukaan">P</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={s(t.team_id)} className="border-t border-zinc-800">
                    <td className="p-2">{s(t.current_standing)}</td>
                    <td className="p-2"><Link to={`/team/${s(t.team_id)}`} className="text-amber-300">{s(t.team_name)}</Link></td>
                    {cols.map((c) => <td key={c.key} className="p-2 text-center">{s(t[c.key])}</td>)}
                    <td className="p-2 text-center font-mono">{s(t.goals_for) !== '' && s(t.goals_against) !== '' ? `${s(t.goals_for)}–${s(t.goals_against)}` : ''}</td>
                    <td className="p-2 text-center font-bold">{s(t.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-zinc-500">Taulukko on TASOn oma. {cols.filter((c) => c.key !== 'matches_played').map((c) => `${c.label} = ${c.help}`).join(', ')}.</p>
        </section>
      )}

      {table === 'not-started' && (
        <section className="space-y-1.5">
          <h2 className="text-sm font-bold">Joukkueet</h2>
          <p className="text-xs text-zinc-500">Lohkossa ei ole vielä pelattu. Taulukko näkyy, kun TASO kirjaa tuloksia.</p>
          <ul className="flex flex-wrap gap-1.5">
            {teams.map((t) => (
              <li key={s(t.team_id)}><Link to={`/team/${s(t.team_id)}`} className="inline-flex min-h-[44px] items-center rounded-xl border border-zinc-800 px-3 text-sm text-amber-300">{s(t.team_name)}</Link></li>
            ))}
          </ul>
        </section>
      )}

      {table === 'none' && kind !== 'knockout' && kind !== 'placement' && data.teams.length > 0 && (
        <p className="text-xs text-zinc-500">TASO ei anna tälle lohkolle sarjataulukkoa, joten sitä ei näytetä.</p>
      )}

      <h2 className="text-sm font-bold">Ottelut ({data.matches.length})</h2>
      {data.matches.length === 0 && <p className="text-sm text-zinc-500">TASOssa ei ole vielä otteluita tälle lohkolle.</p>}
      {kind === 'knockout' && data.matches.length > 0
        ? (
          <div className="space-y-4">
            {[...rounds.entries()].map(([title, list]) => (
              <section key={title || 'r'} className="space-y-1.5">
                {title && <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{title}</h3>}
                <ul className="space-y-1.5">{list.map((m) => <li key={s(m.match_id)}><MatchRow m={m} showDate /></li>)}</ul>
              </section>
            ))}
          </div>
        )
        : <DayScheduleView matches={data.matches} />}
    </main>
  )
}
