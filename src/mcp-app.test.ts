import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getVolleyballMatchTool, getVolleyballSetsTool, getVolleyballStandingsTool } from './mcp-app'

vi.mock('./services/discovery', () => ({
  fetchGroup: vi.fn(),
  fetchMatchRaw: vi.fn(),
  fetchPlayer: vi.fn(),
  searchDiscovery: vi.fn(),
}))

import { fetchGroup, fetchMatchRaw } from './services/discovery'

describe('volleyball WebMCP', () => {
  beforeEach(() => {
    vi.mocked(fetchGroup).mockReset()
    vi.mocked(fetchMatchRaw).mockReset()
  })

  it('refuses a standings table when the group is unknown', async () => {
    const result = await getVolleyballStandingsTool({})
    const body = JSON.stringify(result)
    expect(body).toContain('ei keksitä')
    expect(body).not.toContain('PuMa')
    expect(fetchGroup).not.toHaveBeenCalled()
  })

  it('returns the TASO group table and nothing invented', async () => {
    vi.mocked(fetchGroup).mockResolvedValue({
      name: 'Lohko A',
      competition: 'Nuoret',
      category: 'Tytöt',
      teams: [{ current_standing: '1', team_id: '9', team_name: 'Testiseura', matches_played: '2', points: '6' }],
      matches: [],
    })
    const result = await getVolleyballStandingsTool({ competitionId: '1', categoryId: '2', groupId: '3' })
    expect(JSON.stringify(result)).toContain('Testiseura 6 p')
    expect(JSON.stringify(result)).not.toContain('PuMa')
  })

  it('does not invent set scores from team names', async () => {
    const result = await getVolleyballSetsTool({ homeTeam: 'PuMa', awayTeam: 'LP Viesti' })
    expect(JSON.stringify(result)).toContain('not invented')
    expect(fetchMatchRaw).not.toHaveBeenCalled()
  })

  it('returns set lines from the match payload', async () => {
    vi.mocked(fetchMatchRaw).mockResolvedValue({
      team_A_name: 'Koti',
      team_B_name: 'Vieras',
      fs_A: '3',
      fs_B: '1',
      p1s_A: '25',
      p1s_B: '20',
      date: '2026-10-04',
      time: '12:00',
    })
    const result = await getVolleyballMatchTool({ matchId: '55' })
    expect(JSON.stringify(result)).toContain('1. erä 25–20')
    expect(JSON.stringify(result)).toContain('3–1')
  })
})
