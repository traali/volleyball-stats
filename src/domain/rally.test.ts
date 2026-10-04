import { describe, expect, it } from 'vitest'
import { pointsFromEvents, resultIsTrusted, rotationsFromMatch, setsFromMatch } from './rally'

const raw = {
  team_A_id: '1',
  team_B_id: '2',
  p1s_A: '25',
  p1s_B: '21',
  p1_start_time: '10:00:01',
  p1_end_time: '10:24:10',
  p2s_A: '',
  p2s_B: '',
  lineups: [{ team_id: '1', shirt_number: '7', player_name: 'Aada Korhonen' }],
  playing_positions_A: { '1': ['7', '4', '10', '12', '2', '9', '3', ''] },
  playing_positions_B: { '1': [] },
  events: [
    { code: 'piste', period: '1', wall_time: '10:02:11', description: '1-0', player_name: 'Aada Korhonen', shirt_number: '7', team_id: '1' },
    { code: 'vaihto', period: '1', wall_time: '10:03:00', description: 'x' },
    { code: 'pelipaikat', period: '1' },
  ],
}

describe('rally tape', () => {
  it('keeps only piste rows and their wall clock', () => {
    const points = pointsFromEvents(raw.events)
    expect(points).toHaveLength(1)
    expect(points[0].wallTime).toBe('10:02:11')
    expect(points[0].score).toBe('1-0')
  })

  it('does not invent a set that has no score', () => {
    const sets = setsFromMatch(raw)
    expect(sets.map((s) => s.number)).toEqual([1])
    expect(sets[0].start).toBe('10:00:01')
  })

  it('names the six court shirts and drops an empty rotation', () => {
    const rot = rotationsFromMatch(raw)
    expect(rot).toHaveLength(1)
    expect(rot[0].names[0]).toBe('Aada Korhonen')
    expect(rot[0].shirts).toHaveLength(6)
  })
})

describe('resultIsTrusted', () => {
  it('does not trust a Played 0-0 with no set', () => {
    expect(resultIsTrusted({ status: '1', fs_A: '0', fs_B: '0', date: '2099-06-01', time: '18:00' })).toBe(false)
  })

  it('trusts a set that actually started', () => {
    expect(resultIsTrusted({ status: '1', fs_A: '3', fs_B: '1', p1s_A: '25', p1s_B: '18' })).toBe(true)
  })
})
