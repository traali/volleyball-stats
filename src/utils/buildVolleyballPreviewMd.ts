import type { VolleyballMatchDetail, VolleyballPlayerStat, VolleyballStandingRow } from '../types/volleyball'
import { pointsPerRotation, startingLineups } from '../domain/rotationStats'
import type { RosterPlayer, TeamSeason } from '../domain/preview'

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
      ...(r.players.length ? r.players.map((p) => `- ${p.number ? `#${p.number} ` : ''}${p.name} · ${p.points == null ? 'ei kauden tilastoa' : `${p.points}p / ${p.matches} ott`}${p.inLineup ? '' : ' (ei kokoonpanossa)'}`) : ['_ei tietoa_']),
      '',
    ]),
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
