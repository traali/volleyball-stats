import { asList, volleyGet } from './taso'

export interface Hit {
  kind: 'club' | 'team' | 'competition' | 'match' | 'player'
  id: string
  title: string
  subtitle: string
  href: string
}

function s(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

export function parseVolleyQuery(input: string): { kind: 'text' | 'match' | 'team' | 'player'; id: string; q: string } {
  const raw = input.trim()
  const urlId = raw.match(/(?:match_id|ottelu|team_id|joukkue|player_id|pelaaja)=(\d+)/i)
  if (urlId) {
    const key = urlId[0].toLowerCase()
    if (key.startsWith('team') || key.startsWith('joukkue')) return { kind: 'team', id: urlId[1], q: raw }
    if (key.startsWith('player') || key.startsWith('pelaaja')) return { kind: 'player', id: urlId[1], q: raw }
    return { kind: 'match', id: urlId[1], q: raw }
  }
  if (/^\d{4,}$/.test(raw)) return { kind: 'match', id: raw, q: raw }
  return { kind: 'text', id: '', q: raw.toLowerCase() }
}

export async function currentSeasonId(): Promise<string> {
  const data = await volleyGet('getSeasons')
  const seasons = asList(data, 'seasons')
  const indoor = seasons.find((s) => s.season_id === '2026-27')
    || seasons.find((s) => String(s.season_id).includes('-'))
  return s(indoor?.season_id) || '2026-27'
}

export async function fetchCompetitions(seasonId?: string) {
  const data = await volleyGet('getCompetitions?current=1')
    || (seasonId
      ? await volleyGet(`getCompetitions?season_id=${encodeURIComponent(seasonId)}`)
      : await volleyGet(`getCompetitions?season_id=${encodeURIComponent(await currentSeasonId())}`))
  return asList(data, 'competitions').map((c) => ({
    id: s(c.competition_id),
    name: s(c.competition_name) || s(c.competition_id),
  })).filter((c) => c.id)
}

export async function fetchCategories(compId: string) {
  const data = await volleyGet(`getCategories?competition_id=${encodeURIComponent(compId)}`)
  return asList(data, 'categories').map((c) => ({
    id: s(c.category_id),
    name: s(c.category_name) || s(c.category_id),
  })).filter((c) => c.id)
}

export async function fetchGroups(compId: string, catId: string) {
  const data = await volleyGet(`getGroups?competition_id=${encodeURIComponent(compId)}&category_id=${encodeURIComponent(catId)}`)
  return asList(data, 'groups').map((g) => ({
    id: s(g.group_id),
    name: s(g.group_name) || `Lohko ${s(g.group_id)}`,
  })).filter((g) => g.id)
}

export async function fetchGroup(compId: string, catId: string, groupId: string) {
  const data = await volleyGet(
    `getGroup?competition_id=${encodeURIComponent(compId)}&category_id=${encodeURIComponent(catId)}&group_id=${encodeURIComponent(groupId)}`,
  )
  const group = (data?.group || {}) as Record<string, unknown>
  return {
    name: s(group.group_name) || s(group.category_name),
    competition: s(group.competition_name),
    category: s(group.category_name),
    teams: asList({ teams: group.teams }, 'teams'),
    matches: asList({ matches: group.matches }, 'matches'),
  }
}

export async function fetchTeam(teamId: string) {
  const data = await volleyGet(`getTeam?team_id=${encodeURIComponent(teamId)}`)
  return (data?.team || null) as Record<string, unknown> | null
}

/** Only games this team actually plays in. TASO can answer team_id with the whole group's list. */
export function onlyTeamMatches(rows: Record<string, unknown>[], teamId: string) {
  const id = String(teamId).trim()
  return rows.filter((m) => String(m.team_A_id ?? '').trim() === id || String(m.team_B_id ?? '').trim() === id)
}

export async function fetchMatches(teamId: string) {
  const data = await volleyGet(`getMatches?team_id=${encodeURIComponent(teamId)}`)
  return onlyTeamMatches(asList(data, 'matches'), teamId)
}

export const FEDERATION = 'https://tulospalvelu.lentopallo.fi'
export const federationUrl = {
  match: (id: string) => `${FEDERATION}/match/${encodeURIComponent(id)}/info`,
  team: (id: string) => `${FEDERATION}/team/${encodeURIComponent(id)}/info`,
  player: (id: string) => `${FEDERATION}/person/${encodeURIComponent(id)}/info`,
}

export async function fetchMatchRaw(matchId: string) {
  const data = await volleyGet(`getMatch?match_id=${encodeURIComponent(matchId)}`)
  const match = data?.match
  return match && typeof match === 'object' ? (match as Record<string, unknown>) : null
}

export async function fetchPlayer(playerId: string) {
  const data = await volleyGet(`getPlayer?player_id=${encodeURIComponent(playerId)}`)
  return (data?.player || null) as Record<string, unknown> | null
}

export async function fetchClub(clubId: string) {
  const data = await volleyGet(`getClub?club_id=${encodeURIComponent(clubId)}`)
  return (data?.club || null) as Record<string, unknown> | null
}

export async function searchDiscovery(query: string): Promise<Hit[]> {
  const parsed = parseVolleyQuery(query)
  if (parsed.kind === 'match') {
    return [
      { kind: 'match', id: parsed.id, title: `Ottelu ${parsed.id}`, subtitle: 'Avaa ottelu', href: `/match/${parsed.id}` },
      { kind: 'team', id: parsed.id, title: `Joukkue ${parsed.id}`, subtitle: 'Jos numero on joukkue', href: `/team/${parsed.id}` },
    ]
  }
  if (parsed.kind === 'team') {
    return [{ kind: 'team', id: parsed.id, title: `Joukkue ${parsed.id}`, subtitle: 'Avaa joukkue', href: `/team/${parsed.id}` }]
  }
  if (parsed.kind === 'player') {
    return [{ kind: 'player', id: parsed.id, title: `Pelaaja ${parsed.id}`, subtitle: 'Avaa pelaaja', href: `/player/${parsed.id}` }]
  }
  if (parsed.q.length < 2) return []

  const [clubsData, season] = await Promise.all([volleyGet('getClubs'), currentSeasonId()])
  const clubs = asList(clubsData, 'clubs')
  const tokens = parsed.q.split(/\s+/).filter(Boolean)
  const clubHits = clubs.filter((c) => {
    const hay = `${s(c.name)} ${s(c.abbrevation)} ${s(c.city_name)}`.toLowerCase()
    return tokens.every((t) => hay.includes(t))
  }).slice(0, 8)

  const hits: Hit[] = clubHits.map((c) => ({
    kind: 'club',
    id: s(c.club_id),
    title: s(c.name) || s(c.abbrevation),
    subtitle: s(c.city_name) || 'Seura',
    href: `/club/${s(c.club_id)}`,
  }))

  const comps = await fetchCompetitions(season)
  for (const c of comps) {
    if (c.name.toLowerCase().includes(parsed.q) || parsed.q.split(' ').every((t) => c.name.toLowerCase().includes(t))) {
      hits.push({ kind: 'competition', id: c.id, title: c.name, subtitle: 'Sarja', href: `/competition/${c.id}` })
    }
  }
  return hits
}
