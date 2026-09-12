import type { VolleyballMatchDetail, VolleyballPlayerStat, VolleyballStandingRow } from '../types/volleyball'

export function buildVolleyballPreviewMd(opts: {
  match: VolleyballMatchDetail
  standings?: VolleyballStandingRow[]
  players?: VolleyballPlayerStat[]
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
    m.status === 'upcoming' ? 'Vaihe: ennakko' : `Erät: ${m.setsWonHome}–${m.setsWonAway}`,
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
    '1. Ennakko tai eräanalyysi (25 pisteen erät, 5. erä 15).',
    '2. Avainpelaajat rooleittain (passari, hakkuri, libero) vain jos nimet on dokumentissa.',
    '3. Ennuste: 3–0 / 3–1 / 3–2 molempiin suuntiin.',
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
