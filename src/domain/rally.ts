export interface RallyPoint {
  period: number
  wallTime: string
  /** Running set score after this point, home–away. Never the point type. */
  score: string
  /** Point type as the federation sent it (attack, block, error_serve …). */
  kind: string
  playerName: string
  shirt: string
  teamId: string
}

const KIND_FI: Record<string, string> = {
  attack: 'hyökkäys',
  block: 'torjunta',
  serve: 'ässä',
  error_serve: 'syöttövirhe',
  error_attack: 'hyökkäysvirhe',
  error_technical: 'virhe',
}

export function pointKindLabel(kind: string): string {
  return KIND_FI[kind] || kind.replace(/_/g, ' ')
}

/** Minutes between two HH:MM:SS clocks on the same day; '' when either is missing. */
export function minutesBetween(start: string, end: string): string {
  const toSec = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t.trim())
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] || 0) : NaN
  }
  const a = toSec(start)
  const b = toSec(end)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return ''
  return String(Math.round((b - a) / 60))
}

export interface CourtRotation {
  period: number
  side: 'A' | 'B'
  shirts: string[]
  names: string[]
  libero?: string
}

export interface SetLine {
  number: number
  home: number
  away: number
  start?: string
  end?: string
  durationMin?: string
  firstServeTeamId?: string
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function clockSec(t: string): number {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t.trim())
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] || 0) : NaN
}

/**
 * Set clocks can be wrong: the scorer may open set 1 half an hour early, or the clock keeps running
 * after the last point. When the point times disagree by minutes, trust the points.
 */
function setClock(raw: Record<string, unknown>, i: number, points: RallyPoint[]): { start: string; end: string } {
  let start = str(raw[`p${i}_start_time`])
  let end = str(raw[`p${i}_end_time`])
  const times = points.filter((p) => p.period === i).map((p) => p.wallTime).filter((t) => Number.isFinite(clockSec(t)))
  if (times.length) {
    const first = times[0]
    const lastPoint = times[times.length - 1]
    if (!start || clockSec(first) - clockSec(start) > 300) start = first
    if (!end || clockSec(end) - clockSec(lastPoint) > 60) end = lastPoint
  }
  return { start, end }
}

export function setsFromMatch(raw: Record<string, unknown>): SetLine[] {
  const out: SetLine[] = []
  const points = pointsFromEvents(raw.events, str(raw.team_A_id))
  for (let i = 1; i <= 5; i++) {
    const a = str(raw[`p${i}s_A`])
    const b = str(raw[`p${i}s_B`])
    if (!a && !b) continue
    const clock = setClock(raw, i, points)
    out.push({
      number: i,
      home: num(a),
      away: num(b),
      start: clock.start || undefined,
      end: clock.end || undefined,
      durationMin: str(raw[`p${i}_duration`]) || minutesBetween(clock.start, clock.end) || undefined,
      firstServeTeamId: str(raw[`p${i}_start_team`]) || undefined,
    })
  }
  return out
}

const SCORE_TEXT = /^(\d{1,2})\s*[-–]\s*(\d{1,2})$/

/**
 * Real points only, each with the set score after it.
 * Torneopal sends two shapes:
 *  - `description` is the point type (attack, block …) and ps_A/ps_B is the set score.
 *  - `description` is the set score ("4-1") and ps_A/ps_B is a running total for the whole match.
 * Rows that don't change the set score (a "0-0" set-start marker, a repeated "25-20" after the set) are not points.
 */
export function pointsFromEvents(events: unknown, homeTeamId = ''): RallyPoint[] {
  if (!Array.isArray(events)) return []
  const points: RallyPoint[] = []
  const last = new Map<number, [number, number]>()
  for (const row of events) {
    if (!row || typeof row !== 'object') continue
    const e = row as Record<string, unknown>
    if (str(e.code) !== 'piste') continue
    const period = num(e.period) || 1
    const side = str(e.team) || (homeTeamId && str(e.team_id) === homeTeamId ? 'A' : homeTeamId ? 'B' : '')
    const prev = last.get(period) || [0, 0]
    let kind = str(e.description)
    let next: [number, number] | null = null
    const text = SCORE_TEXT.exec(kind)
    if (text) {
      next = [Number(text[1]), Number(text[2])]
      kind = ''
    } else {
      const psA = str(e.ps_A) === '' ? NaN : Number(e.ps_A)
      const psB = str(e.ps_B) === '' ? NaN : Number(e.ps_B)
      const expected: [number, number] | null =
        side === 'A' ? [prev[0] + 1, prev[1]] : side === 'B' ? [prev[0], prev[1] + 1] : null
      if (expected) next = expected
      else if (Number.isFinite(psA) && Number.isFinite(psB)) next = [psA, psB]
      // ps_A/ps_B wins only when it is the set score; a match-long running total would not match.
      if (expected && Number.isFinite(psA) && Number.isFinite(psB) && psA === expected[0] && psB === expected[1]) next = [psA, psB]
    }
    if (!next || (next[0] === prev[0] && next[1] === prev[1])) continue
    last.set(period, next)
    points.push({
      period,
      wallTime: str(e.wall_time) || str(e.time) || '—',
      score: `${next[0]}–${next[1]}`,
      kind,
      playerName: str(e.player_name),
      shirt: str(e.shirt_number),
      teamId: str(e.team_id),
    })
  }
  return points
}

function nameByShirt(lineups: unknown, teamId: string): Map<string, string> {
  const map = new Map<string, string>()
  if (!Array.isArray(lineups)) return map
  for (const row of lineups) {
    if (!row || typeof row !== 'object') continue
    const p = row as Record<string, unknown>
    if (str(p.team_id) !== teamId) continue
    const shirt = str(p.shirt_number)
    const name = str(p.player_name)
    if (shirt && name) map.set(shirt, name)
  }
  return map
}

function rotationSide(
  period: number,
  side: 'A' | 'B',
  shirtsRaw: unknown,
  names: Map<string, string>,
): CourtRotation | null {
  if (!Array.isArray(shirtsRaw)) return null
  const shirts = shirtsRaw.map(str).filter(Boolean)
  if (shirts.length < 6) return null
  const court = shirts.slice(0, 6)
  const libero = shirts[6]
  return {
    period,
    side,
    shirts: court,
    names: court.map((s) => names.get(s) || `#${s}`),
    libero: libero || undefined,
  }
}

export function rotationsFromMatch(raw: Record<string, unknown>): CourtRotation[] {
  const homeId = str(raw.team_A_id)
  const awayId = str(raw.team_B_id)
  const homeNames = nameByShirt(raw.lineups, homeId)
  const awayNames = nameByShirt(raw.lineups, awayId)
  const homePos = (raw.playing_positions_A || {}) as Record<string, unknown>
  const awayPos = (raw.playing_positions_B || {}) as Record<string, unknown>
  const out: CourtRotation[] = []
  for (let i = 1; i <= 5; i++) {
    const a = rotationSide(i, 'A', homePos[String(i)], homeNames)
    const b = rotationSide(i, 'B', awayPos[String(i)], awayNames)
    if (a) out.push(a)
    if (b) out.push(b)
  }
  return out
}

export function phaseOf(status: unknown): 'upcoming' | 'live' | 'completed' {
  const s = str(status).toLowerCase()
  if (s === 'played' || s === 'finished' || s === '1') return 'completed'
  if (s === 'forfeited' || s === 'walkover') return 'completed'
  if (s.includes('live') || s === '2' || s === 'started') return 'live'
  return 'upcoming'
}

export function setWasPlayed(set: SetLine): boolean {
  return set.home > 0 || set.away > 0 || Boolean(set.start) || Boolean(set.end)
}

/** A Torneopal 0–0 with status Played is not a result unless a set actually started. */
export function isForfeit(raw: Record<string, unknown>): boolean {
  const s = str(raw.status).toLowerCase()
  return s === 'forfeited' || s === 'walkover' || str(raw.walkover) === '1'
}

export function resultIsTrusted(raw: Record<string, unknown>): boolean {
  if (isForfeit(raw)) return true
  if (setsFromMatch(raw).some(setWasPlayed)) return true
  if (phaseOf(raw.status) === 'live') return true
  const a = str(raw.fs_A)
  const b = str(raw.fs_B)
  return a !== '' && b !== '' && !(a === '0' && b === '0')
}

export function phaseForDisplay(raw: Record<string, unknown>): 'upcoming' | 'live' | 'completed' {
  const statusPhase = phaseOf(raw.status)
  if (statusPhase === 'live') return 'live'
  if (!resultIsTrusted(raw)) return 'upcoming'
  return statusPhase === 'upcoming' ? 'completed' : statusPhase
}

/** Short result for lists: '' when there is no trusted result, 'luovutus' for a forfeit. */
export function resultText(raw: Record<string, unknown>): string {
  if (!resultIsTrusted(raw)) return ''
  if (isForfeit(raw)) return 'luovutus'
  const a = str(raw.fs_A)
  const b = str(raw.fs_B)
  return a !== '' && b !== '' ? `${a}–${b}` : ''
}

/** Who gave the game away, as the federation sent it; '' when it did not say. */
export function forfeitingSide(raw: Record<string, unknown>): 'A' | 'B' | '' {
  if (str(raw.forfeit_A) === '1') return 'A'
  if (str(raw.forfeit_B) === '1') return 'B'
  return ''
}
