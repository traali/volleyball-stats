/** Pure name matching for /search. No network here. */

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

/** Lowercase, no accents (ä→a, ö→o, å→a), punctuation as spaces: "Mäkeläinen" matches "makelainen". */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function tokens(q: string): string[] {
  return fold(q).split(' ').filter(Boolean)
}

function matchesAll(hay: string, toks: string[]): boolean {
  return toks.length > 0 && toks.every((t) => hay.includes(t))
}

export interface ClubInfo {
  id: string
  name: string
  abbr: string
}

export interface TeamEntry {
  id: string
  name: string
  clubId: string
  categories: string[]
}

export interface PlayerEntry {
  id: string
  first: string
  last: string
  clubId: string
}

/** getTeams rows from many competitions → one entry per team id, every category it plays in. */
export function teamIndex(rows: Record<string, unknown>[]): TeamEntry[] {
  const byId = new Map<string, TeamEntry>()
  for (const r of rows) {
    const id = str(r.team_id)
    const name = str(r.team_name)
    if (!id || id === '0' || !name) continue
    const cat = str(r.category_name)
    const prev = byId.get(id)
    if (prev) {
      if (cat && !prev.categories.includes(cat)) prev.categories.push(cat)
    } else {
      byId.set(id, { id, name, clubId: str(r.club_id), categories: cat ? [cat] : [] })
    }
  }
  return [...byId.values()]
}

/** getPlayers rows → slim entries (no birth year: TASO marks it hidden for players). */
export function playerIndex(rows: Record<string, unknown>[]): PlayerEntry[] {
  const out: PlayerEntry[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    const id = str(r.player_id)
    const first = str(r.first_name)
    const last = str(r.last_name)
    if (!id || id === '0' || (!first && !last) || seen.has(id)) continue
    seen.add(id)
    out.push({ id, first, last, clubId: str(r.club_id) })
  }
  return out
}

export function clubMap(rows: Record<string, unknown>[]): Map<string, ClubInfo> {
  const map = new Map<string, ClubInfo>()
  for (const r of rows) {
    const id = str(r.club_id)
    if (!id) continue
    map.set(id, { id, name: str(r.name), abbr: str(r.abbrevation) })
  }
  return map
}

function clubText(c: ClubInfo | undefined): string {
  return c ? `${c.name} ${c.abbr}` : ''
}

/** Teams whose name, category or club contains every word. Best first: name starts with the query. */
export function findTeams(teams: TeamEntry[], clubs: Map<string, ClubInfo>, q: string, limit = 30): TeamEntry[] {
  const toks = tokens(q)
  if (toks.join('').length < 2) return []
  const whole = toks.join(' ')
  const scored: Array<{ t: TeamEntry; score: number }> = []
  for (const t of teams) {
    const name = fold(t.name)
    const hay = `${name} ${fold(t.categories.join(' '))} ${fold(clubText(clubs.get(t.clubId)))}`
    if (!matchesAll(hay, toks)) continue
    const score = (name === whole ? 0 : name.startsWith(whole) ? 1 : matchesAll(name, toks) ? 2 : 3)
    scored.push({ t, score })
  }
  return scored
    .sort((a, b) => a.score - b.score || a.t.name.localeCompare(b.t.name, 'fi'))
    .slice(0, limit)
    .map((s) => s.t)
}

/**
 * Players by name. Every word must hit the name or the club ("aino puma").
 * Words that match the name rank above club-only matches.
 */
export function findPlayers(players: PlayerEntry[], clubs: Map<string, ClubInfo>, q: string, limit = 30): PlayerEntry[] {
  const toks = tokens(q)
  if (toks.join('').length < 3) return []
  const whole = toks.join(' ')
  const scored: Array<{ p: PlayerEntry; score: number }> = []
  for (const p of players) {
    const full = fold(`${p.first} ${p.last}`)
    const rev = fold(`${p.last} ${p.first}`)
    const nameHit = toks.filter((t) => full.includes(t)).length
    if (nameHit === 0) continue
    if (nameHit < toks.length) {
      const club = fold(clubText(clubs.get(p.clubId)))
      if (!toks.every((t) => full.includes(t) || club.includes(t))) continue
    }
    const score = full === whole || rev === whole ? 0
      : full.startsWith(whole) || rev.startsWith(whole) ? 1
      : nameHit === toks.length ? 2
      : 3
    scored.push({ p, score })
  }
  return scored
    .sort((a, b) => a.score - b.score || a.p.last.localeCompare(b.p.last, 'fi') || a.p.first.localeCompare(b.p.first, 'fi'))
    .slice(0, limit)
    .map((s) => s.p)
}

/**
 * getPlayers ignores team_id and answers with the whole federation register (~36 000 people).
 * If TASO ever starts filtering, a short answer would make name search quietly miss people — treat it as unavailable.
 */
export const MIN_REGISTER_SIZE = 5000

export function registerLooksComplete(count: number): boolean {
  return count >= MIN_REGISTER_SIZE
}

/** Competitions whose teams are worth searching: this indoor season plus tournaments of the last year. */
export function searchableCompetitions(
  comps: Array<{ id: string; name: string; type: string; season: string; end: string }>,
  season: string,
  today: Date,
): string[] {
  const yearAgo = new Date(today.getTime() - 365 * 86400_000).toISOString().slice(0, 10)
  return comps
    .filter((c) => !/koulutus|testi/i.test(`${c.id} ${c.name}`))
    .filter((c) => !c.id.toLowerCase().startsWith('beach'))
    .filter((c) => c.season === season || (c.type === 'tournament' && c.end >= yearAgo))
    .map((c) => c.id)
}
