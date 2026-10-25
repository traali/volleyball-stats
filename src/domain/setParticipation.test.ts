import { describe, expect, it } from 'vitest'
import m from './fixtures/match-816603.json'
import { playedSets, setParticipation, sumSets } from './setParticipation'

const raw = m as unknown as Record<string, unknown>
const by = (id: string) => setParticipation(raw).find((p) => p.playerId === id)!

describe('setParticipation (match 816603)', () => {
  it('counts five played sets', () => expect(playedSets(raw)).toEqual([1, 2, 3, 4, 5]))
  it('Arto #38 came on in sets 1 and 3 only; the rest are on the bench', () => {
    expect(by('40748')).toMatchObject({ shirt: '38', onCourt: [1, 3], bench: [2, 4, 5], unknown: [] })
  })
  it('starters stay on court every set', () => {
    expect(by('16527').onCourt).toEqual([1, 2, 3, 4, 5]) // #21 Surakka, subbed out in set 1 but started
  })
  it('roster player never on court gets no sets on court (libero not recorded by TASO)', () => {
    const riku = setParticipation(raw).find((p) => p.teamId === '63954' && p.shirt === '10')!
    expect(riku.onCourt).toEqual([])
    expect(riku.bench).toEqual([1, 2, 3, 4, 5])
  })
  it('a team set without any position data is unknown, never on court or bench', () => {
    const bare = { ...raw, events: [], starting_playing_positions_A: {}, starting_playing_positions_B: {} }
    const a = setParticipation(bare).find((p) => p.playerId === '40748')!
    expect(a).toMatchObject({ onCourt: [], bench: [], unknown: [1, 2, 3, 4, 5] })
  })
  it('sums over matches', () => {
    expect(sumSets([raw, raw]).get('40748')).toEqual({ onCourt: 4, bench: 6, unknown: 0, matches: 2 })
  })
  it('no lineups -> no rows', () => expect(setParticipation({ ...raw, lineups: [] })).toEqual([]))
})
