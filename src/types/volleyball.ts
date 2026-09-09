/**
 * Authentic Volleyball Types (Suomen Lentopalloliitto / Torneopal)
 * Grounded strictly in real match sheets and FIVB junior competition rules.
 */

export interface VolleyballSet {
  number: number
  homeScore: number
  awayScore: number
  duration?: string
  isDeuce?: boolean
  status: 'finished' | 'in_progress' | 'unplayed'
}

export interface VolleyballMatchDetail {
  id: string
  tournamentName: string
  categoryName: string
  courtName?: string
  scheduledTime: string
  venue: string
  homeTeamName: string
  awayTeamName: string
  homeTeamId: string
  awayTeamId: string
  setsWonHome: number
  setsWonAway: number
  sets: VolleyballSet[]
  totalPointsHome: number
  totalPointsAway: number
  status: 'upcoming' | 'live' | 'completed'
  referee?: string
}

export interface VolleyballStandingRow {
  rank: number
  teamId: string
  teamName: string
  matchesPlayed: number
  wins: number
  winsTiebreak: number // 3-2 wins (2 pts)
  lossesTiebreak: number // 2-3 losses (1 pt)
  losses: number // 0-3, 1-3 losses (0 pts)
  setsWon: number
  setsLost: number
  setQuotient: number // setsWon / setsLost
  pointsWon: number
  pointsLost: number
  pointQuotient: number // pointsWon / pointsLost
  totalPoints: number
  form: ('W' | 'L')[]
}

export interface VolleyballPlayerStat {
  id: string
  jersey: number
  name: string
  role: 'Passari' | 'Hakkuri' | 'Yleispelaaja' | 'Keskitorjuja' | 'Libero'
  matchesPlayed: number
  setsPlayed: number
  pointsTotal: number
  attackPoints?: number
  blockPoints?: number
  acePoints?: number
}

export interface VolleyballTeamFixture {
  id: string
  date: string
  time: string
  court?: string
  homeTeam: string
  awayTeam: string
  score?: string
  status: 'completed' | 'upcoming'
  isHome: boolean
}

export interface CustomVolleyballTeam {
  id: string
  name: string
  tournamentOrCategory: string
  addedAt: string
}
