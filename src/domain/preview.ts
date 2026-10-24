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
  /** Previous season from getPlayer, undefined = not fetched, null = no games that season. */
  prev?: PrevSeason | null
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

export interface PrevSeason {
  season: string
  matches: number
  points: number
  teams: string
  categories: string
}

/** '2026-27' -> '2025-26'. Empty when the season id is not in that shape. */
export function previousSeasonId(season: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(season.trim())
  if (!m) return ''
  const y = Number(m[1]) - 1
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`
}

/** One player's played games in a season from getPlayer.matches (not_participated games are skipped). */
export function seasonFromPlayer(player: Row | null, season: string): PrevSeason | null {
  const rows = (Array.isArray(player?.matches) ? (player!.matches as Row[]) : [])
    .filter((m) => s(m.season_id) === season && s(m.status) === 'Played' && s(m.not_participated) !== '1')
  if (!rows.length) return null
  const uniq = (k: string) => [...new Set(rows.map((m) => s(m[k])).filter(Boolean))].join(', ')
  return { season, matches: rows.length, points: rows.reduce((x, m) => x + n(m.player_points), 0), teams: uniq('team_name'), categories: uniq('category_name') }
}

/** Played games between two clubs found in the players' getPlayer rows for a season, from club A's side. */
export function clubHeadToHead(players: Array<Row | null>, season: string, clubA: string, clubB: string): GameLine[] {
  const seen = new Map<string, Row>()
  for (const p of players) {
    for (const m of (Array.isArray(p?.matches) ? (p!.matches as Row[]) : [])) {
      if (s(m.season_id) !== season || !played(m)) continue
      const clubs = [s(m.club_A_id), s(m.club_B_id)]
      if (clubs.includes(clubA) && clubs.includes(clubB) && clubA !== clubB) seen.set(s(m.match_id), m)
    }
  }
  const rows = [...seen.values()].map((m) => ({ ...m, _side: s(m.club_A_id) === clubA ? s(m.team_A_id) : s(m.team_B_id) }))
  return rows.flatMap((m) => recentGames([m], s(m._side), '', 1)).sort((a, b) => b.date.localeCompare(a.date))
}
