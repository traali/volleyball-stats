/**
 * Valmentajan näkymä + aika pisteiden välillä — counted only, from getMatch piste/pelipaikat/aikalisa events.
 * wall_time is the scorer's entry clock (HH:MM:SS, 1 s). It is NOT rally duration: a gap = rally + downtime + entry lag.
 */
import { rotationLabel, setFlows, type RotationAnalysis } from './gameFlow'

type Row = Record<string, unknown>
type Side = 'A' | 'B'
const s = (v: unknown) => (v == null ? '' : String(v).trim())
const evs = (raw: Row): Row[] => (Array.isArray(raw.events) ? (raw.events as Row[]).filter((e) => e && typeof e === 'object') : [])

export { MIN_COACH_RALLIES, MIN_LABEL_NET, rotationLabel } from './gameFlow'

export interface CoachRotation {
  rotation: number; rallies: number; won: number; lost: number; net: number
  /** Receiving rallies won / receiving rallies (null = none). */
  sideOut: number | null; sideOutN: number
  /** Serving rallies won / serving rallies. */
  breakPct: number | null; breakN: number
  label: 'Vahva' | 'Heikko' | 'tasainen' | 'liian vähän'
}
export interface CoachTeam { side: Side; current: number | null; serving: boolean; next: number[]; lines: CoachRotation[] }

/** Per-rotation counts this game, plus rotation for the next rally (after the last recorded point). */
export function coachView(raw: Row): { teams: CoachTeam[]; period: number | null } {
  const flows = setFlows(raw)
  const acc: Record<Side, Map<number, { w: number; l: number; rw: number; rn: number; sw: number; sn: number }>> = { A: new Map(), B: new Map() }
  for (const f of flows) for (const p of f.points) {
    if (!p.server) continue
    for (const side of ['A', 'B'] as Side[]) {
      const r = p.rot[side]
      const c = acc[side].get(r) || { w: 0, l: 0, rw: 0, rn: 0, sw: 0, sn: 0 }
      const won = p.winner === side
      if (won) c.w++; else c.l++
      if (p.server === side) { c.sn++; if (won) c.sw++ } else { c.rn++; if (won) c.rw++ }
      acc[side].set(r, c)
    }
  }
  const last = flows[flows.length - 1]
  const lp = last?.points[last.points.length - 1]
  const teams = (['A', 'B'] as Side[]).map((side): CoachTeam => {
    let current: number | null = null
    if (lp && lp.server) current = lp.server !== lp.winner && lp.winner === side ? (lp.rot[side] % 6) + 1 : lp.rot[side]
    const lines = [...acc[side].entries()].sort((a, b) => a[0] - b[0]).map(([rotation, c]): CoachRotation => {
      const rallies = c.w + c.l, net = c.w - c.l
      return {
        rotation, rallies, won: c.w, lost: c.l, net,
        sideOut: c.rn ? c.rw / c.rn : null, sideOutN: c.rn, breakPct: c.sn ? c.sw / c.sn : null, breakN: c.sn,
        label: rotationLabel(c.w, c.l),
      }
    })
    return { side, current, serving: Boolean(lp && lp.winner === side), next: current ? [(current % 6) + 1, ((current + 1) % 6) + 1] : [], lines }
  })
  return { teams, period: last?.period ?? null }
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`

/** 'Seuraava kierto K3: tänään -4 (9 palloa), yleensä +1' — counted, never a guess. */
export function nextRotationLine(t: CoachTeam, usual?: RotationAnalysis | null): string {
  const k = t.next[0]
  if (!k) return ''
  const today = t.lines.find((l) => l.rotation === k)
  const u = usual?.lines.find((l) => l.rotation === k)
  const parts = [today ? `tänään ${signed(today.net)} (${today.rallies} palloa)` : 'tänään ei vielä palloja']
  if (u) parts.push(`yleensä ${signed(u.net)}`)
  return `Seuraava kierto K${k}: ${parts.join(', ')}`
}

export interface Gap { period: number; sec: number; winner: Side; afterTimeout: boolean; afterSub: boolean; score: string; time: string }

function clock(t: string): number {
  const m = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(t)
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : NaN
}

/** Seconds between consecutive piste events in the same set (wall_time). Needs second-resolution clocks. */
export function pointGaps(raw: Row): Gap[] {
  const out: Gap[] = []
  let prev: { t: number; period: number } | null = null
  let to = false, sub = false
  for (const e of evs(raw)) {
    const code = s(e.code)
    if (code === 'aikalisa') to = true
    if (code === 'vaihto') sub = true
    if (code === 'lopetajakso' || code === 'aloitajakso') prev = null
    if (code !== 'piste') continue
    const w = s(e.team)
    const t = clock(s(e.wall_time))
    const period = Number(e.period) || 1
    if ((w === 'A' || w === 'B') && Number.isFinite(t) && prev && prev.period === period && t >= prev.t) {
      out.push({ period, sec: t - prev.t, winner: w, afterTimeout: to, afterSub: sub, score: `${s(e.ps_A)}–${s(e.ps_B)}`, time: s(e.wall_time) })
    }
    prev = Number.isFinite(t) ? { t, period } : null
    to = false; sub = false
  }
  return out
}

export const median = (xs: number[]) => { if (!xs.length) return NaN; const a = [...xs].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2 }
/** A gap this long is a break (timeout, sub, challenge, scorer pause), not play. */
export const BREAK_SEC = 60
export const MIN_GAPS = 20

export interface TempoReport {
  n: number; median: number; p90: number
  perSet: { period: number; n: number; median: number }[]
  /** Play gaps only (< BREAK_SEC, no timeout/sub before): split at the median. */
  split: { cut: number; long: { A: number; B: number; n: number }; short: { A: number; B: number; n: number } } | null
  breaks: Gap[]
}

export function tempo(raw: Row): TempoReport | null {
  const g = pointGaps(raw)
  if (g.length < MIN_GAPS) return null
  const secs = g.map((x) => x.sec).sort((a, b) => a - b)
  const play = g.filter((x) => x.sec < BREAK_SEC && !x.afterTimeout && !x.afterSub)
  const cut = median(play.map((x) => x.sec))
  const tally = (xs: Gap[]) => ({ A: xs.filter((x) => x.winner === 'A').length, B: xs.filter((x) => x.winner === 'B').length, n: xs.length })
  const periods = [...new Set(g.map((x) => x.period))].sort((a, b) => a - b)
  return {
    n: g.length, median: median(secs), p90: secs[Math.floor(0.9 * (secs.length - 1))],
    perSet: periods.map((p) => { const xs = g.filter((x) => x.period === p && x.sec < BREAK_SEC).map((x) => x.sec); return { period: p, n: xs.length, median: median(xs) } }),
    split: play.length >= MIN_GAPS ? { cut, long: tally(play.filter((x) => x.sec > cut)), short: tally(play.filter((x) => x.sec <= cut)) } : null,
    breaks: g.filter((x) => x.sec >= BREAK_SEC),
  }
}
