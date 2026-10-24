import { describe, expect, it } from 'vitest'
import m816600 from './fixtures/match-816600.json'
import { courtNow, flowMd, rotationAnalysis, setFlows } from './gameFlow'

const pt = (team: string, a: number, b: number, t = '18:00:00', period = '1') => ({ code: 'piste', team, ps_A: a, ps_B: b, wall_time: t, period })
const raw = {
  team_A_id: 'h', team_B_id: 'v', p1_start_team: 'v',
  events: [
    { code: 'pelipaikat', team: 'A', period: '1', description: '1=5,2=16,3=33,4=34,5=41,6=8,7=4' },
    pt('A', 1, 0), { code: 'pelipaikat', team: 'A', period: '1', description: '1=16,2=33,3=34,4=41,5=8,6=5,7=4' },
    pt('A', 2, 0), pt('A', 3, 0), pt('B', 3, 1), pt('A', 4, 1),
  ],
}

describe('game flow', () => {
  it('timeline with server and runs', () => {
    const [f] = setFlows(raw)
    expect(f.points.map((p) => p.server)).toEqual(['B', 'A', 'A', 'A', 'B'])
    expect(f.runs).toEqual([{ side: 'A', length: 3, from: '0–0', to: '3–0' }])
    expect(f.longest).toEqual({ A: 3, B: 1 })
  })
  it('court now = latest pelipaikat', () => {
    expect(courtNow(raw)).toEqual([{ side: 'A', period: 1, shirts: ['16', '33', '34', '41', '8', '5'], libero: '4', time: '', score: '1–0' }])
  })
  it('rotation analysis strong/weak', () => {
    const a = rotationAnalysis([raw], 'h', 1)!
    expect(a.games).toBe(1)
    expect(a.lines.find((l) => l.rotation === 2)).toEqual({ rotation: 2, won: 3, lost: 1, net: 2 })
    expect(a.strong[0].rotation).toBe(2)
    expect(rotationAnalysis([raw], 'zzz')).toBeNull()
  })
  it('md explicit when missing', () => {
    expect(flowMd({ events: [] }, 'K', 'V').join('\n')).toContain('ei tietoa')
  })
  it('real EsIsku–Keika 18.10', () => {
    const m = m816600 as Record<string, unknown> & { team_A_id: string }
    const flows = setFlows(m)
    expect(flows.length).toBe(3)
    expect(flows[0].points[0]).toMatchObject({ a: 1, b: 0, winner: 'A', server: 'B', time: '18:02:41' })
    expect(courtNow(m)).toHaveLength(2)
    expect(rotationAnalysis([m], m.team_A_id)!.lines).toHaveLength(6)
  })
})
