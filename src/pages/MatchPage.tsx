import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CoachView } from '../components/CoachView'
import { CourtNowBoard, PlayerMatchStats, InGameTactics, Matchups, MatchRotationAnalysis, PointTimeline } from '../components/GameFlow'
import { VideoAnalysisSection } from '../components/VideoAnalysis'
import { Insights } from '../components/Insights'
import { insightInputs } from '../domain/insights'
import { PointTape } from '../components/PointTape'
import { RotationBoard } from '../components/RotationBoard'
import { VolleyballPreviewExport } from '../components/VolleyballPreviewExport'
import { VolleyballSetGrid } from '../components/VolleyballSetGrid'
import { forfeitingSide, isForfeit, liveState, phaseForDisplay, pointsFromEvents, resultIsTrusted, rotationsFromMatch, setsFromMatch, setsWonRecorded, setWasPlayed } from '../domain/rally'
import { formatLabel, isTie, setPointsLabel, matchFormat, setWentToExtraPoints } from '../domain/tournament'
import { LoadFailed } from '../components/LoadState'
import { useTaso } from '../hooks/useTaso'
import { actualRotation } from '../domain/preview'
import { matchups } from '../domain/gameFlow'
import { MatchPreview, type PreviewData } from '../components/MatchPreview'
import { fetchPreview } from '../services/preview'
import { fetchMatchRaw, federationUrl } from '../services/discovery'
import type { VolleyballMatchDetail, VolleyballSet } from '../types/volleyball'


function s(v: unknown) { return v == null ? '' : String(v).trim() }

export function MatchPage() {
  const { matchId = '' } = useParams()
  return <MatchBody key={matchId} matchId={matchId} />
}

function MatchBody({ matchId }: { matchId: string }) {
  const load = useTaso(() => fetchMatchRaw(matchId), [matchId])
  const loaded = load.state === 'ok' ? load.data : null
  const live = useLiveRefresh(matchId, loaded)
  const raw = live.raw ?? loaded
  const view = useMemo(() => (raw ? present(raw) : null), [raw])
  const [preview, setPreview] = useState<PreviewData | null>(null)
  useEffect(() => {
    if (!loaded) return
    let stop = false
    void fetchPreview(loaded).then((p) => { if (!stop) setPreview(p) })
    return () => { stop = true }
  }, [loaded])

  if (load.state === 'notfound') {
    return <main className="max-w-3xl mx-auto px-4 py-10 text-sm text-zinc-400">TASO sanoo, ettei ottelua {matchId} ole (tai sitä ei ole julkaistu). Ei näytetä keksittyä tulosta.</main>
  }
  if (load.state === 'failed') {
    return <main className="max-w-3xl mx-auto px-4 py-10"><LoadFailed what="Ottelua" onRetry={load.retry} /></main>
  }
  if (!view || !raw) {
    return <main className="max-w-3xl mx-auto px-4 py-10 text-sm text-zinc-500">Haetaan ottelua…</main>
  }

  const tacTeams = (preview?.teams || [{ id: String(raw.team_A_id), name: view.detail.homeTeamName }, { id: String(raw.team_B_id), name: view.detail.awayTeamName }]).map((t, i) => ({ id: t.id, name: t.name, roster: (t as { roster?: { number: string; name: string }[] }).roster || undefined, games: preview?.previousGames?.[i]?.games || [] }))

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <p className="text-[11px] uppercase tracking-wider text-amber-400">{view.detail.categoryName}</p>
      <h1 className="text-xl font-black">{view.detail.homeTeamName} – {view.detail.awayTeamName}</h1>
      <p className="text-sm text-zinc-400">
        {view.detail.scheduledTime} · {view.detail.venue}
        {view.detail.courtName ? ` · ${view.detail.courtName}` : ''}
      </p>
      <a href={federationUrl.match(matchId)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs text-zinc-400 underline">Tulospalvelu ↗</a>
      {view.phase !== 'upcoming' && <VideoAnalysisSection matchId={matchId} />}
      {view.phase === 'live' && <LiveBox raw={raw} home={view.detail.homeTeamName} away={view.detail.awayTeamName} updatedAt={live.at} failed={live.failed} sets={view.detail.sets} />}
      {view.phase !== 'upcoming' && raw && <CoachView raw={raw} home={view.detail.homeTeamName} away={view.detail.awayTeamName} live={view.phase === 'live'} usual={preview?.teams.map((t) => t.rotationStats)} />}
      {view.forfeit && (
        <p className="text-lg font-black text-amber-300">
          Luovutus{view.forfeitBy ? `: ${view.forfeitBy} luovutti` : ''}
        </p>
      )}
      {view.trusted && !view.forfeit && view.phase !== 'upcoming' && view.recorded && (
        <p className="text-3xl font-black font-mono text-amber-300">
          {view.recorded.home}–{view.recorded.away}
          {view.tie && <span className="ml-2 text-base font-bold text-zinc-300">tasapeli</span>}
        </p>
      )}
      {view.trusted && !view.forfeit && !view.recorded && view.setLines.length > 0 && (
        <p className="text-sm text-zinc-500">TASO ei ole kirjannut ottelun lopputulosta. Alla erät sellaisina kuin ne on kirjattu.</p>
      )}
      {!view.trusted && <p className="text-sm text-zinc-500">Ei kirjattua tulosta. Ei näytetä 0–0:aa.</p>}
      {view.format && <p className="text-xs text-zinc-500">Pelimuoto: {view.format}</p>}
      {view.phase !== 'upcoming' && <CourtNowBoard raw={raw} home={view.detail.homeTeamName} away={view.detail.awayTeamName} live={view.phase === 'live'} />}
      {view.phase !== 'upcoming' && preview && <Insights preview={preview} raw={raw} phase={view.phase} />}
      {view.phase !== 'upcoming' && raw && <InGameTactics raw={raw} teams={tacTeams} part="hot" />}
      {view.phase !== 'upcoming' && preview && <Matchups teams={tacTeams} raw={raw} />}
      {view.phase !== 'upcoming' && <MatchRotationAnalysis raw={raw} home={view.detail.homeTeamName} away={view.detail.awayTeamName} usual={preview?.teams.map((t) => t.rotationStats)} />}
      {view.phase !== 'upcoming' && raw && <InGameTactics raw={raw} teams={tacTeams} part="serve" />}
      {view.phase !== 'upcoming' && <PlayerMatchStats raw={raw} home={view.detail.homeTeamName} away={view.detail.awayTeamName} history={tacTeams.map((t) => t.games)} />}
      {view.phase !== 'upcoming' && raw && <InGameTactics raw={raw} teams={tacTeams} part="runs" />}
      {view.phase !== 'upcoming' && <PointTimeline raw={raw} home={view.detail.homeTeamName} away={view.detail.awayTeamName} />}
      {view.phase !== 'upcoming' && (
        <details className="text-xs"><summary className="min-h-[44px] text-zinc-400">Pistetyypit ja pelaajat</summary><PointTape points={view.points} homeId={view.detail.homeTeamId} home={view.detail.homeTeamName} away={view.detail.awayTeamName} /></details>
      )}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white">{view.phase === 'upcoming' ? 'Ottelu' : 'Kokoonpanot ja erät'}</h2>
        {view.phase !== 'upcoming' && <RotationBoard rows={view.rotations} home={view.detail.homeTeamName} away={view.detail.awayTeamName} />}
        {view.detail.sets.length > 0
          ? <VolleyballSetGrid sets={view.detail.sets} homeTeamName={view.detail.homeTeamName} awayTeamName={view.detail.awayTeamName} formatText={view.format} />
          : <p className="text-sm text-zinc-500">{view.phase === 'upcoming' ? 'Ei erätuloksia vielä: ottelua ei ole pelattu.' : 'Ei erätuloksia.'}</p>}
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
          <TeamLink id={view.detail.homeTeamId} name={view.detail.homeTeamName} />
          {' · '}
          <TeamLink id={view.detail.awayTeamId} name={view.detail.awayTeamName} />
        </p>
        {view.phase === 'upcoming' && preview && <Insights preview={preview} raw={raw} phase={view.phase} />}
        {view.phase === 'upcoming' && preview && <Matchups teams={tacTeams} raw={null} />}
        {preview ? <MatchPreview data={preview} raw={view.phase !== 'upcoming' ? raw : null} /> : <p className="text-sm text-zinc-500">Haetaan pelaajia, tilastoja ja sarjataulukkoa…</p>}
      </div>
      <h2 className="text-sm font-bold text-white">Jaa (md)</h2>
      <VolleyballPreviewExport
        match={view.detail}
        previousGames={preview?.previousGames}
        rotations={preview?.teams.map((t) => ({ team: t.name, rotation: (view.phase !== 'upcoming' && actualRotation(raw, t.id)) || t.rotation }))}
        h2hPrev={preview?.prevSeason ? { season: preview.prevSeason, games: preview.h2hPrev || [] } : undefined}
        teamStats={preview?.standings ?? undefined}
        raw={raw}
        insights={preview ? insightInputs(preview, raw, view.phase) : undefined}
        matchups={preview ? matchups(tacTeams, view.phase !== 'upcoming' ? raw : null) : undefined}
        rotationStats={preview?.teams.map((t) => ({ team: t.name, analysis: t.rotationStats ?? null }))}
        rosters={preview?.teams.filter((x) => x.roster).map((x) => ({ team: x.name, players: x.roster!, lineupPublished: preview.lineupPublished }))}
      />
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
    isDeuce: setWentToExtraPoints(set.home, set.away),
    status: 'finished',
  }))
  const recorded = setsWonRecorded(raw)
  const format = [formatLabel(matchFormat(raw)), setPointsLabel(raw)].filter(Boolean).join(' · ')
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
    setsWonHome: trusted && recorded ? recorded.home : 0,
    setsWonAway: trusted && recorded ? recorded.away : 0,
    resultRecorded: Boolean(trusted && recorded),
    formatText: format || undefined,
    sets,
    totalPointsHome: sets.reduce((n, set) => n + set.homeScore, 0),
    totalPointsAway: sets.reduce((n, set) => n + set.awayScore, 0),
    status: phase,
  }
  return {
    detail,
    phase,
    trusted,
    recorded,
    format,
    tie: isTie(raw),
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

const POLL_MS = 20_000

/** While the game is live and the tab is visible, re-read getMatch every ~20 s past the cache. */
function useLiveRefresh(matchId: string, loaded: Record<string, unknown> | null) {
  const [state, setState] = useState<{ raw: Record<string, unknown> | null; at: Date | null; failed: boolean }>({ raw: null, at: null, failed: false })
  const current = state.raw ?? loaded
  const isLive = current ? phaseForDisplay(current) === 'live' : false
  useEffect(() => {
    if (!isLive) return
    let stop = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      if (stop) return
      if (document.visibilityState === 'visible') {
        try {
          const next = await fetchMatchRaw(matchId, true)
          if (!stop && next) setState({ raw: next, at: new Date(), failed: false })
        } catch {
          if (!stop) setState((s) => ({ ...s, failed: true }))
        }
      }
      if (!stop) timer = setTimeout(tick, POLL_MS)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer)
        void tick()
      }
    }
    timer = setTimeout(tick, POLL_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stop = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isLive, matchId])
  return state
}

function LiveBox({ raw, home, away, updatedAt, failed, sets }: { raw: Record<string, unknown>; home: string; away: string; updatedAt: Date | null; failed: boolean; sets: VolleyballSet[] }) {
  const st = liveState(raw)
  return (
    <section data-testid="live-box" className="sticky top-0 z-20 -mx-4 border-b border-red-500/40 bg-zinc-950/95 backdrop-blur px-4 py-2 space-y-1">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-300">
        <span className="inline-block h-2 w-2 rounded-full bg-red-400 animate-pulse" />Käynnissä
        {st.currentSet ? <span className="text-zinc-300 normal-case font-bold">· {st.currentSet}. erä</span> : null}
      </p>
      {st.setsHome != null && st.setsAway != null && (
        <p className="text-sm text-zinc-300">Erät <span data-testid="live-sets" className="font-mono font-black text-amber-300">{st.setsHome}–{st.setsAway}</span></p>
      )}
      {st.points ? (
        <p className="text-3xl font-black font-mono text-white" data-testid="live-points">
          {st.serving === 'A' ? '● ' : ''}{st.points.home}–{st.points.away}{st.serving === 'B' ? ' ●' : ''}
        </p>
      ) : (
        <p className="text-sm text-zinc-400">Erän pisteitä ei ole vielä kirjattu (eräväli tai erä ei ole alkanut).</p>
      )}
      <p className="text-xs text-zinc-400">{home} – {away}{st.serving ? ` · syöttää ${st.serving === 'A' ? home : away}` : ''}</p>
      {sets.length > 0 && (
        <p className="flex flex-wrap gap-1 text-[11px] font-mono" data-testid="live-set-chips">
          {sets.map((x) => <span key={x.number} className={`rounded px-1.5 py-0.5 ${x.status === 'in_progress' ? 'bg-red-500/20 text-white' : 'bg-zinc-800 text-zinc-300'}`}>{x.number}. {x.homeScore}–{x.awayScore}</span>)}
        </p>
      )}
      {st.timeouts && (st.timeouts.home > 0 || st.timeouts.away > 0) && (
        <p className="text-xs text-zinc-400">Aikalisät tässä erässä: {st.timeouts.home}–{st.timeouts.away}</p>
      )}
      <p className="text-[11px] text-zinc-500" data-testid="live-updated">
        {failed ? 'Päivitys epäonnistui, yritetään uudelleen. ' : ''}
        {updatedAt ? `päivitetty klo ${updatedAt.toLocaleTimeString('fi-FI')} · päivittyy 20 s välein` : 'päivittyy 20 s välein'}
      </p>
    </section>
  )
}

function TeamLink({ id, name }: { id: string; name: string }) {
  if (!id || id === '0') return <span>{name}</span>
  return <Link className="text-amber-300" to={`/team/${id}`}>{name}</Link>
}
