import { describe, expect, it } from 'vitest'
import m from './fixtures/match-816603.json'
import { coachView, nextRotationLine, pointGaps, tempo } from './coach'

const pt = (team: string, a: number, b: number, t: string) => ({ code: 'piste', team, ps_A: a, ps_B: b, wall_time: t, period: '1' })
const small = { team_A_id: 'h', team_B_id: 'v', p1_start_team: 'h', events: [pt('A', 1, 0, '18:00:00'), pt('B', 1, 1, '18:00:20'), { code: 'aikalisa', team: 'A', period: '1' }, pt('B', 1, 2, '18:01:30')] }

describe('coach view', () => {
  it('small sample is liian vähän; next rotation follows side-out', () => {
    const { teams } = coachView(small)
    expect(teams[1].current).toBe(2)
    expect(teams[0].lines.every((l) => l.label === 'liian vähän')).toBe(true)
    expect(nextRotationLine(teams[1], { lines: [{ rotation: 3, won: 5, lost: 4, net: 1 }], strong: [], weak: [], games: 3 })).toBe('Seuraava kierto K3: tänään ei vielä palloja, yleensä +1')
  })
  it('816603 counts every rally once per team with side-out/break', () => {
    const { teams } = coachView(m as never)
    const rallies = teams[0].lines.reduce((n, l) => n + l.rallies, 0)
    expect(rallies).toBe(teams[1].lines.reduce((n, l) => n + l.rallies, 0))
    for (const l of teams[0].lines) expect(l.sideOutN + l.breakN).toBe(l.rallies)
    expect(teams[0].lines.find((l) => l.rotation === 2)?.label).toBe('Vahva')
    expect(teams[0].lines.find((l) => l.rotation === 4)?.label).toBe('tasainen') // 19–18
  })
  it('gaps: seconds, timeout flagged, tempo from real game', () => {
    expect(pointGaps(small).map((g) => [g.sec, g.afterTimeout])).toEqual([[20, false], [70, true]])
    const t = tempo(m as never)!
    expect(t.n).toBe(207)
    expect(t.median).toBe(25)
    expect(t.breaks.filter((b) => b.afterTimeout).length).toBeGreaterThan(10)
    expect(tempo(small)).toBeNull()
  })
})
