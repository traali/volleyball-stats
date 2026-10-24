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

export interface FlowPoint { time: string; a: number; b: number; winner: Side; server: Side | ''; kind: string; shirt: string }
export interface Run { side: Side; length: number; from: string; to: string }
export interface SetFlow { period: number; points: FlowPoint[]; runs: Run[]; longest: { A: number; B: number } }

function startSide(raw: Row, period: number): Side | '' {
  const t = s(raw[`p${period}_start_team`])
  if (t && t === s(raw.team_A_id)) return 'A'
  if (t && t === s(raw.team_B_id)) return 'B'
  return t === 'A' || t === 'B' ? t : ''
}

export function setFlows(raw: Row, minRun = 3): SetFlow[] {
  const by = new Map<number, FlowPoint[]>()
  for (const e of evs(raw)) {
    if (s(e.code) !== 'piste') continue
    const w = s(e.team)
    if (w !== 'A' && w !== 'B') continue
    const period = Number(e.period) || 1
    const list = by.get(period) || []
    const server: Side | '' = list.length ? list[list.length - 1].winner : startSide(raw, period)
    list.push({ time: s(e.wall_time), a: Number(e.ps_A) || 0, b: Number(e.ps_B) || 0, winner: w, server, kind: s(e.description), shirt: s(e.shirt_number) })
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
      if (len >= minRun) runs.push({ side, length: len, from: `${before.a}–${before.b}`, to: `${points[j].a}–${points[j].b}` })
      i = j + 1
    }
    return { period, points, runs, longest }
  })
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
    const side = s(raw.team_A_id) === teamId ? 'A' : s(raw.team_B_id) === teamId ? 'B' : ''
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
    for (const r of f.runs) out.push(`- Putki ${nm(r.side)} ${r.length} pistettä (${r.from} → ${r.to})`)
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
