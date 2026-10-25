/**
 * Sets a player was actually on court vs. only on the match roster ("vaihdossa"), from getMatch data.
 * On court in a set = in that set's position data (starting_playing_positions_X / 'pelipaikat' events,
 * libero slots included when TASO filled them) or came in with a 'vaihto' event in that set.
 * A team's set with no position data at all is "unknown": it is never counted as on court or on the bench.
 */
type Row = Record<string, unknown>
const s = (v: unknown) => (v == null ? '' : String(v).trim())

export interface PlayerSets {
  playerId: string
  teamId: string
  name: string
  shirt: string
  /** Set numbers the player was on court. */
  onCourt: number[]
  /** Set numbers the player was on the roster but never entered the court. */
  bench: number[]
  /** Set numbers with no per-set lineup data for the player's team. */
  unknown: number[]
}

function events(raw: Row): Row[] {
  return Array.isArray(raw.events) ? (raw.events as Row[]).filter((e) => e && typeof e === 'object') : []
}

/** Played set numbers: periods_played, else sets with a recorded score. */
export function playedSets(raw: Row): number[] {
  let n = Number(s(raw.periods_played))
  if (!Number.isFinite(n) || n <= 0) {
    n = 0
    for (let i = 1; i <= 5; i++) if (Number(s(raw[`p${i}s_A`])) + Number(s(raw[`p${i}s_B`])) > 0) n = i
  }
  return Array.from({ length: n }, (_, i) => i + 1)
}

export function setParticipation(raw: Row): PlayerSets[] {
  const teamA = s(raw.team_A_id)
  const teamB = s(raw.team_B_id)
  const lineups = (Array.isArray(raw.lineups) ? (raw.lineups as Row[]) : []).filter((p) => s(p.player_id) && (s(p.team_id) === teamA || s(p.team_id) === teamB))
  if (!lineups.length) return []
  const byShirt = new Map<string, string>()
  const byPos = new Map<string, string>()
  for (const p of lineups) {
    byShirt.set(`${s(p.team_id)}|${s(p.shirt_number)}`, s(p.player_id))
    byPos.set(`${s(p.team_id)}|${s(p.pos_id)}`, s(p.player_id))
  }
  const on = new Map<string, Set<string>>() // `${team}|${set}` -> player ids
  const hasData = new Set<string>() // `${team}|${set}` with position data
  const add = (team: string, set: number, id: string | undefined) => {
    if (!id) return
    const k = `${team}|${set}`
    if (!on.has(k)) on.set(k, new Set())
    on.get(k)!.add(id)
  }
  for (const [side, team] of [['A', teamA], ['B', teamB]] as const) {
    const pos = raw[`starting_playing_positions_${side}`]
    if (pos && typeof pos === 'object') {
      for (const [set, list] of Object.entries(pos as Record<string, unknown>)) {
        if (!Array.isArray(list)) continue
        const ids = list.map((x) => byPos.get(`${team}|${s(x)}`)).filter(Boolean)
        if (ids.length) hasData.add(`${team}|${Number(set)}`)
        ids.forEach((id) => add(team, Number(set), id))
      }
    }
  }
  for (const e of events(raw)) {
    const team = s(e.team_id)
    const set = Number(e.period) || 1
    if (s(e.code) === 'pelipaikat') {
      const pairs = s(e.description).split(',').map((p) => p.split('=')).filter((p) => p.length === 2)
      const ids = pairs.map(([posId, shirt]) => byPos.get(`${team}|${s(posId)}`) || byShirt.get(`${team}|${s(shirt)}`))
      if (ids.some(Boolean)) hasData.add(`${team}|${set}`)
      ids.forEach((id) => add(team, set, id))
    } else if (s(e.code) === 'vaihto' && s(e.player_2_id)) {
      // player_id comes in for player_2_id. The mirror row (empty player_2_id) repeats the same change.
      add(team, set, s(e.player_id))
      hasData.add(`${team}|${set}`)
    }
  }
  const sets = playedSets(raw)
  return lineups.map((p) => {
    const team = s(p.team_id)
    const id = s(p.player_id)
    const r: PlayerSets = { playerId: id, teamId: team, name: s(p.player_name) || `${s(p.last_name)} ${s(p.first_name)}`.trim(), shirt: s(p.shirt_number), onCourt: [], bench: [], unknown: [] }
    for (const set of sets) {
      const k = `${team}|${set}`
      if (!hasData.has(k)) r.unknown.push(set)
      else if (on.get(k)?.has(id)) r.onCourt.push(set)
      else r.bench.push(set)
    }
    return r
  })
}

export interface SetTotals { onCourt: number; bench: number; unknown: number; matches: number }

/** Sum per player over many matches (only matches where the player was on the roster). */
export function sumSets(matches: Row[]): Map<string, SetTotals> {
  const out = new Map<string, SetTotals>()
  for (const raw of matches) {
    for (const p of setParticipation(raw)) {
      const t = out.get(p.playerId) || { onCourt: 0, bench: 0, unknown: 0, matches: 0 }
      t.onCourt += p.onCourt.length
      t.bench += p.bench.length
      t.unknown += p.unknown.length
      t.matches += 1
      out.set(p.playerId, t)
    }
  }
  return out
}
