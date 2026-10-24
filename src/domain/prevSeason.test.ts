import { describe, expect, it } from 'vitest'
import { clubHeadToHead, previousSeasonId, seasonFromPlayer } from './preview'
import { buildVolleyballPreviewMd } from '../utils/buildVolleyballPreviewMd'

const g = (o: Record<string, string>) => ({ season_id: '2025-26', status: 'Played', not_participated: '0', team_name: 'EsIsku/M1', category_name: 'Miehet aluesarja', player_points: '5', ...o })

describe('previous season', () => {
  it('derives previous season id', () => {
    expect(previousSeasonId('2026-27')).toBe('2025-26')
    expect(previousSeasonId('2000-01')).toBe('1999-00')
    expect(previousSeasonId('x')).toBe('')
  })
  it('sums played games of that season only', () => {
    const p = { matches: [g({ match_id: '1', player_points: '11' }), g({ match_id: '2' }), g({ match_id: '3', not_participated: '1' }), g({ match_id: '4', season_id: '2024-25' }), g({ match_id: '5', status: 'Fixture' })] }
    expect(seasonFromPlayer(p, '2025-26')).toEqual({ season: '2025-26', matches: 2, points: 16, teams: 'EsIsku/M1', categories: 'Miehet aluesarja' })
    expect(seasonFromPlayer(p, '2023-24')).toBeNull()
    expect(seasonFromPlayer(null, '2025-26')).toBeNull()
  })
  it('finds club-vs-club games and dedupes', () => {
    const m = g({ match_id: '9', club_A_id: '1', club_B_id: '2', team_A_id: '10', team_B_id: '20', team_A_name: 'A', team_B_name: 'B', fs_A: '3', fs_B: '1', date: '2025-11-01' })
    const other = g({ match_id: '8', club_A_id: '1', club_B_id: '3' })
    expect(clubHeadToHead([{ matches: [m, other] }, { matches: [m] }], '2025-26', '1', '2')).toHaveLength(1)
    expect(clubHeadToHead([{ matches: [other] }], '2025-26', '1', '2')).toEqual([])
  })
  it('md shows previous season and missing note', () => {
    const base = { id: '1', name: 'Arto Oinonen', number: '38', matches: null, points: null, inLineup: true }
    const md = buildVolleyballPreviewMd({
      match: { id: '1', homeTeamName: 'HSC', awayTeamName: 'EsIsku/M1', sets: [], status: 'upcoming' } as never,
      h2hPrev: { season: '2025-26', games: [] },
      rosters: [{ team: 'EsIsku', lineupPublished: false, players: [{ ...base, prev: { season: '2025-26', matches: 13, points: 80, teams: 'EsIsku/M1', categories: 'Miehet aluesarja' } }, { ...base, id: '2', name: 'Uusi', prev: null }] }],
    })
    expect(md).toContain('ei kauden tilastoa · 2025-26: 80p / 13 ott (EsIsku/M1; Miehet aluesarja)')
    expect(md).toContain('edellinen kausi: ei tietoa')
    expect(md).toContain('Keskinäiset ottelut kaudella 2025-26')
    expect(md).toContain('seurat eivät kohdanneet')
  })
})
