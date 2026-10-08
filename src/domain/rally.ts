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

export function setsFromMatch(raw: Record<string, unknown>): SetLine[] {
  const out: SetLine[] = []
  for (let i = 1; i <= 5; i++) {
    const a = str(raw[`p${i}s_A`])
    const b = str(raw[`p${i}s_B`])
    if (!a && !b) continue
    out.push({
      number: i,
      home: num(a),
      away: num(b),
      start: str(raw[`p${i}_start_time`]) || undefined,
      end: str(raw[`p${i}_end_time`]) || undefined,
      durationMin:
        str(raw[`p${i}_duration`]) ||
        minutesBetween(str(raw[`p${i}_start_time`]), str(raw[`p${i}_end_time`])) ||
        undefined,
      firstServeTeamId: str(raw[`p${i}_start_team`]) || undefined,
    })
  }
  return out
}

export function pointsFromEvents(events: unknown, homeTeamId = ''): RallyPoint[] {
  if (!Array.isArray(events)) return []
  const points: RallyPoint[] = []
  const tally = new Map<number, [number, number]>()
  for (const row of events) {
    if (!row || typeof row !== 'object') continue
    const e = row as Record<string, unknown>
    if (str(e.code) !== 'piste') continue
    const period = num(e.period) || 1
    const side = str(e.team) || (homeTeamId && str(e.team_id) === homeTeamId ? 'A' : homeTeamId ? 'B' : '')
    const t = tally.get(period) || [0, 0]
    if (side === 'A') t[0] += 1
    else if (side === 'B') t[1] += 1
    tally.set(period, t)
    // Torneopal sends the running set score as ps_A / ps_B. `description` is the point TYPE.
    const psA = str(e.ps_A)
    const psB = str(e.ps_B)
    const score =
      psA !== '' && psB !== '' && Number.isFinite(Number(psA)) && Number.isFinite(Number(psB))
        ? `${Number(psA)}–${Number(psB)}`
        : side
          ? `${t[0]}–${t[1]}`
          : ''
    points.push({
      period,
      wallTime: str(e.wall_time) || str(e.time) || '—',
      score,
      kind: str(e.description),
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
