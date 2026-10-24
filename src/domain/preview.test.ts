import { describe, expect, it } from 'vitest'
import { headToHead, lineupPublished, recentGames, rosterWithStats, teamSeason } from './preview'

const team = [
  { player_id: '1', first_name: 'Arto', last_name: 'Oinonen', shirt_number: '38' },
  { player_id: '2', first_name: 'Aatu', last_name: 'Mattila', shirt_number: '4' },
  { player_id: '3', first_name: 'Aleksi', last_name: 'Korpela', shirt_number: '5' },
]
const stats = [
  { player_id: '2', team_id: 'B', matches: '1', points: '0' },
  { player_id: '3', team_id: 'B', matches: '2', points: '18' },
]

describe('rosterWithStats', () => {
  it('shows whole roster normally before the lineup is published', () => {
    const r = rosterWithStats({ lineups_published: 0, lineups: [] }, 'B', team, stats)
    expect(r.every((p) => p.inLineup)).toBe(true)
    expect(r[0].name).toBe('Aleksi Korpela')
    expect(r.find((p) => p.id === '1')?.points).toBeNull()
  })
  it('greys out and sorts last players not in a published lineup', () => {
    const match = { lineups_published: 1, lineups: [{ team_id: 'B', player_id: '1' }, { team_id: 'B', player_id: '3' }, { team_id: 'A', player_id: '9' }] }
    expect(lineupPublished(match)).toBe(true)
    const r = rosterWithStats(match, 'B', team, stats)
    expect(r.map((p) => [p.id, p.inLineup])).toEqual([['3', true], ['1', true], ['2', false]])
  })
})

const games = [
  { match_id: '10', date: '2026-10-10', status: 'Played', team_A_id: 'X', team_A_name: 'Mrija', team_B_id: 'B', team_B_name: 'EsIsku', fs_A: '1', fs_B: '3' },
  { match_id: '11', date: '2026-10-18', status: 'Played', team_A_id: 'B', team_A_name: 'EsIsku', team_B_id: 'K', team_B_name: 'Keika', fs_A: '0', fs_B: '3' },
  { match_id: '12', date: '2026-10-24', status: 'Fixture', team_A_id: 'A', team_A_name: 'HSC', team_B_id: 'B', team_B_name: 'EsIsku', fs_A: '', fs_B: '' },
]

describe('games', () => {
  it('lists played games newest first from the team side', () => {
    expect(recentGames(games, 'B', '12')).toEqual([
      { id: '11', date: '2026-10-18', opponent: 'Keika', home: true, setsFor: 0, setsAgainst: 3, won: false },
      { id: '10', date: '2026-10-10', opponent: 'Mrija', home: false, setsFor: 3, setsAgainst: 1, won: true },
    ])
  })
  it('head-to-head is empty when the teams have not played', () => {
    expect(headToHead(games, 'A', 'B', '12')).toEqual([])
    expect(headToHead(games, 'B', 'X')).toHaveLength(1)
  })
  it('reads team season numbers', () => {
    expect(teamSeason({ team_id: 'B', team_name: 'EsIsku', current_standing: 4, matches_played: 2, matches_won: 1, matches_lost: 1, points: 3, goals_for: 3, goals_against: 4, period_points_for: 152, period_points_against: 158 }))
      .toMatchObject({ standing: 4, setsFor: 3, ballsAgainst: 158 })
  })
})
