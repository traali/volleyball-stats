import { describe, expect, it } from 'vitest'
import m from './fixtures/match-816600.json'
import { insightsMd, liveFindings, pregameInsights, sideOut, winLikelihood, type TeamFacts } from './insights'

const season = (won: number, lost: number, sf: number, sa: number, bf: number, ba: number) => ({ teamId: 'x', name: 'x', standing: 1, played: won + lost, won, lost, points: won * 3, setsFor: sf, setsAgainst: sa, ballsFor: bf, ballsAgainst: ba })
const t = (id: string, s: ReturnType<typeof season> | null, wins: boolean[]): TeamFacts => ({ id, name: id, season: s, roster: null, recent: wins.map((w, i) => ({ id: `${i}`, date: '', opponent: 'o', home: true, setsFor: w ? 3 : 0, setsAgainst: w ? 0 : 3, won: w })) })

describe('insights', () => {
  it('stronger team gets higher likelihood, basis listed', () => {
    const l = winLikelihood(t('A', season(4, 0, 12, 2, 300, 220), [true, true]), t('B', season(0, 4, 2, 12, 220, 300), [false]))!
    expect(l.home).toBeGreaterThan(0.8)
    expect(l.basis.join(' ')).toContain('voitto-%')
    expect(winLikelihood(t('A', null, []), t('B', null, []))).toBeNull()
  })
  it('pregame lines say ei tietoa when missing', () => {
    expect(pregameInsights(t('A', null, []), t('B', null, [])).join(' ')).toContain('ei tietoa')
  })
  it('side-out and findings on real 18.10 match', () => {
    const so = sideOut([m], (m as { team_A_id: string }).team_A_id)
    expect(so.total).toBeGreaterThan(20)
    const f = liveFindings(m, [{ id: (m as { team_A_id: string }).team_A_id, name: 'EsIsku', roster: null, games: [m, { ...m, match_id: 'other' }] }])
    expect(f.some((x) => x.text.includes('side-out') && x.holds)).toBe(true)
    expect(insightsMd(null, f).join('\n')).toContain('Pysyy')
    expect(insightsMd(null, []).join('\n')).toContain('ei tietoa')
  })
})

describe('Pysyy/Poikkeaa sample size', () => {
  it('marks alustava under 3 baseline games', async () => {
    const { insightsMd: md } = await import('./insights')
    expect(md(null, [], 1).join('\n')).toContain('perustuu 1 otteluun, alustava')
    expect(md(null, [], 4).join('\n')).not.toContain('alustava')
  })
})
