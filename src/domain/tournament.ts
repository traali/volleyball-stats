/**
 * Tournaments (turnaukset) as TASO really sends them.
 * - getCompetitions: competition_type 'tournament' (Power Cup, Beach) or 'league'.
 * - getCategories: playing_method 'mini-tournament' for youth tournament days inside a league.
 * - getGroups/getGroup: group_type group_stage | additional_group_stage | knockout_full | knockout_final | one_match,
 *   phase_number + phase_name for the stage. getGroup carries the standings rows in `teams`, never the matches.
 * - getMatches?competition_id&category_id[&group_id]: the matches, with period_count, period_count_fixed, win_period_count.
 */

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function int(v: unknown): number | null {
  const t = str(v)
  if (!/^-?\d+$/.test(t)) return null
  return Number(t)
}

export type StageKind = 'group' | 'extra' | 'knockout' | 'placement' | 'other'

export function stageKind(groupType: unknown): StageKind {
  const t = str(groupType).toLowerCase()
  if (t === 'group_stage') return 'group'
  if (t === 'additional_group_stage') return 'extra'
  if (t.startsWith('knockout') || t.includes('playoff')) return 'knockout'
  if (t === 'one_match') return 'placement'
  return 'other'
}

const STAGE_LABEL: Record<StageKind, string> = {
  group: 'Alkulohkot',
  extra: 'Jatkolohkot',
  knockout: 'Pudotuspelit',
  placement: 'Sijoitusottelut',
  other: 'Lohkot',
}

const STAGE_ORDER: Record<StageKind, number> = { group: 0, extra: 1, knockout: 2, placement: 3, other: 4 }

export function stageLabel(groupType: unknown): string {
  return STAGE_LABEL[stageKind(groupType)]
}

export interface GroupRow {
  id: string
  name: string
  type: string
  phaseNumber: number | null
  phaseName: string
}

export interface StageSection {
  key: string
  title: string
  kind: StageKind
  groups: GroupRow[]
}

/** Groups into stages in play order; group ids sorted as numbers (TASO sends "1, 10, 11, 2 …"). */
export function stagesFromGroups(groups: GroupRow[]): StageSection[] {
  const sections = new Map<string, StageSection & { order: number }>()
  for (const g of groups) {
    const kind = stageKind(g.type)
    const key = `${g.phaseNumber ?? ''}|${g.phaseName}|${kind}`
    if (!sections.has(key)) {
      sections.set(key, {
        key,
        title: g.phaseName || (g.phaseNumber != null ? `${g.phaseNumber}. vaihe · ${STAGE_LABEL[kind]}` : STAGE_LABEL[kind]),
        kind,
        groups: [],
        order: (g.phaseNumber ?? 99) * 10 + STAGE_ORDER[kind],
      })
    }
    sections.get(key)!.groups.push(g)
  }
  const byId = (a: GroupRow, b: GroupRow) => (int(a.id) ?? 1e9) - (int(b.id) ?? 1e9) || a.id.localeCompare(b.id)
  return [...sections.values()]
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'fi'))
    .map((s) => ({ key: s.key, title: s.title, kind: s.kind, groups: [...s.groups].sort(byId) }))
}

export type StandingsState = 'table' | 'not-started' | 'none'

/**
 * Show a table only when TASO sent one: a group stage whose team rows carry standing + points,
 * and at least one game is in it. Knockout and placement games are shown as games, never as a table.
 */
export function standingsState(groupType: unknown, teams: Record<string, unknown>[]): StandingsState {
  const kind = stageKind(groupType)
  if (kind === 'knockout' || kind === 'placement') return 'none'
  if (teams.length === 0) return 'none'
  const real = teams.every((t) => int(t.current_standing) != null && int(t.points) != null && int(t.matches_played) != null)
  if (!real) return 'none'
  return teams.some((t) => (int(t.matches_played) ?? 0) > 0) ? 'table' : 'not-started'
}

export interface StandingColumn {
  key: string
  label: string
  help: string
}

/** Columns from the group's own match_points ("3,2,1,0" league, "2,1,0" youth with ties, "2,1,1,0" best of three). */
export function standingColumns(matchPoints: unknown, teams: Record<string, unknown>[]): StandingColumn[] {
  const pts = str(matchPoints).split(',').map((p) => int(p)).filter((p): p is number => p != null)
  const any = (k: string) => teams.some((t) => (int(t[k]) ?? 0) > 0)
  // League volleyball: 3–0/3–1, 3–2, 2–3, loss score differently (3,2,1,0). Youth "2,1,1,0" only uses win/loss.
  const league = pts.length >= 4 && pts[0] > pts[1] && pts[1] > pts[2] && pts[2] > pts[3]
  const cols: StandingColumn[] = [{ key: 'matches_played', label: 'O', help: 'ottelut' }]
  if (league) {
    cols.push({ key: 'matches_won', label: 'V3', help: `voitto 3–0 tai 3–1 (${pts[0]} p)` })
    cols.push({ key: 'matches_tiedwon', label: 'V2', help: `voitto 3–2 (${pts[1]} p)` })
    cols.push({ key: 'matches_tied', label: 'H1', help: `tappio 2–3 (${pts[2]} p)` })
    cols.push({ key: 'matches_lost', label: 'H', help: `tappio (${pts[3]} p)` })
  } else {
    cols.push({ key: 'matches_won', label: 'V', help: pts.length ? `voitto (${pts[0]} p)` : 'voitto' })
    if (any('matches_tiedwon')) cols.push({ key: 'matches_tiedwon', label: 'V2', help: 'tiukka voitto' })
    if (any('matches_tied')) cols.push({ key: 'matches_tied', label: 'T', help: pts.length >= 2 ? `tasapeli (${pts[1]} p)` : 'tasapeli' })
    cols.push({ key: 'matches_lost', label: 'H', help: 'tappio' })
  }
  return cols
}

export type MatchFormat =
  | { kind: 'fixed'; sets: number }
  | { kind: 'best-of'; toWin: number; maxSets: number }
  | { kind: 'max'; maxSets: number }
  | { kind: 'unknown' }

/** Match format as TASO states it. A fixed two-set youth game can end 1–1; that is a finished game, not an unfinished one. */
export function matchFormat(raw: Record<string, unknown>): MatchFormat {
  const count = int(raw.period_count)
  const toWin = int(raw.win_period_count)
  if (str(raw.period_count_fixed) === '1' && count) return { kind: 'fixed', sets: count }
  if (toWin && toWin > 0) return { kind: 'best-of', toWin, maxSets: count && count >= toWin ? count : toWin * 2 - 1 }
  if (count) return { kind: 'max', maxSets: count }
  return { kind: 'unknown' }
}

export function formatLabel(f: MatchFormat): string {
  if (f.kind === 'fixed') return `${f.sets} erää (kaikki pelataan, tasapeli mahdollinen)`
  if (f.kind === 'best-of') {
    if (f.toWin === 2) return 'Paras kolmesta (2 voitettua erää)'
    if (f.toWin === 3) return 'Paras viidestä (3 voitettua erää)'
    return `${f.toWin} voitettua erää`
  }
  if (f.kind === 'max') return `Enintään ${f.maxSets} erää`
  return ''
}

/** TASO says Tie (fixed set count, sets shared). */
export function isTie(raw: Record<string, unknown>): boolean {
  if (str(raw.winner).toLowerCase() !== 'tie') return false
  const a = str(raw.fs_A)
  const b = str(raw.fs_B)
  return a !== '' && a === b && a !== '0'
}

/**
 * The set went past its target to extra points (26–24, 17–15, 23–21). Works for 25, 21 and 15 point sets
 * without knowing the target: a set can only end on a two-point lead above a target.
 */
export function setWentToExtraPoints(home: number, away: number): boolean {
  const hi = Math.max(home, away)
  const lo = Math.min(home, away)
  if (hi - lo !== 2) return false
  if (hi === 15 || hi === 21 || hi === 25) return false
  const target = [25, 21, 15].find((t) => t < hi)
  return target != null && lo >= target - 1
}

/** "v5462" → winner of game 5462, "h5462" → loser. Anything else is shown as TASO sent it. */
export function placeholderLabel(desc: unknown): string {
  const d = str(desc)
  const m = /^([vh])(\d+)$/i.exec(d)
  if (!m) return d
  return m[1].toLowerCase() === 'v' ? `Ottelun ${m[2]} voittaja` : `Ottelun ${m[2]} häviäjä`
}

/** Team name for a list. Before the draw TASO has no team, only a placeholder like "v5462" or "Arvotaan". */
export function sideName(raw: Record<string, unknown>, side: 'A' | 'B'): { name: string; teamId: string } {
  const teamId = str(raw[`team_${side}_id`])
  const name = str(raw[`team_${side}_name`])
  const desc = str(raw[`team_${side}_description`])
  if (teamId && teamId !== '0' && name) return { name, teamId }
  const placeholder = /^[vh]\d+$/i.test(name) ? placeholderLabel(name) : name || placeholderLabel(desc)
  return { name: placeholder || '—', teamId: '' }
}

export function courtLabel(raw: Record<string, unknown>): string {
  const venue = str(raw.venue_name)
  const loc = str(raw.venue_location_name)
  const parts: string[] = []
  // Power Cup sends the court number as the venue name ("198").
  if (venue) parts.push(/^\d{1,4}$/.test(venue) ? `Kenttä ${venue}` : venue)
  if (loc && loc !== venue) parts.push(/^\d{1,4}$/.test(loc) ? `Kenttä ${loc}` : loc)
  return parts.join(' · ')
}

function validDate(d: string): string {
  const t = d.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(t) && !t.startsWith('0000') ? t : ''
}

function validTime(t: string): string {
  const m = /^(\d{2}):(\d{2})/.exec(t)
  return m ? `${m[1]}:${m[2]}` : ''
}

export interface DaySchedule {
  date: string
  venues: Array<{ venue: string; matches: Record<string, unknown>[] }>
}

const collator = new Intl.Collator('fi', { numeric: true })

/**
 * A tournament day: per date, per hall, games in time then court order.
 * Games without a date go last under date ''.
 */
export function scheduleByDay(matches: Record<string, unknown>[]): DaySchedule[] {
  const days = new Map<string, Map<string, Record<string, unknown>[]>>()
  for (const m of matches) {
    const date = validDate(str(m.date))
    const venue = /^\d{1,4}$/.test(str(m.venue_name)) ? '' : str(m.venue_name)
    if (!days.has(date)) days.set(date, new Map())
    const v = days.get(date)!
    if (!v.has(venue)) v.set(venue, [])
    v.get(venue)!.push(m)
  }
  const order = (m: Record<string, unknown>) => `${validTime(str(m.time)) || '99:99'} ${str(m.venue_name)} ${str(m.venue_location_name)}`
  return [...days.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(([date, venues]) => ({
      date,
      venues: [...venues.entries()]
        .sort(([a], [b]) => collator.compare(a, b))
        .map(([venue, list]) => ({ venue, matches: [...list].sort((x, y) => collator.compare(order(x), order(y))) })),
    }))
}

export function timeOf(m: Record<string, unknown>): string {
  return validTime(str(m.time))
}

export function dateLabel(date: string): string {
  if (!date) return 'Ei päivämäärää TASOssa'
  const d = new Date(`${date}T12:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })
}

/** Category notice is HTML from TASO. Text plus its links; no HTML is rendered. */
export function noticeParts(html: unknown): { text: string; links: Array<{ href: string; label: string }> } {
  const raw = str(html)
  const links: Array<{ href: string; label: string }> = []
  const re = /<a\s[^>]*href\s*=\s*['"]([^'"]+)['"][^>]*>(.*?)<\/a/gis
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) {
    const href = m[1].trim()
    if (/^https?:\/\//i.test(href)) links.push({ href, label: m[2].replace(/<[^>]+>/g, '').trim() || href })
  }
  const text = raw
    .replace(/<a\s[^>]*>.*?<\/a[^>]*>/gis, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
  return { text, links }
}

export function isTournamentCompetition(c: { type?: string; name?: string }): boolean {
  return str(c.type).toLowerCase() === 'tournament' || /turnaus/i.test(str(c.name))
}
