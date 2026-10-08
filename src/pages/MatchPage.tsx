import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PointTape } from '../components/PointTape'
import { RotationBoard } from '../components/RotationBoard'
import { VolleyballPreviewExport } from '../components/VolleyballPreviewExport'
import { VolleyballSetGrid } from '../components/VolleyballSetGrid'
import { forfeitingSide, isForfeit, phaseForDisplay, pointsFromEvents, resultIsTrusted, rotationsFromMatch, setsFromMatch, setWasPlayed } from '../domain/rally'
import { fetchMatchRaw } from '../services/discovery'
import type { VolleyballMatchDetail, VolleyballSet } from '../types/volleyball'

type Tab = 'match' | 'rotations' | 'points' | 'share'

function s(v: unknown) { return v == null ? '' : String(v).trim() }

export function MatchPage() {
  const { matchId = '' } = useParams()
  return <MatchBody key={matchId} matchId={matchId} />
}

function MatchBody({ matchId }: { matchId: string }) {
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null)
  const [missing, setMissing] = useState(false)
  const [tab, setTab] = useState<Tab>('match')

  useEffect(() => {
    let cancel = false
    fetchMatchRaw(matchId).then((m) => {
      if (cancel) return
      setRaw(m)
      setMissing(!m)
    })
    return () => { cancel = true }
  }, [matchId])

  const view = useMemo(() => (raw ? present(raw) : null), [raw])

  if (missing) {
    return <main className="max-w-3xl mx-auto px-4 py-10 text-sm text-zinc-400">Ottelua {matchId} ei löytynyt TASOsta. Ei näytetä keksittyä tulosta.</main>
  }
  if (!view || !raw) {
    return <main className="max-w-3xl mx-auto px-4 py-10 text-sm text-zinc-500">Haetaan ottelua…</main>
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'match', label: 'Ottelu' },
    { id: 'rotations', label: 'Rotaatiot' },
    { id: 'points', label: `Pisteet (${view.points.length})` },
    { id: 'share', label: 'Jaa' },
  ]

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <p className="text-[11px] uppercase tracking-wider text-amber-400">{view.detail.categoryName}</p>
      <h1 className="text-xl font-black">{view.detail.homeTeamName} – {view.detail.awayTeamName}</h1>
      <p className="text-sm text-zinc-400">
        {view.detail.scheduledTime} · {view.detail.venue}
        {view.detail.courtName ? ` · ${view.detail.courtName}` : ''}
      </p>
      {view.forfeit && (
        <p className="text-lg font-black text-amber-300">
          Luovutus{view.forfeitBy ? `: ${view.forfeitBy} luovutti` : ''}
        </p>
      )}
      {view.trusted && !view.forfeit && view.phase !== 'upcoming' && (
        <p className="text-3xl font-black font-mono text-amber-300">{view.detail.setsWonHome}–{view.detail.setsWonAway}</p>
      )}
      {!view.trusted && <p className="text-sm text-zinc-500">Ei kirjattua tulosta. Ei näytetä 0–0:aa.</p>}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`px-3 py-2 rounded-xl text-xs font-bold ${tab === t.id ? 'bg-amber-500/20 text-amber-200' : 'text-zinc-400'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'match' && (
        <div className="space-y-3">
          {view.detail.sets.length > 0
            ? <VolleyballSetGrid sets={view.detail.sets} homeTeamName={view.detail.homeTeamName} awayTeamName={view.detail.awayTeamName} />
            : <p className="text-sm text-zinc-500">Ei erätuloksia.</p>}
          <ul className="text-xs text-zinc-400 space-y-1">
            {view.setLines.map((set) => (
              <li key={set.number}>
                {set.number}. erä {set.start || '—'}–{set.end || '—'}
                {set.durationMin ? ` · ${set.durationMin} min` : ''}
                {set.firstServe ? ` · aloittaa ${set.firstServe}` : ''}
              </li>
            ))}
          </ul>
          <p className="text-xs">
            <Link className="text-amber-300" to={`/team/${view.detail.homeTeamId}`}>{view.detail.homeTeamName}</Link>
            {' · '}
            <Link className="text-amber-300" to={`/team/${view.detail.awayTeamId}`}>{view.detail.awayTeamName}</Link>
          </p>
        </div>
      )}
      {tab === 'rotations' && <RotationBoard rows={view.rotations} home={view.detail.homeTeamName} away={view.detail.awayTeamName} />}
      {tab === 'points' && (
        <PointTape points={view.points} homeId={view.detail.homeTeamId} home={view.detail.homeTeamName} away={view.detail.awayTeamName} />
      )}
      {tab === 'share' && <VolleyballPreviewExport match={view.detail} />}
    </main>
  )
}

function present(raw: Record<string, unknown>) {
  const setLines = setsFromMatch(raw).filter(setWasPlayed)
  const phase = phaseForDisplay(raw)
  const trusted = resultIsTrusted(raw)
  const sets: VolleyballSet[] = setLines.map((set) => ({
    number: set.number,
    homeScore: set.home,
    awayScore: set.away,
    duration: set.durationMin ? `${set.durationMin} min` : undefined,
    status: 'finished',
  }))
  const homeWon = sets.filter((set) => set.homeScore > set.awayScore).length
  const awayWon = sets.filter((set) => set.awayScore > set.homeScore).length
  const homeId = s(raw.team_A_id)
  const awayId = s(raw.team_B_id)
  const detail: VolleyballMatchDetail = {
    id: s(raw.match_id),
    tournamentName: s(raw.competition_name),
    categoryName: s(raw.category_name),
    courtName: s(raw.venue_location_name) || undefined,
    scheduledTime: `${s(raw.date).slice(0, 10)} ${s(raw.time).slice(0, 5)}`.trim(),
    venue: s(raw.venue_name),
    homeTeamName: s(raw.team_A_name),
    awayTeamName: s(raw.team_B_name),
    homeTeamId: homeId,
    awayTeamId: awayId,
    setsWonHome: trusted ? (num(raw.fs_A) || homeWon) : 0,
    setsWonAway: trusted ? (num(raw.fs_B) || awayWon) : 0,
    sets,
    totalPointsHome: sets.reduce((n, set) => n + set.homeScore, 0),
    totalPointsAway: sets.reduce((n, set) => n + set.awayScore, 0),
    status: phase,
  }
  return {
    detail,
    phase,
    trusted,
    setLines: setLines.map((set) => ({
      ...set,
      firstServe: set.firstServeTeamId === homeId ? detail.homeTeamName : set.firstServeTeamId === awayId ? detail.awayTeamName : '',
    })),
    rotations: rotationsFromMatch(raw),
    points: pointsFromEvents(raw.events, homeId),
    forfeit: isForfeit(raw),
    forfeitBy: forfeitingSide(raw) === 'A' ? detail.homeTeamName : forfeitingSide(raw) === 'B' ? detail.awayTeamName : '',
  }
}

function num(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
