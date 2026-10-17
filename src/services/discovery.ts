import { asList, tasoData, tasoFetch, TasoError } from './taso'
import {
  clubMap,
  findPlayers,
  findTeams,
  playerIndex,
  registerLooksComplete,
  searchableCompetitions,
  teamIndex,
  type ClubInfo,
  type PlayerEntry,
  type TeamEntry,
} from '../domain/search'
import type { GroupRow } from '../domain/tournament'

export { TasoError }

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

const enc = encodeURIComponent

export function parseVolleyQuery(input: string): { kind: 'text' | 'match' | 'team' | 'player'; id: string; q: string } {
  const raw = input.trim()
  const urlId = raw.match(/(?:match_id|ottelu|team_id|joukkue|player_id|pelaaja)=(\d+)/i)
  if (urlId) {
    const key = urlId[0].toLowerCase()
    if (key.startsWith('team') || key.startsWith('joukkue')) return { kind: 'team', id: urlId[1], q: raw }
    if (key.startsWith('player') || key.startsWith('pelaaja')) return { kind: 'player', id: urlId[1], q: raw }
    return { kind: 'match', id: urlId[1], q: raw }
  }
  // tulospalvelu.lentopallo.fi/match/<id>/info, /team/<id>/info, /person/<id>/info
  const path = raw.match(/\/(match|team|person|player)\/(\d+)/i)
  if (path) {
    const k = path[1].toLowerCase()
    return { kind: k === 'team' ? 'team' : k === 'match' ? 'match' : 'player', id: path[2], q: raw }
  }
  if (/^\d{4,}$/.test(raw)) return { kind: 'match', id: raw, q: raw }
  return { kind: 'text', id: '', q: raw.toLowerCase() }
}

export async function currentSeasonId(): Promise<string> {
  const data = await tasoData('getSeasons').catch(() => null)
  const seasons = asList(data, 'seasons')
  const indoor = seasons.find((x) => x.season_id === '2026-27') || seasons.find((x) => String(x.season_id).includes('-'))
  return s(indoor?.season_id) || '2026-27'
}

export interface Competition {
  id: string
  name: string
  type: string
  season: string
  start: string
  end: string
  location: string
}

function toCompetition(c: Record<string, unknown>): Competition {
  return {
    id: s(c.competition_id),
    name: s(c.competition_name) || s(c.competition_id),
    type: s(c.competition_type),
    season: s(c.season_id),
    start: s(c.competition_start_date),
    end: s(c.competition_end_date),
    location: s(c.competition_location_name) || s(c.competition_city_name),
  }
}

/** Throws TasoError when TASO did not answer; [] only when it answered with nothing. */
export async function fetchCompetitions(seasonId?: string): Promise<Competition[]> {
  let data = await tasoData('getCompetitions?current=1').catch(() => null)
  if (!data) data = await tasoData(`getCompetitions?season_id=${enc(seasonId || (await currentSeasonId()))}`)
  return asList(data, 'competitions').map(toCompetition).filter((c) => c.id)
}

export interface Category {
  id: string
  name: string
  competitionName: string
  playingMethod: string
  notice: string
  matchCount: number | null
  type: string
}

export async function fetchCategories(compId: string): Promise<Category[]> {
  const data = await tasoData(`getCategories?competition_id=${enc(compId)}`)
  return asList(data, 'categories').map((c) => ({
    id: s(c.category_id),
    name: s(c.category_name) || s(c.category_id),
    competitionName: s(c.competition_name),
    playingMethod: s(c.playing_method),
    notice: s(c.category_notice_full) || s(c.category_notice),
    matchCount: s(c.match_count) === '' ? null : Number(c.match_count),
    type: s(c.competition_type),
  })).filter((c) => c.id)
}

export async function fetchGroups(compId: string, catId: string): Promise<{ groups: GroupRow[]; categoryName: string; competitionName: string }> {
  const data = await tasoData(`getGroups?competition_id=${enc(compId)}&category_id=${enc(catId)}`)
  const rows = asList(data, 'groups')
  return {
    categoryName: s(rows[0]?.category_name),
    competitionName: s(rows[0]?.competition_name),
    groups: rows.map((g) => ({
      id: s(g.group_id),
      name: s(g.group_name) || `Lohko ${s(g.group_id)}`,
      type: s(g.group_type),
      phaseNumber: s(g.phase_number) === '' ? null : Number(g.phase_number),
      phaseName: s(g.phase_name),
    })).filter((g) => g.id),
  }
}

/** Every game of a category or one group. getGroup does not carry games; getMatches does. */
export async function fetchCategoryMatches(compId: string, catId: string, groupId?: string): Promise<Record<string, unknown>[]> {
  const q = `competition_id=${enc(compId)}&category_id=${enc(catId)}${groupId ? `&group_id=${enc(groupId)}` : ''}`
  const data = await tasoData(`getMatches?${q}`)
  return asList(data, 'matches')
}

export async function fetchGroup(compId: string, catId: string, groupId: string) {
  const q = `competition_id=${enc(compId)}&category_id=${enc(catId)}&group_id=${enc(groupId)}`
  const [data, matches] = await Promise.all([tasoData(`getGroup?${q}`), fetchCategoryMatches(compId, catId, groupId)])
  const group = (data?.group || {}) as Record<string, unknown>
  return {
    name: s(group.group_name) || s(group.category_name),
    competition: s(group.competition_name),
    category: s(group.category_name),
    groupType: s(group.group_type),
    phaseName: s(group.phase_name),
    playingMethod: s(group.playing_method),
    matchPoints: s(group.match_points),
    teams: asList({ teams: group.teams }, 'teams'),
    rounds: asList({ rounds: group.rounds }, 'rounds'),
    matches,
  }
}

/** null = TASO says no such team; throws TasoError when it did not answer. */
export async function fetchTeam(teamId: string) {
  const data = await tasoData(`getTeam?team_id=${enc(teamId)}`)
  return (data?.team || null) as Record<string, unknown> | null
}

/** Only games this team actually plays in. TASO can answer team_id with the whole group's list. */
export function onlyTeamMatches(rows: Record<string, unknown>[], teamId: string) {
  const id = String(teamId).trim()
  return rows.filter((m) => String(m.team_A_id ?? '').trim() === id || String(m.team_B_id ?? '').trim() === id)
}

export async function fetchMatches(teamId: string) {
  const data = await tasoData(`getMatches?team_id=${enc(teamId)}`)
  return onlyTeamMatches(asList(data, 'matches'), teamId)
}

export const FEDERATION = 'https://tulospalvelu.lentopallo.fi'
export const federationUrl = {
  match: (id: string) => `${FEDERATION}/match/${enc(id)}/info`,
  team: (id: string) => `${FEDERATION}/team/${enc(id)}/info`,
  player: (id: string) => `${FEDERATION}/person/${enc(id)}/info`,
}

/** null = TASO says no such match; throws TasoError when it did not answer. */
export async function fetchMatchRaw(matchId: string) {
  const data = await tasoData(`getMatch?match_id=${enc(matchId)}`)
  const match = data?.match
  return match && typeof match === 'object' ? (match as Record<string, unknown>) : null
}

export async function fetchPlayer(playerId: string) {
  const data = await tasoData(`getPlayer?player_id=${enc(playerId)}`)
  return (data?.player || null) as Record<string, unknown> | null
}

export async function fetchClub(clubId: string) {
  const data = await tasoData(`getClub?club_id=${enc(clubId)}`)
  return (data?.club || null) as Record<string, unknown> | null
}

/* ---------- search ---------- */

const LS_TEAMS = 'volleyball.search.teams.v1'
const LS_PLAYERS = 'volleyball.search.players.v1'
const TEAMS_TTL = 6 * 3600_000
const PLAYERS_TTL = 12 * 3600_000

function readCache<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at: number; data: T }
    return Date.now() - parsed.at < ttl ? parsed.data : null
  } catch {
    return null
  }
}

function writeCache(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    /* full or private mode: memory only */
  }
}

let clubsPromise: Promise<Map<string, ClubInfo>> | null = null
export function loadClubs(): Promise<Map<string, ClubInfo>> {
  if (!clubsPromise) {
    clubsPromise = tasoData('getClubs').then((d) => clubMap(asList(d, 'clubs')))
    clubsPromise.catch(() => { clubsPromise = null })
  }
  return clubsPromise
}

let playersMem: PlayerEntry[] | null = null
let playersPromise: Promise<PlayerEntry[]> | null = null

/**
 * The federation player register. getPlayers needs a club_id or team_id, and with a team_id it
 * answers with the whole register (~36 000 people, ~0.8 MB gzipped). One call, cached on the phone.
 */
export function loadPlayerRegister(): Promise<PlayerEntry[]> {
  if (playersMem) return Promise.resolve(playersMem)
  const cached = readCache<Array<[string, string, string, string]>>(LS_PLAYERS, PLAYERS_TTL)
  if (cached && registerLooksComplete(cached.length)) {
    playersMem = cached.map(([id, first, last, clubId]) => ({ id, first, last, clubId }))
    return Promise.resolve(playersMem)
  }
  if (!playersPromise) {
    playersPromise = tasoData('getPlayers?team_id=64154').then((d) => {
      const list = playerIndex(asList(d, 'players'))
      if (!registerLooksComplete(list.length)) throw new TasoError('getPlayers (register too short)')
      playersMem = list
      writeCache(LS_PLAYERS, list.map((p) => [p.id, p.first, p.last, p.clubId]))
      return list
    })
    playersPromise.catch(() => { playersPromise = null })
  }
  return playersPromise
}

export interface TeamSearchProgress {
  teams: TeamEntry[]
  loaded: number
  total: number
  failed: number
  done: boolean
}

let teamsMem: TeamEntry[] | null = null

/**
 * Teams of this season's competitions and last year's tournaments. getTeams has no name search,
 * so we read each competition's team list in parallel and report after each one.
 */
export async function searchTeams(q: string, onProgress: (p: TeamSearchProgress) => void, signal?: { cancelled: boolean }) {
  const clubs = await loadClubs().catch(() => new Map<string, ClubInfo>())
  const cached = teamsMem || readCache<TeamEntry[]>(LS_TEAMS, TEAMS_TTL)
  if (cached && cached.length) {
    teamsMem = cached
    onProgress({ teams: findTeams(cached, clubs, q), loaded: 1, total: 1, failed: 0, done: true })
    return
  }
  const [comps, season] = await Promise.all([fetchCompetitions(), currentSeasonId()])
  const ids = searchableCompetitions(comps, season, new Date())
  const rows: Record<string, unknown>[] = []
  let loaded = 0
  let failed = 0
  const report = (done: boolean) => {
    if (signal?.cancelled) return
    onProgress({ teams: findTeams(teamIndex(rows), clubs, q), loaded, total: ids.length, failed, done })
  }
  await Promise.all(ids.map(async (id) => {
    const r = await tasoFetch(`getTeams?competition_id=${enc(id)}`)
    if (r.ok) {
      rows.push(...asList(r.data, 'teams'))
      loaded++
    } else {
      failed++
    }
    report(false)
  }))
  if (failed === 0 && rows.length) {
    teamsMem = teamIndex(rows)
    writeCache(LS_TEAMS, teamsMem)
  }
  report(true)
}

export async function searchPlayers(q: string) {
  const [players, clubs] = await Promise.all([loadPlayerRegister(), loadClubs().catch(() => new Map<string, ClubInfo>())])
  return { players: findPlayers(players, clubs, q), clubs }
}

/** Clubs and competitions (the old search). Throws TasoError when TASO did not answer. */
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

  const [clubsData, comps] = await Promise.all([tasoData('getClubs'), fetchCompetitions()])
  const clubs = asList(clubsData, 'clubs')
  const tokens = parsed.q.split(/\s+/).filter(Boolean)
  const clubHits = clubs.filter((c) => {
    const hay = `${s(c.name)} ${s(c.abbrevation)} ${s(c.city_name)}`.toLowerCase()
    return s(c.name) && tokens.every((t) => hay.includes(t))
  }).slice(0, 8)

  const hits: Hit[] = clubHits.map((c) => ({
    kind: 'club',
    id: s(c.club_id),
    title: s(c.name) || s(c.abbrevation),
    subtitle: s(c.city_name) || 'Seura',
    href: `/club/${s(c.club_id)}`,
  }))

  for (const c of comps) {
    const name = c.name.toLowerCase()
    if (tokens.every((t) => name.includes(t))) {
      hits.push({ kind: 'competition', id: c.id, title: c.name, subtitle: c.type === 'tournament' ? 'Turnaus' : 'Sarja', href: `/competition/${c.id}` })
    }
  }
  return hits
}
