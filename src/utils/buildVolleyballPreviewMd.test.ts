import { describe, expect, it } from 'vitest'
import { buildVolleyballPreviewMd, previousGameMd } from './buildVolleyballPreviewMd'
import type { VolleyballMatchDetail } from '../types/volleyball'

const game = {
  date: '2026-10-18', team_A_id: 'a', team_B_id: 'b', team_A_name: 'EsIsku/M1', team_B_name: 'Keika', fs_A: '0', fs_B: '3',
  p1s_A: '18', p1s_B: '25', p1_start_team: 'b',
  lineups: [{ team_id: 'a', shirt_number: '5', player_name: 'Korpela Aleksi' }],
  events: [
    { code: 'pelipaikat', team: 'A', period: '1', description: '1=5,8=16,11=33,12=34,14=41,3=8,0=4' },
    { code: 'piste', team: 'A', period: '1' },
    { code: 'piste', team: 'B', period: '1' },
  ],
}

describe('preview md', () => {
  it('writes set points, starting lineups and points per rotation', () => {
    const md = previousGameMd(game)
    expect(md).toContain('Erät: 18–25')
    expect(md).toContain('1. erä EsIsku/M1: #5 Korpela Aleksi, #16')
    expect(md).toContain('1. erä EsIsku/M1: R1 1–0, R2 0–1')
    expect(md).toContain('1. erä Keika: R1 1–1')
  })
  it('says explicitly when TASO has no rotation or point data', () => {
    const md = previousGameMd({ ...game, events: [] })
    expect(md).toContain('ei rotaatiotietoa TASOssa')
    expect(md).toContain('ei pisteittäistä tapahtumadataa TASOssa')
  })
  it('includes previous games per team in the export', () => {
    const match = { id: '1', homeTeamName: 'HSC', awayTeamName: 'EsIsku/M1', sets: [], status: 'upcoming' } as unknown as VolleyballMatchDetail
    const md = buildVolleyballPreviewMd({ match, previousGames: [{ team: 'HSC', games: [] }, { team: 'EsIsku/M1', games: [game] }] })
    expect(md).toContain('## Aiemmat ottelut: HSC')
    expect(md).toContain('_ei pelattuja otteluita tällä kaudella_')
    expect(md).toContain('### 2026-10-18 EsIsku/M1 – Keika 0–3')
  })
})
