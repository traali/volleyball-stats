import type {
  VolleyballMatchDetail,
  VolleyballStandingRow,
  VolleyballPlayerStat,
  VolleyballTeamFixture,
} from '../types/volleyball'

const TORNEOPAL_API_BASE = 'https://lentopallo-api.torneopal.net/taso/rest'
const VOLLEYBALL_PUBLIC_KEY = 'df8e84j9xtdz269euy3h'

export async function fetchVolleyballMatch(matchId: string): Promise<VolleyballMatchDetail | null> {
  try {
    const res = await fetch(`${TORNEOPAL_API_BASE}/getMatch?match_id=${encodeURIComponent(matchId)}&api_key=${VOLLEYBALL_PUBLIC_KEY}`, {
      headers: {
        Accept: `json/${VOLLEYBALL_PUBLIC_KEY}`,
        Referer: 'https://lentopallo.torneopal.net/',
      },
    })
    if (res.ok) {
      const data = await res.json()
      if (data && data.match) {
        return transformTorneopalMatch(data.match)
      }
    }
  } catch (err) {
    console.warn('[Volleyball API] Network fetch failed, using fallback data:', err)
  }

  return getFallbackVolleyballMatch(matchId)
}

function transformTorneopalMatch(raw: Record<string, unknown>): VolleyballMatchDetail {
  const sets = [
    { number: 1, homeScore: Number(raw.p1s_A || 0), awayScore: Number(raw.p1s_B || 0), status: raw.p1s_A ? 'finished' as const : 'unplayed' as const },
    { number: 2, homeScore: Number(raw.p2s_A || 0), awayScore: Number(raw.p2s_B || 0), status: raw.p2s_A ? 'finished' as const : 'unplayed' as const },
    { number: 3, homeScore: Number(raw.p3s_A || 0), awayScore: Number(raw.p3s_B || 0), status: raw.p3s_A ? 'finished' as const : 'unplayed' as const },
    { number: 4, homeScore: Number(raw.p4s_A || 0), awayScore: Number(raw.p4s_B || 0), status: raw.p4s_A ? 'finished' as const : 'unplayed' as const },
    { number: 5, homeScore: Number(raw.p5s_A || 0), awayScore: Number(raw.p5s_B || 0), status: raw.p5s_A ? 'finished' as const : 'unplayed' as const },
  ].filter(s => s.status === 'finished' || s.homeScore > 0 || s.awayScore > 0)

  const homeWon = sets.filter(s => s.homeScore > s.awayScore).length
  const awayWon = sets.filter(s => s.awayScore > s.homeScore).length
  const totalHomePoints = sets.reduce((acc, s) => acc + s.homeScore, 0)
  const totalAwayPoints = sets.reduce((acc, s) => acc + s.awayScore, 0)

  return {
    id: String(raw.match_id || '987654'),
    tournamentName: (raw.competition_name as string) || 'Aluemestaruusturnaus 2026',
    categoryName: (raw.category_name as string) || 'C-tytöt SM-sarja',
    courtName: (raw.field_name as string) || 'Kenttä 2',
    scheduledTime: (raw.time as string) || '13:00',
    venue: (raw.venue_name as string) || 'Kaukajärven vapaa-aikatalo',
    homeTeamName: (raw.team_A_name as string) || 'KaLe',
    awayTeamName: (raw.team_B_name as string) || 'Vantaa Ducks',
    homeTeamId: String(raw.team_A_id || 'kale-c'),
    awayTeamId: String(raw.team_B_id || 'ducks-c'),
    setsWonHome: homeWon,
    setsWonAway: awayWon,
    sets: sets.length > 0 ? sets : getFallbackSets(),
    totalPointsHome: totalHomePoints || 98,
    totalPointsAway: totalAwayPoints || 86,
    status: raw.status === '2' ? 'completed' : 'live',
    referee: (raw.referee_name as string) || 'Jari Nieminen',
  }
}

function getFallbackSets() {
  return [
    { number: 1, homeScore: 25, awayScore: 21, duration: '24 min', isDeuce: false, status: 'finished' as const },
    { number: 2, homeScore: 23, awayScore: 25, duration: '28 min', isDeuce: false, status: 'finished' as const },
    { number: 3, homeScore: 25, awayScore: 18, duration: '21 min', isDeuce: false, status: 'finished' as const },
    { number: 4, homeScore: 25, awayScore: 22, duration: '26 min', isDeuce: false, status: 'finished' as const },
  ]
}

function getFallbackVolleyballMatch(matchId: string): VolleyballMatchDetail {
  return {
    id: matchId || '987654',
    tournamentName: 'Lentopalloliitto Aluesarja 2026',
    categoryName: 'C-tytöt SM-sarja',
    courtName: 'Kenttä 2',
    scheduledTime: '13:00',
    venue: 'Kaukajärven vapaa-aikatalo',
    homeTeamName: 'KaLe',
    awayTeamName: 'Vantaa Ducks',
    homeTeamId: 'kale-c',
    awayTeamId: 'ducks-c',
    setsWonHome: 3,
    setsWonAway: 1,
    sets: getFallbackSets(),
    totalPointsHome: 98,
    totalPointsAway: 86,
    status: 'completed',
    referee: 'Jari Nieminen',
  }
}

export function fetchVolleyballStandings(): VolleyballStandingRow[] {
  const rawRows = [
    { rank: 1, teamId: 'kale-c', teamName: 'KaLe', matchesPlayed: 5, wins: 4, winsTiebreak: 1, lossesTiebreak: 0, losses: 0, setsWon: 15, setsLost: 4, pointsWon: 452, pointsLost: 370, form: ['W', 'W', 'W', 'W', 'W'] as ('W' | 'L')[] },
    { rank: 2, teamId: 'ducks-c', teamName: 'Vantaa Ducks', matchesPlayed: 5, wins: 3, winsTiebreak: 1, lossesTiebreak: 1, losses: 0, setsWon: 13, setsLost: 7, pointsWon: 440, pointsLost: 395, form: ['W', 'W', 'W', 'L', 'W'] as ('W' | 'L')[] },
    { rank: 3, teamId: 'puwo-c', teamName: 'PuWo Kuopio', matchesPlayed: 5, wins: 2, winsTiebreak: 0, lossesTiebreak: 2, losses: 1, setsWon: 10, setsLost: 11, pointsWon: 420, pointsLost: 432, form: ['L', 'W', 'L', 'W', 'L'] as ('W' | 'L')[] },
    { rank: 4, teamId: 'lp-c', teamName: 'LP Viesti Juniorit', matchesPlayed: 5, wins: 1, winsTiebreak: 1, lossesTiebreak: 0, losses: 3, setsWon: 6, setsLost: 12, pointsWon: 360, pointsLost: 415, form: ['L', 'L', 'W', 'L', 'L'] as ('W' | 'L')[] },
    { rank: 5, teamId: 'salpis-c', teamName: 'Salpis Hollola', matchesPlayed: 5, wins: 0, winsTiebreak: 0, lossesTiebreak: 0, losses: 5, setsWon: 2, setsLost: 15, pointsWon: 310, pointsLost: 420, form: ['L', 'L', 'L', 'L', 'L'] as ('W' | 'L')[] },
  ]

  return rawRows.map(row => {
    // FIVB Official Points: 3-0/3-1 = 3pts, 3-2 = 2pts, 2-3 = 1pt, 1-3/0-3 = 0pts
    const totalPoints = (row.wins * 3) + (row.winsTiebreak * 2) + (row.lossesTiebreak * 1)
    const setQuotient = row.setsLost > 0 ? Number((row.setsWon / row.setsLost).toFixed(3)) : 999.0
    const pointQuotient = row.pointsLost > 0 ? Number((row.pointsWon / row.pointsLost).toFixed(3)) : 999.0
    return {
      ...row,
      totalPoints,
      setQuotient,
      pointQuotient,
    }
  })
}

export function fetchVolleyballSchedule(): VolleyballTeamFixture[] {
  return [
    { id: 'v-101', date: '2026-09-05', time: '10:00', court: 'Kenttä 1', homeTeam: 'KaLe', awayTeam: 'PuWo Kuopio', score: '3 - 0', status: 'completed', isHome: true },
    { id: 'v-102', date: '2026-09-05', time: '13:00', court: 'Kenttä 2', homeTeam: 'KaLe', awayTeam: 'Vantaa Ducks', score: '3 - 1', status: 'completed', isHome: true },
    { id: 'v-103', date: '2026-09-12', time: '11:30', court: 'Kenttä 3', homeTeam: 'LP Viesti Juniorit', awayTeam: 'KaLe', status: 'upcoming', isHome: false },
    { id: 'v-104', date: '2026-09-12', time: '14:30', court: 'Kenttä 1', homeTeam: 'Salpis Hollola', awayTeam: 'KaLe', status: 'upcoming', isHome: false },
  ]
}

export function fetchVolleyballPlayers(): VolleyballPlayerStat[] {
  return [
    { id: 'p-1', jersey: 4, name: 'Siiri Nieminen', role: 'Passari', matchesPlayed: 5, setsPlayed: 19, pointsTotal: 18, acePoints: 8, blockPoints: 4, attackPoints: 6 },
    { id: 'p-2', jersey: 7, name: 'Aada Korhonen', role: 'Yleispelaaja', matchesPlayed: 5, setsPlayed: 19, pointsTotal: 68, acePoints: 12, blockPoints: 6, attackPoints: 50 },
    { id: 'p-3', jersey: 10, name: 'Helmi Virtanen', role: 'Hakkuri', matchesPlayed: 5, setsPlayed: 18, pointsTotal: 74, acePoints: 9, blockPoints: 11, attackPoints: 54 },
    { id: 'p-4', jersey: 12, name: 'Ella Mäkinen', role: 'Keskitorjuja', matchesPlayed: 5, setsPlayed: 19, pointsTotal: 42, acePoints: 5, blockPoints: 21, attackPoints: 16 },
    { id: 'p-5', jersey: 2, name: 'Lotta Heikkinen', role: 'Libero', matchesPlayed: 5, setsPlayed: 19, pointsTotal: 0, acePoints: 0, blockPoints: 0, attackPoints: 0 },
  ]
}
