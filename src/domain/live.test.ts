import { describe, expect, it } from 'vitest'
import fixtures from './fixtures/live-matches.json'
import { isLiveMatch, liveState, phaseForDisplay, phaseOf, resultText } from './rally'
import { formatLabel, matchFormat } from './tournament'

// Trimmed real getMatch answers from TASO, 24.10.2026.
const f = fixtures as unknown as Record<string, Record<string, unknown>>

describe('live detection', () => {
  it('Live, and Penalties (between sets) are live', () => {
    expect(phaseOf('Live')).toBe('live')
    expect(phaseOf('Penalties')).toBe('live')
    expect(phaseForDisplay(f.live)).toBe('live')
    expect(phaseForDisplay(f.penalties)).toBe('live')
  })

  it('an open set beyond the ones played is live even if the status lags', () => {
    expect(isLiveMatch({ ...f.penalties, status: 'Fixture' })).toBe(true)
    expect(isLiveMatch({ ...f.penalties, status: 'Played' })).toBe(false)
  })

  it('finished and fixture games are not live', () => {
    expect(phaseForDisplay(f.finished)).toBe('completed')
    expect(phaseForDisplay(f.fixture)).toBe('upcoming')
    expect(isLiveMatch(f.fixture)).toBe(false)
  })
})

describe('live state', () => {
  it('running points of the current set come from the last point event', () => {
    const st = liveState(f.live)
    expect(st.currentSet).toBe(1)
    expect(st.setsHome).toBe(0)
    expect(st.setsAway).toBe(0)
    expect(st.points).toEqual({ home: 17, away: 24 })
  })

  it('set 4 in progress: sets won and set 4 points', () => {
    const st = liveState(f.liveSet4)
    expect([st.setsHome, st.setsAway]).toEqual([1, 2])
    expect(st.currentSet).toBe(4)
    expect(st.points).toEqual({ home: 4, away: 3 })
  })

  it('between sets there is no running score, never a made-up 0–0', () => {
    const st = liveState(f.penalties)
    expect([st.setsHome, st.setsAway]).toEqual([2, 1])
    expect(st.currentSet).toBe(4)
    expect(st.points).toBeNull()
  })

  it('serving team only when TASO states it', () => {
    // TASO's live_serve_team matches the winner of the last rally in these real games.
    expect(liveState(f.live).serving).toBe('B')
    expect(liveState(f.liveSet4).serving).toBe('A')
    expect(liveState(f.penalties).serving).toBeNull()
    expect(liveState({ ...f.live, live_serve_team: '' }).serving).toBeNull()
  })

  it('falls back to live_ps_* when there are no point events', () => {
    expect(liveState({ ...f.live, events: [], live_ps_A: '3', live_ps_B: '5' }).points).toEqual({ home: 3, away: 5 })
  })

  it('timeouts of the current set come from timeout events', () => {
    expect(liveState(f.live).timeouts).toEqual({ home: 2, away: 1 })
  })

  it('a fixture has no score', () => {
    const st = liveState(f.fixture)
    expect(st.points).toBeNull()
    expect(resultText(f.fixture)).toBe('')
  })
})

describe('format label', () => {
  it('best of five for Arto\'s series; the Keski-Suomi aluesarja really plays 3 fixed sets', () => {
    expect(formatLabel(matchFormat(f.fixture))).toBe('Paras viidestä (3 voitettua erää)')
    expect(formatLabel(matchFormat(f.penalties))).toBe('3 erää (kaikki pelataan, tasapeli mahdollinen)')
  })
})
