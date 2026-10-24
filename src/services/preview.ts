import type { PreviewData } from '../components/MatchPreview'
import { clubHeadToHead, likelyRotation, playerGames, headToHead, previousSeasonId, seasonFromPlayer, lineupPublished, recentGames, rosterWithStats, teamSeason } from '../domain/preview'
import { asList, tasoData } from './taso'
import { fetchMatchRaw, fetchMatches, fetchPlayer, fetchTeam } from './discovery'

const s = (v: unknown) => (v == null ? '' : String(v).trim())
const enc = encodeURIComponent
async function ok<T>(p: Promise<T>): Promise<T | null> {
  try { return await p } catch { return null }
}

/** Everything TASO has for a match preview. Each part can fail on its own and then shows 'ei tietoa'. */
export async function fetchPreview(match: Record<string, unknown>): Promise<PreviewData> {
  const ids = [s(match.team_A_id), s(match.team_B_id)]
  const names = [s(match.team_A_name), s(match.team_B_name)]
  const q = `competition_id=${enc(s(match.competition_id))}&category_id=${enc(s(match.category_id))}&group_id=${enc(s(match.group_id))}`
  const [group, tA, tB, mA, mB] = await Promise.all([
    ok(tasoData(`getGroup?${q}`)),
    ok(fetchTeam(ids[0])), ok(fetchTeam(ids[1])),
    ok(fetchMatches(ids[0])), ok(fetchMatches(ids[1])),
  ])
  const g = (group?.group || null) as Record<string, unknown> | null
  const stats = asList(g, 'player_statistics')
  const standings = g ? asList(g, 'teams').map(teamSeason).sort((x, y) => x.standing - y.standing) : null
  const teams = [tA, tB]
  const matches = [mA, mB]
  const recent = matches.map((m, i) => (m ? recentGames(m, ids[i], s(match.match_id), 10) : null))
  const previousGames = await Promise.all(recent.map(async (r, i) => ({
    team: names[i],
    games: ((await Promise.all((r || []).slice(0, 5).map((x) => ok(fetchMatchRaw(x.id))))).filter(Boolean)) as Record<string, unknown>[],
  })))
  const prevSeason = previousSeasonId(s(match.competition_season))
  const rosters = ids.map((id, i) => (teams[i] ? rosterWithStats(match, id, asList(teams[i], 'players'), stats) : null))
  const players = new Map<string, Record<string, unknown> | null | undefined>()
  await Promise.all(rosters.flat().filter(Boolean).map(async (p) => { players.set(p!.id, await ok(fetchPlayer(p!.id))) }))
  for (const r of rosters) for (const p of r || []) {
    const row = players.get(p.id)
    p.prev = row === null || row === undefined || !prevSeason ? undefined : seasonFromPlayer(row, prevSeason)
    p.games = row ? playerGames(row, [s(match.competition_season), prevSeason].filter(Boolean)) : undefined
  }
  const h2hPrev = prevSeason ? clubHeadToHead([...players.values()].filter((x): x is Record<string, unknown> => Boolean(x)), prevSeason, s(match.club_A_id), s(match.club_B_id)) : []
  return {
    prevSeason,
    h2hPrev,
    lineupPublished: lineupPublished(match),
    teams: ids.map((id, i) => ({
      id,
      name: names[i],
      roster: rosters[i],
      recent: recent[i],
      rotation: likelyRotation(previousGames[i].games, id),
      season: standings?.find((r) => r.teamId === id) || null,
    })),
    h2h: mA ? headToHead(mA, ids[0], ids[1], s(match.match_id)) : null,
    standings,
    previousGames,
  }
}
