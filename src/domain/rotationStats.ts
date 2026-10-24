/**
 * Per-set starting lineups and points per rotation, from getMatch events.
 * Starting lineup: first 'pelipaikat' event of the set per team ("idx=shirt" pairs in position order I–VI, 7th = libero).
 * Rotation: R1 = starting lineup; a team rotates when it wins a point while the opponent served (side-out).
 * Who serves first comes from p{n}_start_team.
 */
type Row = Record<string, unknown>
const s = (v: unknown) => (v == null ? '' : String(v).trim())

export interface SetStart { period: number; side: 'A' | 'B'; shirts: string[]; libero?: string }
export interface RotationLine { side: 'A' | 'B'; rotation: number; won: number; lost: number }
export interface SetRotations { period: number; hasPoints: boolean; lines: RotationLine[] }

function events(raw: Row): Row[] {
  return Array.isArray(raw.events) ? (raw.events as Row[]).filter((e) => e && typeof e === 'object') : []
}

function sideOf(raw: Row, e: Row): 'A' | 'B' | '' {
  const t = s(e.team)
  if (t === 'A' || t === 'B') return t
  if (s(e.team_id) && s(e.team_id) === s(raw.team_A_id)) return 'A'
  if (s(e.team_id) && s(e.team_id) === s(raw.team_B_id)) return 'B'
  return ''
}

export function startingLineups(raw: Row): SetStart[] {
  const out: SetStart[] = []
  const seen = new Set<string>()
  for (const e of events(raw)) {
    if (s(e.code) !== 'pelipaikat') continue
    const side = sideOf(raw, e)
    const period = Number(e.period) || 1
    if (!side || seen.has(`${period}${side}`)) continue
    const shirts = s(e.description).split(',').map((p) => s(p.split('=')[1])).filter(Boolean)
    if (shirts.length < 6) continue
    seen.add(`${period}${side}`)
    out.push({ period, side, shirts: shirts.slice(0, 6), libero: shirts[6] })
  }
  return out.sort((a, b) => a.period - b.period || a.side.localeCompare(b.side))
}

/** Rally winners per set, in order, from point events (set score must grow by one). */
function rallies(raw: Row): Map<number, Array<'A' | 'B'>> {
  const out = new Map<number, Array<'A' | 'B'>>()
  const score = new Map<number, [number, number]>()
  for (const e of events(raw)) {
    if (s(e.code) !== 'piste') continue
    const side = sideOf(raw, e)
    if (!side) continue
    const period = Number(e.period) || 1
    const prev = score.get(period) || [0, 0]
    score.set(period, side === 'A' ? [prev[0] + 1, prev[1]] : [prev[0], prev[1] + 1])
    if (!out.has(period)) out.set(period, [])
    out.get(period)!.push(side)
  }
  return out
}

export function pointsPerRotation(raw: Row): SetRotations[] {
  const all = rallies(raw)
  const res: SetRotations[] = []
  for (const [period, seq] of [...all.entries()].sort((a, b) => a[0] - b[0])) {
    const first = s(raw[`p${period}_start_team`])
    let serving: 'A' | 'B' | '' = first === s(raw.team_A_id) ? 'A' : first === s(raw.team_B_id) ? 'B' : first === 'A' || first === 'B' ? first : ''
    if (!serving) { res.push({ period, hasPoints: true, lines: [] }); continue }
    const rot = { A: 1, B: 1 }
    const tally = new Map<string, RotationLine>()
    const bump = (side: 'A' | 'B', won: boolean) => {
      const k = `${side}${rot[side]}`
      const line = tally.get(k) || { side, rotation: rot[side], won: 0, lost: 0 }
      if (won) line.won++
      else line.lost++
      tally.set(k, line)
    }
    for (const w of seq) {
      const l = w === 'A' ? 'B' : 'A'
      bump(w, true)
      bump(l, false)
      if (serving !== w) {
        rot[w] = (rot[w] % 6) + 1
        serving = w
      }
    }
    res.push({ period, hasPoints: true, lines: [...tally.values()].sort((a, b) => a.side.localeCompare(b.side) || a.rotation - b.rotation) })
  }
  return res
}
