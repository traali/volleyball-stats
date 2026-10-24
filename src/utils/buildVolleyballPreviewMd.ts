import type { VolleyballMatchDetail, VolleyballPlayerStat, VolleyballStandingRow } from '../types/volleyball'
import { pointsPerRotation, startingLineups } from '../domain/rotationStats'
import { insightsMd, type Finding } from '../domain/insights'
import { analysisMd, flowMd, matchupMd, serveMd, serveStats, type Matchup, type RotationAnalysis } from '../domain/gameFlow'
import type { GameLine, LikelyRotation, RosterPlayer, TeamSeason } from '../domain/preview'

function gamesMd(p: RosterPlayer): string {
  if (!p.games) return ''
  if (!p.games.length) return '\n  - per ottelu: ei tietoa'
  return '\n  - per ottelu: ' + p.games.map((g) => `${g.date} vs ${g.opponent} ${g.points}p`).join('; ')
}

function rotationMd(team: string, r: LikelyRotation | null | undefined, players: RosterPlayer[], published: boolean): string[] {
  const head = `## Todennäköinen aloituskierto: ${team}`
  if (!r) return [head, '_ei tietoa: ei pelipaikkatietoja aiemmista otteluista_', '']
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI']
  const name = (x: string) => { const p = players.find((q) => q.number === x); const rep = r.replaced?.find((y) => y.in === x); return `#${x} ${p?.name || '?'}${rep ? ` (korvaa #${rep.out})` : ''}${r.source !== 'actual' && published && (!p || !p.inLineup) ? ' (ei kokoonpanossa)' : ''}` }
  return [head, r.source === 'actual' ? '_toteutunut 1. erän aloitus tämän ottelun pelipaikoista_' : `_sama 1. erän aloitus ${r.basedOn}/${r.games} ottelussa; ${r.source === 'lineup' ? 'vain tämän ottelun kokoonpanon pelaajat' : 'kokoonpanoa ei julkaistu, kaikki pelaajat'}_`, ...r.shirts.map((x, i) => `- ${roman[i]}: ${name(x)}`), `- Libero: ${r.libero ? name(r.libero) : 'ei tietoa'}`, '']
}

function prevMd(p: RosterPlayer): string {
  if (p.prev === undefined) return ''
  if (p.prev === null) return ' · edellinen kausi: ei tietoa'
  return ` · ${p.prev.season}: ${p.prev.points}p / ${p.prev.matches} ott (${p.prev.teams}; ${p.prev.categories})`
}

type Row = Record<string, unknown>
const str = (v: unknown) => (v == null ? '' : String(v).trim())

/** One previous game: set points, starting lineups per set, points per rotation — or an explicit "not in TASO" line. */
export function previousGameMd(raw: Row): string {
  const A = str(raw.team_A_name)
  const B = str(raw.team_B_name)
  const names = new Map<string, string>()
  for (const l of (Array.isArray(raw.lineups) ? raw.lineups : []) as Row[]) names.set(`${str(l.team_id)}#${str(l.shirt_number)}`, str(l.player_name))
  const who = (side: 'A' | 'B', shirt: string) => {
    const n = names.get(`${str(side === 'A' ? raw.team_A_id : raw.team_B_id)}#${shirt}`)
    return n ? `#${shirt} ${n}` : `#${shirt}`
  }
  const out = [`### ${str(raw.date).slice(0, 10)} ${A} – ${B} ${str(raw.fs_A)}–${str(raw.fs_B)}`]
  const sets: string[] = []
  for (let i = 1; i <= 5; i++) {
    const a = str(raw[`p${i}s_A`])
    const b = str(raw[`p${i}s_B`])
    if (a || b) sets.push(`${a}–${b}`)
  }
  out.push(sets.length ? `Erät: ${sets.join(', ')}` : 'Erät: ei erätuloksia TASOssa')
  const starts = startingLineups(raw)
  out.push('Aloituskokoonpanot (paikat I–VI, L = libero):')
  if (!starts.length) out.push('- ei rotaatiotietoa TASOssa tälle ottelulle')
  for (const st of starts) out.push(`- ${st.period}. erä ${st.side === 'A' ? A : B}: ${st.shirts.map((x) => who(st.side, x)).join(', ')}${st.libero ? ` · L ${who(st.side, st.libero)}` : ''}`)
  const rot = pointsPerRotation(raw)
  out.push('Pisteet rotaatioittain (voitetut–menetetyt, R1 = aloituskokoonpano):')
  if (!rot.length) out.push('- ei pisteittäistä tapahtumadataa TASOssa tälle ottelulle')
  for (const set of rot) {
    if (!set.lines.length) { out.push(`- ${set.period}. erä: aloittavaa syöttäjää ei kirjattu, rotaatioita ei voi laskea`); continue }
    for (const side of ['A', 'B'] as const) {
      const ls = set.lines.filter((l) => l.side === side)
      out.push(`- ${set.period}. erä ${side === 'A' ? A : B}: ${ls.map((l) => `R${l.rotation} ${l.won}–${l.lost}`).join(', ')}`)
    }
  }
  return out.join('\n')
}

export function buildVolleyballPreviewMd(opts: {
  match: VolleyballMatchDetail
  standings?: VolleyballStandingRow[]
  players?: VolleyballPlayerStat[]
  /** Each team's previous games (full getMatch rows), already fetched. */
  previousGames?: Array<{ team: string; games: Row[] }>
  rotations?: Array<{ team: string; rotation: LikelyRotation | null | undefined }>
  /** Full getMatch row: point timeline, court now, rotations of this match (live or played). */
  raw?: Row
  insights?: { pre: string[] | null; live: Finding[] | null }
  matchups?: Matchup[]
  /** Recent-games rotation analysis per team. */
  rotationStats?: Array<{ team: string; analysis: RotationAnalysis | null }>
  h2hPrev?: { season: string; games: GameLine[] }
  rosters?: Array<{ team: string; players: RosterPlayer[]; lineupPublished: boolean }>
  teamStats?: TeamSeason[]
}): string {
  const m = opts.match
  const sets = m.sets
    .map((s) => `Erä ${s.number}: ${s.homeScore}–${s.awayScore}${s.status !== 'finished' ? ` (${s.status})` : ''}${s.isDeuce ? ' deuce' : ''}`)
    .join('\n')
  const table = (opts.standings || [])
    .map(
      (r) =>
        `${r.rank}. ${r.teamName}  ${r.matchesPlayed}ott ${r.wins}V ${r.losses}H  erät ${r.setsWon}–${r.setsLost}  ${r.totalPoints}p`,
    )
    .join('\n')
  const players = (opts.players || []).length
    ? (opts.players || [])
        .map((p) => `- ${p.name} #${p.jersey} ${p.role} · ${p.pointsTotal}p${p.acePoints ? ` · ässät ${p.acePoints}` : ''}`)
        .join('\n')
    : '_ei pörssiä_'

  return [
    `# ${m.homeTeamName} vs ${m.awayTeamName}`,
    '',
    `${m.scheduledTime || ''} · ${m.venue || ''}${m.courtName ? ` · ${m.courtName}` : ''}`,
    `${m.tournamentName} · ${m.categoryName}`,
    m.status === 'upcoming'
      ? 'Vaihe: ennakko'
      : m.resultRecorded === false
        ? 'Erät: lopputulosta ei kirjattu'
        : `Erät: ${m.setsWonHome}–${m.setsWonAway}`,
    m.formatText ? `Pelimuoto: ${m.formatText}` : '',
    '',
    '## Erät',
    sets || '_ei eriä_',
    '',
    '## Sarjataulukko',
    table ? `\`\`\`\n${table}\n\`\`\`` : '_ei taulukkoa_',
    '',
    '## Pistepörssi',
    players,
    '',
    ...(opts.teamStats?.length ? ['## Joukkueiden kausi', ...opts.teamStats.map((x) => `- ${x.name}: ${x.standing}. sija · ${x.played} ott ${x.won}V ${x.lost}H · ${x.points}p · erät ${x.setsFor}–${x.setsAgainst} · pallot ${x.ballsFor}–${x.ballsAgainst}`), ''] : []),
    ...(opts.rosters || []).flatMap((r) => [
      `## Pelaajat: ${r.team}${r.lineupPublished ? ' (ottelun kokoonpano julkaistu; (ei kokoonpanossa) merkitty)' : ' (kokoonpanoa ei julkaistu, koko joukkue)'}`,
      ...(r.players.length ? r.players.map((p) => `- ${p.number ? `#${p.number} ` : ''}${p.name} · ${p.points == null ? 'ei kauden tilastoa' : `${p.points}p / ${p.matches} ott`}${prevMd(p)}${gamesMd(p)}${p.inLineup ? '' : ' (ei kokoonpanossa)'}`) : ['_ei tietoa_']),
      '',
    ]),
    ...(opts.insights ? insightsMd(opts.insights.pre, opts.insights.live) : []),
    ...(opts.matchups ? matchupMd(opts.matchups) : []),
    ...(opts.raw ? flowMd(opts.raw, m.homeTeamName, m.awayTeamName) : []),
    ...(opts.raw ? ['## Syötöt tässä ottelussa', ...serveMd(m.homeTeamName, serveStats([opts.raw], String(opts.raw.team_A_id))), ...serveMd(m.awayTeamName, serveStats([opts.raw], String(opts.raw.team_B_id)))] : []),
    ...(opts.rotationStats?.length ? ['## Kierrot viimeisissä otteluissa', ...opts.rotationStats.flatMap((x) => analysisMd(x.team, x.analysis))] : []),
    ...(opts.rotations || []).flatMap((x) => { const r = opts.rosters?.find((y) => y.team === x.team); return rotationMd(x.team, x.rotation, r?.players || [], Boolean(r?.lineupPublished)) }),
    ...(opts.h2hPrev ? [`## Keskinäiset ottelut kaudella ${opts.h2hPrev.season}`, ...(opts.h2hPrev.games.length ? opts.h2hPrev.games.map((g) => `- ${g.date} ${g.home ? 'koti' : 'vieras'} vs ${g.opponent}: ${g.setsFor}–${g.setsAgainst}`) : ['_ei tietoa: seurat eivät kohdanneet_']), ''] : []),
    ...(opts.previousGames || []).flatMap((g) => [`## Aiemmat ottelut: ${g.team}`, ...(g.games.length ? g.games.map(previousGameMd) : ['_ei pelattuja otteluita tällä kaudella_']), '']),
    '## Prompt tekoälylle',
    '',
    'Kopioi tämä osio + yllä oleva data malliin. Vastaa suomeksi, valmentajalle, juniori lentopallo.',
    '',
    '```',
    'Olet juniorilentopallon otteluanalyytikko. Käytä VAIN tämän dokumentin lukuja. Älä keksi vastaanotto%, hyökkäys% tai scout-dataa. Jos tieto puuttuu, sano "ei datassa".',
    '',
    `Ottelu: ${m.homeTeamName} vs ${m.awayTeamName}.`,
    '',
    'Tee tämä rakenne:',
    `1. Ennakko tai eräanalyysi (${m.formatText || 'pelimuoto: katso erät yllä'}).`,
    '2. Avainpelaajat rooleittain (passari, hakkuri, libero) vain jos nimet on dokumentissa.',
    '3. Ennuste vain tämän pelimuodon mahdollisilla lopputuloksilla.',
    '4. Valmentajan 4 tekoa: vastaanotto, keskitorjunta, servevuoro, timeout erän lopussa.',
    '',
    'Sävy: asiallinen. Juniorit. Ei jalkapallon maaleja, ei salibandyn jäähyjä.',
    '```',
    '',
    `_Luotu volleyball-stats, ottelu ${m.id}_`,
  ]
    .filter((l) => l !== '')
    .join('\n')
}
