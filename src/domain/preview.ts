/** Upcoming-match preview: rosters with season stats, recent games, head-to-head, team season numbers. Pure functions over TASO rows. */
type Row = Record<string, unknown>
const s = (v: unknown) => (v == null ? '' : String(v).trim())
const n = (v: unknown) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

export interface RosterPlayer {
  id: string
  name: string
  number: string
  /** Games with recorded stats in this group (season), null when TASO has no stat row. */
  matches: number | null
  points: number | null
  inLineup: boolean
}

/** TASO publishes the match lineup only when lineups_published is set and rows exist. */
export function lineupPublished(match: Row): boolean {
  const rows = Array.isArray(match.lineups) ? match.lineups : []
  return n(match.lineups_published) === 1 && rows.length > 0
}

/**
 * Team roster joined with group player stats. With a published lineup the lineup players come first
 * (by points), the rest of the roster after them with inLineup=false. Without a lineup everyone counts as in.
 */
export function rosterWithStats(match: Row, teamId: string, teamPlayers: Row[], groupStats: Row[]): RosterPlayer[] {
  const published = lineupPublished(match)
  const lineup = (published ? (match.lineups as Row[]) : []).filter((p) => s(p.team_id) === teamId)
  const inLineup = new Set(lineup.map((p) => s(p.player_id)))
  const stats = new Map(groupStats.filter((p) => s(p.team_id) === teamId).map((p) => [s(p.player_id), p]))
  const seen = new Set<string>()
  const out: RosterPlayer[] = []
  const add = (p: Row) => {
    const id = s(p.player_id)
    if (!id || seen.has(id)) return
    seen.add(id)
    const st = stats.get(id)
    const name = `${s(p.first_name)} ${s(p.last_name)}`.trim() || s(p.player_name)
    out.push({
      id,
      name,
      number: s(p.shirt_number) === '0' ? '' : s(p.shirt_number),
      matches: st ? n(st.matches) : null,
      points: st ? n(st.points) : null,
      inLineup: !published || inLineup.has(id),
    })
  }
  teamPlayers.forEach(add)
  lineup.forEach(add)
  return out.sort((a, b) => Number(b.inLineup) - Number(a.inLineup) || (b.points ?? -1) - (a.points ?? -1) || a.name.localeCompare(b.name, 'fi'))
}

export interface GameLine {
  id: string
  date: string
  opponent: string
  home: boolean
  setsFor: number
  setsAgainst: number
  won: boolean
}

function played(m: Row) {
  return s(m.status) === 'Played' && s(m.fs_A) !== '' && s(m.fs_B) !== ''
}

/** Played games of a team, newest first, excluding the given match. */
export function recentGames(matches: Row[], teamId: string, excludeId = '', limit = 5): GameLine[] {
  return matches
    .filter((m) => s(m.match_id) !== excludeId && played(m) && (s(m.team_A_id) === teamId || s(m.team_B_id) === teamId))
    .sort((a, b) => `${s(b.date)} ${s(b.time)}`.localeCompare(`${s(a.date)} ${s(a.time)}`))
    .slice(0, limit)
    .map((m) => {
      const home = s(m.team_A_id) === teamId
      const setsFor = n(home ? m.fs_A : m.fs_B)
      const setsAgainst = n(home ? m.fs_B : m.fs_A)
      return { id: s(m.match_id), date: s(m.date).slice(0, 10), opponent: s(home ? m.team_B_name : m.team_A_name), home, setsFor, setsAgainst, won: setsFor > setsAgainst }
    })
}

/** Played games between the two teams, from team A's side. */
export function headToHead(matches: Row[], teamA: string, teamB: string, excludeId = ''): GameLine[] {
  return recentGames(matches.filter((m) => [s(m.team_A_id), s(m.team_B_id)].includes(teamB)), teamA, excludeId, 20)
}

export interface TeamSeason {
  teamId: string
  name: string
  standing: number
  played: number
  won: number
  lost: number
  points: number
  setsFor: number
  setsAgainst: number
  ballsFor: number
  ballsAgainst: number
}

export function teamSeason(row: Row): TeamSeason {
  return {
    teamId: s(row.team_id),
    name: s(row.team_name),
    standing: n(row.current_standing),
    played: n(row.matches_played),
    won: n(row.matches_won),
    lost: n(row.matches_lost),
    points: n(row.points),
    setsFor: n(row.goals_for),
    setsAgainst: n(row.goals_against),
    ballsFor: n(row.period_points_for),
    ballsAgainst: n(row.period_points_against),
  }
}
