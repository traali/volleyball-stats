import { describe, expect, it } from 'vitest'
import m816600 from './fixtures/match-816600.json'
import { analysisMd, basedOn, playerRotations, playerRotationText, courtNow, flowMd, matchupMd, rotationAnalysis, setFlows, hotPlayers, serveStats, matchups, playerMatchStats } from './gameFlow'

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
    expect(f.runs).toMatchObject([{ side: 'A', length: 3, from: '0–0', to: '3–0', rotation: 2 }])
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

describe('serve / hot / annotated runs', () => {
  const raw = m816600 as unknown as Record<string, unknown>
  it('serve stats are consistent with rallies', () => {
    const a = serveStats([raw], String(raw.team_A_id))
    const b = serveStats([raw], String(raw.team_B_id))
    const total = setFlows(raw).reduce((n, f) => n + f.points.filter((p) => p.server).length, 0)
    expect(a.length).toBeGreaterThan(3)
    expect(a.concat(b).reduce((n, x) => n + x.serves, 0)).toBeLessThanOrEqual(total)
    for (const x of a) { expect(x.won).toBeLessThanOrEqual(x.serves); expect(x.aces).toBeLessThanOrEqual(x.won) }
  })
  it('runs carry rotation and servers', () => {
    const r = setFlows(raw).flatMap((f) => f.runs)
    expect(r.length).toBeGreaterThan(0)
    for (const x of r) expect(x.rotation).toBeGreaterThanOrEqual(1)
    expect(r.some((x) => x.servers.length > 0)).toBe(true)
  })
  it('hot players over last rallies', () => {
    const h = hotPlayers(raw, String(raw.team_B_id), [])
    expect(h.length).toBeGreaterThan(0)
    expect(h[0].window).toBe(20)
  })
})

describe('matchups', () => {
  const raw = m816600 as unknown as Record<string, unknown>
  it('pairs strong vs weak and labels live', () => {
    const teams = [{ id: String(raw.team_A_id), name: 'A', games: [raw] }, { id: String(raw.team_B_id), name: 'B', games: [raw] }]
    const pre = matchups(teams, null)
    expect(pre).toHaveLength(2)
    expect(pre[0].lines.every((l) => l.status === null)).toBe(true)
    const live = matchups(teams.map((t) => ({ ...t, games: [{ ...raw, match_id: 'x' }] })), raw)
    expect(live[0].lines.some((l) => l.status === 'pysyy')).toBe(true)
  })
})

describe('playerMatchStats matches official Tilastot (816600)', () => {
  it('P/Ä/HY/TO exact, BP for most', () => {
    const rows = playerMatchStats(m816600 as unknown as Record<string, unknown>)
    const g = (side: string, shirt: string) => rows.find((r) => r.side === side && r.shirt === shirt)!
    expect(g('B', '27')).toMatchObject({ p: 19, aces: 2, attack: 17, block: 0 })
    expect(g('A', '16')).toMatchObject({ p: 8, aces: 1, attack: 7, block: 0 })
    expect(g('A', '8')).toMatchObject({ p: 4, bp: 1, aces: 1, attack: 2, block: 1 })
    expect(g('B', '3')).toMatchObject({ p: 7, bp: 4, aces: 1, attack: 5, block: 1 })
    expect(g('A', '41')).toMatchObject({ p: 6, bp: 2, aces: 0, attack: 6, block: 0 })
  })
})

describe('baseline honesty (816603 bug: kierto 6 -2 labelled vahva)', () => {
  const raw = m816600 as unknown as Record<string, unknown>
  it('Vahvat only net > 0, Haastavat only net < 0', () => {
    for (const id of [String(raw.team_A_id), String(raw.team_B_id)]) {
      const a = rotationAnalysis([raw], id, 6)!
      expect(a.strong.every((r) => r.net > 0)).toBe(true)
      expect(a.weak.every((r) => r.net < 0)).toBe(true)
    }
  })
  it('all-negative team has no Vahvat', () => {
    const lose = { team_A_id: 'h', team_B_id: 'v', p1_start_team: 'h', events: [{ code: 'pelipaikat', team: 'A', period: '1', description: '1=1,2=2,3=3,4=4,5=5,6=6' }, { code: 'piste', team: 'B', ps_A: 0, ps_B: 1, period: '1' }, { code: 'piste', team: 'B', ps_A: 0, ps_B: 2, period: '1' }] }
    const a = rotationAnalysis([lose], 'h')!
    expect(a.strong).toEqual([])
    expect(a.weak.length).toBeGreaterThan(0)
    expect(analysisMd('X', a).join('\n')).toContain('ei yhtään plussalla')
  })
  it('sample size shown and <3 games is alustava', () => {
    expect(basedOn(1)).toBe('perustuu 1 otteluun')
    const teams = [{ id: String(raw.team_A_id), name: 'A', games: [raw] }, { id: String(raw.team_B_id), name: 'B', games: [raw, { ...raw, match_id: 'y' }, { ...raw, match_id: 'z' }] }]
    const m = matchups(teams, null)
    expect(m[0].games).toEqual([1, 3])
    expect(m[0].preliminary).toBe(true)
    expect(matchupMd(m).join('\n')).toContain('perustuu 1 otteluun')
    const full = matchups(teams.map((t) => ({ ...t, games: [raw, { ...raw, match_id: 'y' }, { ...raw, match_id: 'z' }] })), null)
    expect(full.every((x) => !x.preliminary)).toBe(true)
  })
})

describe('playerRotations (on-court +/- per team rotation)', () => {
  it('counts rallies for the 6 on court, best only >0, worst only <0', () => {
    const r = playerRotations([raw], 'h')
    const p5 = r.find((x) => x.shirt === '5')!
    expect(p5.cells.find((c) => c.rotation === 1)).toMatchObject({ won: 1, lost: 0 })
    expect(p5.cells.find((c) => c.rotation === 2)).toMatchObject({ won: 3, lost: 1, net: 2 })
    expect(p5.best!.rotation).toBe(2)
    expect(p5.worst).toBeNull()
    expect(r.find((x) => x.shirt === '4')).toBeUndefined() // libero excluded
    expect(playerRotationText(p5)).toBe('Paras: K2 +2 (4 r., alustava) / Heikoin: –')
  })
  it('real 816600: every player cell sums to team rallies, aggregates over games', () => {
    const m = m816600 as unknown as Record<string, unknown>
    const one = playerRotations([m], String(m.team_A_id))
    expect(one.length).toBeGreaterThanOrEqual(6)
    for (const l of one) { if (l.best) expect(l.best.net).toBeGreaterThan(0); if (l.worst) expect(l.worst.net).toBeLessThan(0) }
    const two = playerRotations([m, { ...m, match_id: 'z' }], String(m.team_A_id))
    expect(two[0].rallies).toBe(one.find((x) => x.shirt === two[0].shirt)!.rallies * 2)
    expect(two[0].games).toBe(2)
  })
})
