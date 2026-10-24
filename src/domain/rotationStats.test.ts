import { describe, expect, it } from 'vitest'
import { pointsPerRotation, startingLineups } from './rotationStats'

const raw = {
  team_A_id: 'a', team_B_id: 'b', p1_start_team: 'b',
  events: [
    { code: 'pelipaikat', team: 'B', period: '1', description: '11=19,13=27,2=4,3=7,0=2,5=11,8=16' },
    { code: 'pelipaikat', team: 'A', period: '1', description: '1=5,8=16,11=33,12=34,14=41,3=8,0=4' },
    { code: 'piste', team: 'A', period: '1' }, // side-out: A -> R2
    { code: 'pelipaikat', team: 'A', period: '1', description: '8=16,11=33,12=34,14=41,3=8,1=5,0=4' },
    { code: 'piste', team: 'A', period: '1' },
    { code: 'piste', team: 'B', period: '1' }, // side-out: B -> R2
  ],
}

describe('rotation stats', () => {
  it('reads the first lineup of each set per team', () => {
    expect(startingLineups(raw)).toEqual([
      { period: 1, side: 'A', shirts: ['5', '16', '33', '34', '41', '8'], libero: '4' },
      { period: 1, side: 'B', shirts: ['19', '27', '4', '7', '2', '11'], libero: '16' },
    ])
  })
  it('counts points won and lost in each rotation', () => {
    const [set] = pointsPerRotation(raw)
    expect(set.lines).toEqual([
      { side: 'A', rotation: 1, won: 1, lost: 0 },
      { side: 'A', rotation: 2, won: 1, lost: 1 },
      { side: 'B', rotation: 1, won: 1, lost: 2 },
    ])
  })
  it('returns nothing without point events', () => {
    expect(pointsPerRotation({ events: [] })).toEqual([])
    expect(startingLineups({})).toEqual([])
  })
})
