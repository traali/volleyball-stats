/**
 * "Ennuste ja havainnot": deterministic insights from TASO data only (no AI, no cloud).
 * Pre-game: form, standings, rotation strengths, key scorers, rough win likelihood with its basis.
 * In-game: "Pysyy / Poikkeaa" — live numbers vs recent-game baselines.
 */
import { rotationAnalysis, setFlows, type RotationAnalysis } from './gameFlow'
import type { GameLine, RosterPlayer, TeamSeason } from './preview'

type Row = Record<string, unknown>
type Side = 'A' | 'B'
const s = (v: unknown) => (v == null ? '' : String(v).trim())
const pct = (x: number) => `${Math.round(x * 100)} %`

export interface TeamFacts { id: string; name: string; recent: GameLine[] | null; season: TeamSeason | null; roster: RosterPlayer[] | null; rotationStats?: RotationAnalysis | null }

export interface Likelihood { home: number; basis: string[] }

/** Rough home-win likelihood: logistic of standings win%, set ratio, ball ratio and recent form differences. */
export function winLikelihood(a: TeamFacts, b: TeamFacts): Likelihood | null {
  const basis: string[] = []
  let score = 0
  const sa = a.season, sb = b.season
  if (sa && sb && sa.played && sb.played) {
    const wr = sa.won / sa.played - sb.won / sb.played
    const sr = sa.setsFor / Math.max(1, sa.setsFor + sa.setsAgainst) - sb.setsFor / Math.max(1, sb.setsFor + sb.setsAgainst)
    const br = sa.ballsFor / Math.max(1, sa.ballsFor + sa.ballsAgainst) - sb.ballsFor / Math.max(1, sb.ballsFor + sb.ballsAgainst)
    score += 1.5 * wr + 3 * sr + 8 * br
    basis.push(`voitto-% ${pct(sa.won / sa.played)} vs ${pct(sb.won / sb.played)}`, (`erät ${sa.setsFor}–${sa.setsAgainst} vs ${sb.setsFor}–${sb.setsAgainst}`), `pallot ${sa.ballsFor}–${sa.ballsAgainst} vs ${sb.ballsFor}–${sb.ballsAgainst}`)
  }
  const form = (r: GameLine[] | null) => (r && r.length ? r.filter((g) => g.won).length / r.length : null)
  const fa = form(a.recent), fb = form(b.recent)
  if (fa != null && fb != null) {
    score += 1.2 * (fa - fb)
    basis.push(`viime ottelut ${a.recent!.filter((g) => g.won).length}/${a.recent!.length} vs ${b.recent!.filter((g) => g.won).length}/${b.recent!.length} voittoa`)
  }
  if (!basis.length) return null
  score += 0.1 // small home edge
  basis.push('kotietu +0,1')
  return { home: 1 / (1 + Math.exp(-score)), basis }
}

export function pregameInsights(home: TeamFacts, away: TeamFacts): string[] {
  const out: string[] = []
  for (const t of [home, away]) {
    const r = t.recent
    if (r && r.length) out.push(`${t.name}: viime ${r.length} ottelua ${r.map((g) => (g.won ? 'V' : 'H')).join('')} (erät ${r.reduce((x, g) => x + g.setsFor, 0)}–${r.reduce((x, g) => x + g.setsAgainst, 0)}).`)
    else out.push(`${t.name}: ei tietoa viime otteluista.`)
    if (t.season) out.push(`${t.name}: sarjassa ${t.season.standing}. (${t.season.won}–${t.season.lost}, ${t.season.points} p).`)
    const a = t.rotationStats
    if (a) out.push(`${t.name}: vahvin kierto ${a.strong[0].rotation} (${a.strong[0].net >= 0 ? '+' : ''}${a.strong[0].net}), haastavin ${a.weak[0].rotation} (${a.weak[0].net >= 0 ? '+' : ''}${a.weak[0].net}) ${a.games} ottelussa.`)
    const top = (t.roster || []).filter((p) => p.points != null).sort((x, y) => (y.points || 0) - (x.points || 0)).slice(0, 3)
    if (top.length) out.push(`${t.name}: kärkipisteet ${top.map((p) => `#${p.number} ${p.name.split(' ').slice(-1)[0]} ${p.points} p / ${p.matches} ott`).join(', ')}.`)
  }
  const l = winLikelihood(home, away)
  out.push(l ? `Karkea voittotodennäköisyys: ${home.name} ${pct(l.home)} – ${away.name} ${pct(1 - l.home)} (peruste: ${l.basis.join('; ')}).` : 'Voittotodennäköisyys: ei tietoa (sarjataulukko ja viime ottelut puuttuvat).')
  return out
}

/** Side-out %: share of rallies won when the opponent served. */
export function sideOut(raws: Row[], teamId: string): { won: number; total: number } {
  let won = 0, total = 0
  for (const raw of raws) {
    const side: Side | '' = s(raw.team_A_id) === teamId ? 'A' : s(raw.team_B_id) === teamId ? 'B' : ''
    if (!side) continue
    for (const f of setFlows(raw)) for (const p of f.points) {
      if (!p.server || p.server === side) continue
      total++
      if (p.winner === side) won++
    }
  }
  return { won, total }
}

function longestRun(raws: Row[], teamId: string): number[] {
  return raws.flatMap((raw) => {
    const side = s(raw.team_A_id) === teamId ? 'A' : s(raw.team_B_id) === teamId ? 'B' : ''
    return side ? setFlows(raw).map((f) => f.longest[side]) : []
  })
}

export interface Finding { holds: boolean; text: string }

/** Live/played match vs the team's recent games. */
export function liveFindings(raw: Row, baseline: Array<{ id: string; name: string; games: Row[]; roster: RosterPlayer[] | null }>): Finding[] {
  const out: Finding[] = []
  for (const t of baseline) {
    const side: Side | '' = s(raw.team_A_id) === t.id ? 'A' : s(raw.team_B_id) === t.id ? 'B' : ''
    if (!side) continue
    const games = t.games.filter((g) => s(g.match_id) !== s(raw.match_id))
    const now = sideOut([raw], t.id), base = sideOut(games, t.id)
    if (now.total >= 5 && base.total >= 10) {
      const d = now.won / now.total - base.won / base.total
      out.push({ holds: Math.abs(d) < 0.1, text: `${t.name}: side-out ${pct(now.won / now.total)} (${now.won}/${now.total}), tavallisesti ${pct(base.won / base.total)}.` })
    }
    const ra = rotationAnalysis([raw], t.id), rb = rotationAnalysis(games, t.id)
    if (ra && rb) {
      for (const r of ra.lines) {
        const b = rb.lines.find((x) => x.rotation === r.rotation)
        if (!b || r.won + r.lost < 4) continue
        const avg = b.net / rb.games
        const diff = r.net - avg
        if (Math.abs(diff) >= 3) out.push({ holds: false, text: `${t.name}: kierto ${r.rotation} ${r.net >= 0 ? '+' : ''}${r.net}, tavallisesti ${avg >= 0 ? '+' : ''}${avg.toFixed(1)} / ottelu.` })
        else if (rb.strong.some((x) => x.rotation === r.rotation) || rb.weak.some((x) => x.rotation === r.rotation)) out.push({ holds: true, text: `${t.name}: kierto ${r.rotation} ${r.net >= 0 ? '+' : ''}${r.net}, tavallisesti ${avg >= 0 ? '+' : ''}${avg.toFixed(1)} / ottelu.` })
      }
    }
    const runsNow = longestRun([raw], t.id), runsBase = longestRun(games, t.id)
    if (runsNow.length && runsBase.length) {
      const mx = Math.max(...runsNow), avg = runsBase.reduce((x, y) => x + y, 0) / runsBase.length
      out.push({ holds: mx <= avg + 2, text: `${t.name}: pisin putki ${mx}, tavallisesti ${avg.toFixed(1)} / erä.` })
    }
    const pts = new Map<string, number>()
    for (const e of (Array.isArray(raw.events) ? (raw.events as Row[]) : [])) {
      if (s(e.code) === 'piste' && s(e.team) === side && s(e.shirt_number)) pts.set(s(e.shirt_number), (pts.get(s(e.shirt_number)) || 0) + 1)
    }
    const sets = Math.max(1, setFlows(raw).length)
    for (const [shirt, p] of [...pts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3)) {
      const pl = t.roster?.find((x) => x.number === shirt)
      const avg = pl && pl.points != null && pl.matches ? pl.points / pl.matches : null
      const label = `#${shirt}${pl ? ` ${pl.name.split(' ').slice(-1)[0]}` : ''}`
      if (avg == null) out.push({ holds: false, text: `${t.name}: ${label} ${p} p (${sets} erää), ei kauden keskiarvoa.` })
      else out.push({ holds: Math.abs(p - avg) < Math.max(3, avg * 0.35), text: `${t.name}: ${label} ${p} p, kauden keskiarvo ${avg.toFixed(1)} / ottelu.` })
    }
  }
  return out
}

export function insightsMd(pre: string[] | null, live: Finding[] | null): string[] {
  const out = ['## Ennuste ja havainnot', '_Johdettu TASO-datasta laskemalla, ei tekoälyä._']
  if (pre) out.push(...pre.map((x) => `- ${x}`))
  if (live) {
    out.push('', '### Pysyy / Poikkeaa')
    out.push(...(live.length ? live.map((f) => `- ${f.holds ? 'Pysyy' : 'Poikkeaa'}: ${f.text}`) : ['_ei tietoa: ottelussa ei vielä tarpeeksi pisteitä vertailuun_']))
  }
  return [...out, '']
}

export function insightInputs(preview: { teams: TeamFacts[]; previousGames?: Array<{ games: Row[] }> }, raw: Row | null, phase: string) {
  const [h, a] = preview.teams
  const pre = phase === 'upcoming' ? pregameInsights(h, a) : null
  const live = phase !== 'upcoming' && raw
    ? liveFindings(raw, preview.teams.map((t, i) => ({ id: t.id, name: t.name, roster: t.roster, games: preview.previousGames?.[i]?.games || [] })))
    : null
  return { pre, live }
}

