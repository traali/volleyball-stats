export type Confidence = 'high' | 'medium' | 'low'
export interface Rated { text: string; confidence: Confidence }
export type BallField = 'serveZone' | 'reception' | 'setter' | 'attacker' | 'attackDir' | 'blockTouch' | 'landing'
export interface AnalysisRally {
  score: string
  officialWinner: 'home' | 'away'
  torneopalType: string | null
  youtubeS: number | null
  finding?: Rated
  note?: string
  ball?: Partial<Record<BallField, Rated>>
  /** Per-rally video description with search tags (additive). */
  desc?: RallyDesc
}
export interface RallyDesc { text: string; tags: string[]; confidence: Confidence }
export interface AnalysisEvent { set: number; score: string; kind: string; text: string; youtubeS: number | null }
export interface MatchAnalysis {
  matchId: string
  home: string
  away: string
  video: { provider: 'youtube'; id: string; endsAt?: string }
  setScores: Record<string, string>
  analysedSets: number[]
  sets: Record<string, AnalysisRally[]>
  events: AnalysisEvent[]
  notes: string[]
}

export const BALL_LABEL: Record<BallField, string> = {
  serveZone: 'Syöttöalue', reception: 'Vastaanotto', setter: 'Passari', attacker: 'Hyökkääjä',
  attackDir: 'Hyökkäyssuunta', blockTouch: 'Torjuntakosketus', landing: 'Pallon osuma',
}
export const CONF_LABEL: Record<Confidence, string> = { high: 'varma', medium: 'kohtalainen', low: 'epävarma' }

export function isMatchAnalysis(v: unknown): v is MatchAnalysis {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  const video = o.video as Record<string, unknown> | undefined
  return typeof o.matchId === 'string' && !!video && typeof video.id === 'string' && /^[\w-]{6,20}$/.test(video.id)
    && !!o.sets && typeof o.sets === 'object' && Array.isArray(o.events)
}

export function youtubeLink(id: string, t: number): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}&t=${Math.max(0, Math.floor(t))}s`
}

export function clock(t: number): string {
  const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, sec = Math.floor(t % 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export type StatKind = 'kill' | 'ace' | 'block' | 'serveError' | 'attackError' | 'netFault' | 'rotationFault'
export const STAT_LABEL: Record<StatKind, string> = {
  kill: 'Hyökkäyspiste', ace: 'Ässä', block: 'Torjuntapiste', serveError: 'Syöttövirhe',
  attackError: 'Hyökkäysvirhe', netFault: 'Verkkovirhe', rotationFault: 'Kiertovirhe',
}

/** Classify a confirmed video finding: which team did it (by name prefix) and what kind. */
export function classifyFinding(text: string, home: string, away: string): { side: 'home' | 'away'; kind: StatKind } | null {
  const t = text.trim()
  const side = t.startsWith(home) ? 'home' : t.startsWith(away) ? 'away' : null
  if (!side) return null
  const l = t.toLowerCase()
  const kind: StatKind | null = /rotation/.test(l) ? 'rotationFault'
    : /serve (error|into net)/.test(l) ? 'serveError'
    : /net touch/.test(l) ? 'netFault'
    : /attack out/.test(l) ? 'attackError'
    : /\bace\b/.test(l) ? 'ace'
    : /\bblock\b/.test(l) && !/block touch|block-touch|no block/.test(l) ? 'block'
    : /\bkill\b/.test(l) ? 'kill' : null
  return kind ? { side, kind } : null
}

export function teamStats(a: MatchAnalysis): { kind: StatKind; home: number; away: number }[] {
  const acc = new Map<StatKind, { home: number; away: number }>()
  for (const rallies of Object.values(a.sets)) {
    for (const r of rallies) {
      if (!r.finding) continue
      const c = classifyFinding(r.finding.text, a.home, a.away)
      if (!c) continue
      const row = acc.get(c.kind) ?? { home: 0, away: 0 }
      row[c.side] += 1
      acc.set(c.kind, row)
    }
  }
  return (Object.keys(STAT_LABEL) as StatKind[]).filter((k) => acc.has(k)).map((k) => ({ kind: k, ...acc.get(k)! }))
}

export async function fetchAnalysis(matchId: string): Promise<MatchAnalysis | null> {
  if (!/^\d+$/.test(matchId)) return null
  try {
    const res = await fetch(`/analysis/${matchId}.json`)
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return null
    const data: unknown = await res.json()
    return isMatchAnalysis(data) && data.matchId === matchId ? data : null
  } catch {
    return null
  }
}

export const TAG_LABEL: Record<string, string> = {
  'ace': 'ässä', 'serve error': 'syöttövirhe', 'serve long': 'syöttö pitkä', 'serve net': 'syöttö verkkoon',
  'kill': 'hyökkäyspiste', 'block point': 'torjuntapiste', 'two-person block': 'kahden hengen torjunta',
  'three-person block': 'kolmen hengen torjunta', 'block-out': 'torjunnasta ulos', 'tip': 'kärki',
  'long rally': 'pitkä pallo', 'attack error': 'hyökkäysvirhe', 'net fault': 'verkkovirhe',
  'rotation fault': 'kiertovirhe', 'positional fault': 'paikkavirhe', 'timeout': 'aikalisä', 'substitution': 'vaihto',
}

/** Extra search phrases per tag (normalised: lowercase, no hyphens). */
const TAG_SYNONYMS: Record<string, string[]> = {
  'three-person block': ['three person block', 'three man block', '3 man block', '3 block', '3-block', 'triple block',
    'kolmoispari', 'kolmoistorjunta', 'kolmen hengen torjunta', 'kolmen torjunta', 'monster block'],
  'two-person block': ['two person block', 'two man block', '2 block', 'double block', 'kaksoistorjunta', 'kahden hengen torjunta', 'pari'],
  'block point': ['block', 'stuff', 'torjunta', 'torjuntapiste'],
  'ace': ['ässä', 'assa'], 'kill': ['hyökkäyspiste', 'smash', 'spike', 'lyönti'],
  'serve error': ['syöttövirhe'], 'attack error': ['hyökkäysvirhe'], 'timeout': ['aikalisä'], 'substitution': ['vaihto'],
}

export function norm(q: string): string {
  return q.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Tags whose name, Finnish label or synonym matches the query. */
export function tagsForQuery(q: string): string[] {
  const n = norm(q)
  if (!n) return []
  return Object.keys(TAG_LABEL).filter((t) => [t, TAG_LABEL[t], ...(TAG_SYNONYMS[t] ?? [])].some((x) => norm(x) === n || (n.length >= 4 && norm(x).includes(n))))
}

export function rallyMatches(r: AnalysisRally, q: string): boolean {
  const n = norm(q)
  if (!n) return true
  const tags = r.desc?.tags ?? []
  const wanted = tagsForQuery(q)
  if (wanted.some((t) => tags.includes(t))) return true
  if (wanted.length > 0) return false
  const hay = norm([r.score, r.desc?.text, r.finding?.text, r.note, ...tags, ...tags.map((t) => TAG_LABEL[t] ?? '')].filter(Boolean).join(' '))
  return hay.includes(n)
}
