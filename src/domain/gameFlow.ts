import { setParticipation } from './setParticipation'
import { LIBERO_NOTE, type LiberoCheck } from './libero'
/**
 * How a game goes, from getMatch events: per-set point timeline (running score, time, serving side),
 * runs, the latest rotation on court and per-rotation points (strong / challenging rotations).
 * piste.team = side that won the rally; ps_A/ps_B = running set score. Server of a rally = winner of the
 * previous rally (first rally: p{n}_start_team). pelipaikat is re-sent after every rotation/substitution,
 * position order I–VI, 7th = libero.
 */
import { pointsPerRotation } from './rotationStats'

type Row = Record<string, unknown>
type Side = 'A' | 'B'
const s = (v: unknown) => (v == null ? '' : String(v).trim())
const evs = (raw: Row): Row[] => (Array.isArray(raw.events) ? (raw.events as Row[]).filter((e) => e && typeof e === 'object') : [])

export interface FlowPoint { time: string; a: number; b: number; winner: Side; server: Side | ''; kind: string; shirt: string
  /** Shirt in position I of the serving side at that rally (from latest pelipaikat). */
  serverShirt: string
  /** Rotation (1–6 from set start) of each side during the rally. */
  rot: { A: number; B: number } }
export interface Run { side: Side; length: number; from: string; to: string; rotation: number; servers: string[] }
export interface SetFlow { period: number; points: FlowPoint[]; runs: Run[]; longest: { A: number; B: number } }

function startSide(raw: Row, period: number): Side | '' {
  const t = s(raw[`p${period}_start_team`])
  if (t && t === s(raw.team_A_id)) return 'A'
  if (t && t === s(raw.team_B_id)) return 'B'
  return t === 'A' || t === 'B' ? t : ''
}

export function setFlows(raw: Row, minRun = 3): SetFlow[] {
  const by = new Map<number, FlowPoint[]>()
  const lineup: Record<Side, string[]> = { A: [], B: [] }
  const rot = new Map<number, { A: number; B: number }>()
  for (const e of evs(raw)) {
    const code = s(e.code)
    if (code === 'pelipaikat') {
      const sd = s(e.team)
      const p = s(e.description).split(',').map((x) => s(x.split('=')[1])).filter(Boolean)
      if ((sd === 'A' || sd === 'B') && p.length >= 6) lineup[sd] = p
      continue
    }
    if (code !== 'piste') continue
    const w = s(e.team)
    if (w !== 'A' && w !== 'B') continue
    const period = Number(e.period) || 1
    const list = by.get(period) || []
    const r = rot.get(period) || { A: 1, B: 1 }
    const server: Side | '' = list.length ? list[list.length - 1].winner : startSide(raw, period)
    list.push({ time: s(e.wall_time), a: Number(e.ps_A) || 0, b: Number(e.ps_B) || 0, winner: w, server, kind: s(e.description), shirt: s(e.shirt_number), serverShirt: server ? lineup[server][0] || '' : '', rot: { ...r } })
    if (server && server !== w) r[w] = (r[w] % 6) + 1
    rot.set(period, r)
    by.set(period, list)
  }
  return [...by.entries()].sort((x, y) => x[0] - y[0]).map(([period, points]) => {
    const runs: Run[] = []
    const longest = { A: 0, B: 0 }
    let i = 0
    while (i < points.length) {
      let j = i
      while (j + 1 < points.length && points[j + 1].winner === points[i].winner) j++
      const side = points[i].winner
      const len = j - i + 1
      longest[side] = Math.max(longest[side], len)
      const before = i ? points[i - 1] : { a: 0, b: 0 }
      // a run is served by the scoring side from its 2nd point on: rotation/server = that of rally i+1
      const k = Math.min(j, i + 1)
      if (len >= minRun) runs.push({ side, length: len, from: `${before.a}–${before.b}`, to: `${points[j].a}–${points[j].b}`, rotation: points[k].rot[side], servers: [...new Set(points.slice(k, j + 1).filter((p) => p.server === side).map((p) => p.serverShirt).filter(Boolean))] })
      i = j + 1
    }
    return { period, points, runs, longest }
  })
}

export interface ServeLine { shirt: string; serves: number; won: number; aces: number; errors: number; bestRun: number }

/** Per-server stats for one team: serves, rallies won while serving, aces (kind 'serve'), serve errors, longest serve run. */
export function serveStats(raws: Row[], teamId: string): ServeLine[] {
  const t = new Map<string, ServeLine>()
  for (const raw of raws) {
    const side = sideFor(raw, teamId)
    if (!side) continue
    for (const f of setFlows(raw)) {
      let runShirt = '', run = 0
      for (const p of f.points) {
        if (p.server !== side || !p.serverShirt) { runShirt = ''; run = 0; continue }
        const l = t.get(p.serverShirt) || { shirt: p.serverShirt, serves: 0, won: 0, aces: 0, errors: 0, bestRun: 0 }
        l.serves++
        if (p.winner === side) {
          l.won++
          if (p.kind === 'serve') l.aces++
          run = runShirt === p.serverShirt ? run + 1 : 1
          runShirt = p.serverShirt
          l.bestRun = Math.max(l.bestRun, run)
        } else {
          if (p.kind === 'error_serve') l.errors++
          runShirt = ''; run = 0
        }
        t.set(p.serverShirt, l)
      }
    }
  }
  return [...t.values()].sort((a, b) => b.serves - a.serves)
}

function sideFor(raw: Row, teamId: string): Side | '' {
  return s(raw.team_A_id) === teamId ? 'A' : s(raw.team_B_id) === teamId ? 'B' : ''
}

export interface HotLine { shirt: string; recent: number; expected: number; window: number }

/** 'Kuumana': player points in the last N rallies of this match vs their per-rally rate in the baseline games. */
export function hotPlayers(raw: Row, teamId: string, baseline: Row[], n = 20): HotLine[] {
  const side = sideFor(raw, teamId)
  if (!side) return []
  const all = setFlows(raw).flatMap((f) => f.points)
  const last = all.slice(-n)
  if (last.length < 8) return []
  const rate = new Map<string, number>()
  let rallies = 0
  for (const g of baseline) {
    const sd = sideFor(g, teamId)
    if (!sd || s(g.match_id) === s(raw.match_id)) continue
    for (const p of setFlows(g).flatMap((f) => f.points)) {
      rallies++
      if (p.winner === sd && p.shirt) rate.set(p.shirt, (rate.get(p.shirt) || 0) + 1)
    }
  }
  const recent = new Map<string, number>()
  for (const p of last) if (p.winner === side && p.shirt) recent.set(p.shirt, (recent.get(p.shirt) || 0) + 1)
  return [...recent.entries()].map(([shirt, r]) => ({ shirt, recent: r, expected: rallies ? ((rate.get(shirt) || 0) / rallies) * last.length : 0, window: last.length }))
    .sort((a, b) => b.recent - b.expected - (a.recent - a.expected))
}

export interface CourtNow { side: Side; period: number; shirts: string[]; libero: string; time: string; score: string }

/** Latest pelipaikat per side (what is on court now / at the end). */
export function courtNow(raw: Row): CourtNow[] {
  const out: Partial<Record<Side, CourtNow>> = {}
  let score = ''
  for (const e of evs(raw)) {
    if (s(e.code) === 'piste') score = `${s(e.ps_A)}–${s(e.ps_B)}`
    if (s(e.code) !== 'pelipaikat') continue
    const side = s(e.team)
    if (side !== 'A' && side !== 'B') continue
    const p = s(e.description).split(',').map((x) => s(x.split('=')[1])).filter(Boolean)
    if (p.length < 6) continue
    out[side] = { side, period: Number(e.period) || 1, shirts: p.slice(0, 6), libero: p[6] || '', time: s(e.wall_time), score }
  }
  return (['A', 'B'] as Side[]).flatMap((k) => (out[k] ? [out[k]!] : []))
}

export const MIN_COACH_RALLIES = 6
/** Vahva/Heikko only with |net| >= this (and >= MIN_COACH_RALLIES rallies). */
export const MIN_LABEL_NET = 3
export function rotationLabel(won: number, lost: number): 'Vahva' | 'Heikko' | 'tasainen' | 'liian vähän' {
  const net = won - lost
  if (won + lost < MIN_COACH_RALLIES) return 'liian vähän'
  return net >= MIN_LABEL_NET ? 'Vahva' : net <= -MIN_LABEL_NET ? 'Heikko' : 'tasainen'
}

export interface RotationScore { rotation: number; won: number; lost: number; net: number }
export interface RotationAnalysis { lines: RotationScore[]; strong: RotationScore[]; weak: RotationScore[]; games: number }

/** Points won/lost per rotation 1–6 (1 = set's starting setup) for one team over the given games. */
export function rotationAnalysis(raws: Row[], teamId: string, top = 2): RotationAnalysis | null {
  const t = new Map<number, RotationScore>()
  let games = 0
  for (const raw of raws) {
    const side = sideFor(raw, teamId)
    if (!side) continue
    const lines = pointsPerRotation(raw).flatMap((x) => x.lines).filter((l) => l.side === side)
    if (!lines.length) continue
    games++
    for (const l of lines) {
      const r = t.get(l.rotation) || { rotation: l.rotation, won: 0, lost: 0, net: 0 }
      r.won += l.won; r.lost += l.lost; r.net = r.won - r.lost
      t.set(l.rotation, r)
    }
  }
  if (!games) return null
  const lines = [...t.values()].sort((a, b) => a.rotation - b.rotation)
  const ranked = [...lines].sort((a, b) => b.net - a.net || b.won - a.won)
  // 'Vahvat' only with a positive net, 'Haastavat' only with a negative net — never label a minus rotation strong.
  return { lines, strong: ranked.filter((r) => rotationLabel(r.won, r.lost) === 'Vahva').slice(0, top), weak: ranked.filter((r) => rotationLabel(r.won, r.lost) === 'Heikko').slice(-top).reverse(), games }
}

/** Baselines from fewer games than this are 'alustava' (preliminary). */
export const MIN_BASELINE_GAMES = 3
export const isPreliminary = (games: number) => games < MIN_BASELINE_GAMES
/** 'perustuu 1 otteluun' — sample size shown next to every baseline. */
export const basedOn = (games: number) => `perustuu ${games} otteluun`

export function analysisMd(title: string, a: RotationAnalysis | null): string[] {
  if (!a) return [`### ${title}`, '_ei tietoa: ei pisteitä ja syöttövuoroja kierroittain_', '']
  const f = (r: RotationScore) => `kierto ${r.rotation}: ${r.won}–${r.lost} (${r.net >= 0 ? '+' : ''}${r.net})`
  return [`### ${title} (${basedOn(a.games)}${isPreliminary(a.games) ? ', alustava' : ''})`, `- Vahvat kierrot: ${a.strong.length ? a.strong.map(f).join('; ') : 'ei yhtään (vaatii ≥+3, ≥6 palloa)'}`, `- Haastavat kierrot: ${a.weak.length ? a.weak.map(f).join('; ') : 'ei yhtään (vaatii ≤−3, ≥6 palloa)'}`, `- Kaikki: ${a.lines.map(f).join('; ')}`, '']
}

export function flowMd(raw: Row, home: string, away: string): string[] {
  const flows = setFlows(raw)
  const out = ['## Ottelun kulku']
  if (!flows.length) return [...out, '_ei tietoa: pistetapahtumia ei ole kirjattu_', '']
  const nm = (x: Side | '') => (x === 'A' ? home : x === 'B' ? away : '?')
  for (const f of flows) {
    out.push(`### ${f.period}. erä`, `Pisimmät putket: ${home} ${f.longest.A}, ${away} ${f.longest.B}`)
    for (const r of f.runs) out.push(`- Putki ${nm(r.side)} ${r.length} pistettä (${r.from} → ${r.to}), kierto ${r.rotation}${r.servers.length ? `, syötti #${r.servers.join(', #')}` : ''}`)
    out.push(`Pisteet: ${f.points.map((p) => `${p.time.slice(0, 5)} ${p.a}–${p.b}${p.server ? ` (syöttö ${p.server === 'A' ? 'K' : 'V'})` : ''}`).join(', ')}`, '')
  }
  out.push('## Kenttäasetelma nyt / lopussa')
  const now = courtNow(raw)
  if (!now.length) out.push('_ei tietoa: pelipaikkoja ei ole kirjattu_')
  for (const c of now) out.push(`- ${nm(c.side)} (${c.period}. erä, ${c.score || '0–0'}): ${c.shirts.map((x, i) => `${['I', 'II', 'III', 'IV', 'V', 'VI'][i]} #${x}`).join(', ')}${c.libero ? `, libero #${c.libero}` : ''}`)
  out.push('', '## Kierrot tässä ottelussa')
  out.push(...analysisMd(home, rotationAnalysis([raw], s(raw.team_A_id))), ...analysisMd(away, rotationAnalysis([raw], s(raw.team_B_id))))
  return out
}

export function serveMd(title: string, rows: ServeLine[]): string[] {
  if (!rows.length) return [`### Syötöt: ${title}`, '_ei tietoa: syöttäjiä ei voitu päätellä (pelipaikat puuttuvat)_', '']
  return [`### Syötöt: ${title}`, ...rows.map((r) => `- #${r.shirt}: ${r.serves} syöttöä, ${r.won} pistettä omalla syötöllä, ässät ${r.aces}, syöttövirheet ${r.errors}, pisin syöttöputki ${r.bestRun}`), '']
}

export interface MatchupLine { team: string; rotation: number; kind: 'vahva' | 'heikko'; base: number; live: number | null; status: 'pysyy' | 'muuttunut' | null }
export interface Matchup { title: string; lines: MatchupLine[]; games: [number, number]; preliminary: boolean }

/**
 * Kohtaamisvertailu: each team's strong rotations (baseline net per game, recent games) paired with the opponent's weak ones,
 * and vice versa. In-game, each line gets this match's net and 'pysyy' (same sign as baseline) or 'muuttunut'.
 */
export function matchups(teams: { id: string; name: string; games: Row[] }[], raw: Row | null): Matchup[] {
  if (teams.length < 2) return []
  const base = teams.map((t) => rotationAnalysis(t.games.filter((g) => !raw || s(g.match_id) !== s(raw.match_id)), t.id))
  const liveA = teams.map((t) => (raw ? rotationAnalysis([raw], t.id) : null))
  const line = (i: number, r: RotationScore, kind: MatchupLine['kind']): MatchupLine => {
    const b = Math.round((r.net / (base[i]!.games || 1)) * 10) / 10
    const l = liveA[i] ? liveA[i]!.lines.find((x) => x.rotation === r.rotation)?.net ?? 0 : null
    const status = l === null || !liveA[i]!.lines.some((x) => x.rotation === r.rotation && x.won + x.lost > 0) ? null : (Math.sign(l) === Math.sign(b) || (l === 0 && Math.abs(b) < 1)) ? 'pysyy' : 'muuttunut'
    return { team: teams[i].name, rotation: r.rotation, kind, base: b, live: status ? l : null, status }
  }
  const out: Matchup[] = []
  for (const [x, y] of [[0, 1], [1, 0]]) {
    if (!base[x] || !base[y]) continue
    const games: [number, number] = [base[x]!.games, base[y]!.games]
    out.push({ title: `${teams[x].name}: vahvat kierrot vs ${teams[y].name}: heikot kierrot`, lines: [...base[x]!.strong.map((r) => line(x, r, 'vahva')), ...base[y]!.weak.map((r) => line(y, r, 'heikko'))], games, preliminary: isPreliminary(Math.min(...games)) })
  }
  return out
}

export function matchupText(l: MatchupLine): string {
  const f = (n: number) => `${n >= 0 ? '+' : ''}${n}`
  return `${l.team} kierto ${l.rotation} (${l.kind}): tavallisesti ${f(l.base)}/ottelu${l.live !== null ? `, nyt ${f(l.live)} → ${l.status}` : ''}`
}

export function matchupMd(m: Matchup[]): string[] {
  if (!m.length) return []
  return ['## Kohtaamisvertailu', ...m.flatMap((x) => [`### ${x.title} (${basedOn(x.games[0])} / ${basedOn(x.games[1])}${x.preliminary ? ', alustava' : ''})`, ...x.lines.map((l) => `- ${matchupText(l)}`), '']), '']
}

export interface PlayerMatchLine { side: Side; shirt: string; name: string; p: number; bp: number; pm: number | null; aces: number; attack: number; block: number; serves: number; serveErrors: number }

/**
 * Per-player match stats like the official Tilastot (P, BP, +/-, Ä, HY, TO), counted from piste events so they update live:
 * P = points scored, BP = points scored while own team served (server inferred from previous rally; matches official for most players, can differ by 1–2), Ä = kind serve, HY = attack + return, TO = block.
 * +/- comes from the lineup row (TASO points_plus_minus) when present. Extras: serves and serve errors.
 */
export function playerMatchStats(raw: Row): PlayerMatchLine[] {
  const lineups = Array.isArray(raw.lineups) ? (raw.lineups as Row[]) : []
  const sideOf = (r: Row): Side | '' => (s(r.team_id) === s(raw.team_A_id) ? 'A' : s(r.team_id) === s(raw.team_B_id) ? 'B' : '')
  const m = new Map<string, PlayerMatchLine>()
  const get = (side: Side, shirt: string) => {
    const k = side + shirt
    let l = m.get(k)
    if (!l) {
      const r = lineups.find((x) => sideOf(x) === side && s(x.shirt_number) === shirt)
      const pm = r && s(r.points_plus_minus) !== '' ? Number(r.points_plus_minus) : null
      l = { side, shirt, name: r ? s(r.player_name) : '', p: 0, bp: 0, pm, aces: 0, attack: 0, block: 0, serves: 0, serveErrors: 0 }
      m.set(k, l)
    }
    return l
  }
  for (const r of lineups) { const sd = sideOf(r); if (sd && s(r.shirt_number) && n0(r.points_scored) > 0) get(sd, s(r.shirt_number)) }
  for (const f of setFlows(raw)) for (const pt of f.points) {
    if (pt.shirt && !pt.kind.startsWith('error')) {
      const l = get(pt.winner, pt.shirt)
      l.p++
      if (pt.server === pt.winner) l.bp++
      if (pt.kind === 'serve') l.aces++
      else if (pt.kind === 'attack' || pt.kind === 'return') l.attack++
      else if (pt.kind === 'block') l.block++
    }
    if (pt.server && pt.serverShirt) {
      const l = get(pt.server, pt.serverShirt)
      l.serves++
      if (pt.winner !== pt.server && pt.kind === 'error_serve') l.serveErrors++
    }
  }
  return [...m.values()].sort((a, b) => a.side.localeCompare(b.side) || b.p - a.p)
}
const n0 = (v: unknown) => Number(v) || 0

export function playerStatsMd(raw: Row, home: string, away: string, isLibero: LiberoCheck = () => false): string[] {
  const part = new Map(setParticipation(raw).map((p) => [`${p.teamId === s(raw.team_A_id) ? 'A' : 'B'}${p.shirt}`, p]))
  const setsTxt = (sd: string, shirt: string) => { const p = part.get(sd + shirt); if (p && isLibero(p.teamId, p.playerId)) return `, erät: Libero (${LIBERO_NOTE})`; return p ? `, erät kentällä ${p.onCourt.length}${p.unknown.length ? '+?' : ''}, vaihdossa ${p.bench.length}` : '' }
  const base = playerMatchStats(raw)
  if (!base.length) return []
  // Roster players without points too (same as the match table), so bench and libero rows are exported.
  const extra = [...part.entries()].filter(([k, p]) => p.shirt && !base.some((r) => r.side + r.shirt === k))
    .map(([k, p]) => ({ side: k[0] as Side, shirt: p.shirt, name: p.name, p: 0, bp: 0, pm: null as number | null, aces: 0, attack: 0, block: 0, serves: 0, serveErrors: 0 }))
  const rows = [...base, ...extra]
  return ['## Pelaajatilastot (P, BP, +/-, Ä, HY, TO, syötöt, syöttövirheet)', ...(['A', 'B'] as Side[]).flatMap((sd) => [`### ${sd === 'A' ? home : away}`, ...rows.filter((r) => r.side === sd).map((r) => `- #${r.shirt} ${r.name}: P ${r.p}, BP ${r.bp}, +/- ${r.pm ?? r.p}, Ä ${r.aces}, HY ${r.attack}, TO ${r.block}, syötöt ${r.serves}, syöttövirheet ${r.serveErrors}${setsTxt(sd, r.shirt)}`), '']), '']
}

export interface PlayerRotationCell { rotation: number; won: number; lost: number; net: number; rallies: number }
export interface PlayerRotationLine { shirt: string; games: number; rallies: number; cells: PlayerRotationCell[]; best: PlayerRotationCell | null; worst: PlayerRotationCell | null }
/** Rotations with fewer rallies than this are 'alustava'. */
export const MIN_ROTATION_RALLIES = 10

/**
 * Per player: points won–lost while the player was on court (latest pelipaikat, positions I–VI; libero excluded),
 * split by the team's rotation (K1 = set's starting setup, +1 on each side-out). Best only if net > 0, worst only if net < 0.
 * Works on one match (live or played) or aggregated over several.
 */
export function playerRotations(raws: Row[], teamId: string): PlayerRotationLine[] {
  const acc = new Map<string, { games: Set<string>; cells: Map<number, PlayerRotationCell> }>()
  raws.forEach((raw, gi) => {
    const side = sideFor(raw, teamId)
    if (!side) return
    const other: Side = side === 'A' ? 'B' : 'A'
    let lineup: string[] = []
    let period = 0
    let rot = 1
    let server: Side | '' = ''
    for (const e of evs(raw)) {
      const p = Number(e.period) || 1
      if (p !== period) { period = p; rot = 1; server = startSide(raw, p); lineup = [] }
      const code = s(e.code)
      if (code === 'pelipaikat') {
        if (s(e.team) !== side) continue
        const shirts = s(e.description).split(',').map((x) => s(x.split('=')[1])).filter(Boolean)
        if (shirts.length >= 6) lineup = shirts.slice(0, 6)
        continue
      }
      if (code !== 'piste') continue
      const w = s(e.team)
      if (w !== side && w !== other) continue
      if (lineup.length === 6) {
        for (const shirt of lineup) {
          const a = acc.get(shirt) || { games: new Set<string>(), cells: new Map() }
          a.games.add(`${gi}`)
          const c = a.cells.get(rot) || { rotation: rot, won: 0, lost: 0, net: 0, rallies: 0 }
          if (w === side) c.won++
          else c.lost++
          c.net = c.won - c.lost; c.rallies = c.won + c.lost
          a.cells.set(rot, c)
          acc.set(shirt, a)
        }
      }
      if (w === side && server && server !== side) rot = (rot % 6) + 1
      server = w as Side
    }
  })
  return [...acc.entries()].map(([shirt, a]) => {
    const cells = [...a.cells.values()].sort((x, y) => x.rotation - y.rotation)
    const byNet = [...cells].sort((x, y) => y.net - x.net || y.rallies - x.rallies)
    const best = byNet.find((c) => c.net > 0) || null
    const worst = [...byNet].reverse().find((c) => c.net < 0) || null
    return { shirt, games: a.games.size, rallies: cells.reduce((x, c) => x + c.rallies, 0), cells, best, worst }
  })
}

/** 'Paras: K2 +6 (14 r.) / Heikoin: K5 −4 (9 r., alustava)'. */
export function playerRotationText(l: PlayerRotationLine | undefined): string {
  if (!l) return 'Kiertotieto puuttuu'
  const c = (x: PlayerRotationCell) => `K${x.rotation} ${x.net > 0 ? '+' : '−'}${Math.abs(x.net)} (${x.rallies} r.${x.rallies < MIN_ROTATION_RALLIES ? ', alustava' : ''})`
  return `Paras: ${l.best ? c(l.best) : '–'} / Heikoin: ${l.worst ? c(l.worst) : '–'}`
}
