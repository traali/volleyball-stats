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
  return { lines, strong: ranked.slice(0, top), weak: ranked.slice(-top).reverse(), games }
}

export function analysisMd(title: string, a: RotationAnalysis | null): string[] {
  if (!a) return [`### ${title}`, '_ei tietoa: ei pisteitä ja syöttövuoroja kierroittain_', '']
  const f = (r: RotationScore) => `kierto ${r.rotation}: ${r.won}–${r.lost} (${r.net >= 0 ? '+' : ''}${r.net})`
  return [`### ${title} (${a.games} ott.)`, `- Vahvat kierrot: ${a.strong.map(f).join('; ')}`, `- Haastavat kierrot: ${a.weak.map(f).join('; ')}`, `- Kaikki: ${a.lines.map(f).join('; ')}`, '']
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
