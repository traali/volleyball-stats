export interface RallyPoint {
  period: number
  wallTime: string
  score: string
  playerName: string
  shirt: string
  teamId: string
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
      durationMin: str(raw[`p${i}_duration`]) || undefined,
      firstServeTeamId: str(raw[`p${i}_start_team`]) || undefined,
    })
  }
  return out
}

export function pointsFromEvents(events: unknown): RallyPoint[] {
  if (!Array.isArray(events)) return []
  const points: RallyPoint[] = []
  for (const row of events) {
    if (!row || typeof row !== 'object') continue
    const e = row as Record<string, unknown>
    if (str(e.code) !== 'piste') continue
    points.push({
      period: num(e.period) || 1,
      wallTime: str(e.wall_time) || str(e.time) || '—',
      score: str(e.description) || `${str(e.code_fi)}`.replace(/^Piste\s*/i, ''),
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
  if (s.includes('live') || s === '2' || s === 'started') return 'live'
  return 'upcoming'
}
