import { describe, expect, it } from 'vitest'
import { onlyTeamMatches } from '../services/discovery'
import { minutesBetween, phaseForDisplay, pointsFromEvents, resultIsTrusted, resultText, rotationsFromMatch, setsFromMatch } from './rally'

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
    { code: 'piste', period: '1', wall_time: '10:02:11', description: 'attack', player_name: 'Aada Korhonen', shirt_number: '7', team_id: '1', team: 'A', ps_A: 1, ps_B: 0 },
    { code: 'vaihto', period: '1', wall_time: '10:03:00', description: 'x' },
    { code: 'pelipaikat', period: '1' },
  ],
}

describe('rally tape', () => {
  it('keeps only piste rows and their wall clock', () => {
    const points = pointsFromEvents(raw.events)
    expect(points).toHaveLength(1)
    expect(points[0].wallTime).toBe('10:02:11')
    expect(points[0].score).toBe('1–0')
    expect(points[0].kind).toBe('attack')
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

// Shape copied from real Torneopal getMatch 811783 (4.10.2026): description is the point TYPE,
// ps_A/ps_B carry the running set score.
describe('real point tape shape', () => {
  const ev = [
    { code: 'pelipaikat', period: '1', description: '7=15,2=6' },
    { code: 'piste', period: '1', team: 'A', team_id: '63825', description: 'block', ps_A: 1, ps_B: 0, wall_time: '12:00:21' },
    { code: 'piste', period: '1', team: 'A', team_id: '63825', description: 'error_attack', ps_A: 2, ps_B: 0, wall_time: '12:00:47' },
    { code: 'piste', period: '1', team: 'B', team_id: '63508', description: 'serve', ps_A: 2, ps_B: 1, wall_time: '12:01:10' },
    { code: 'piste', period: '2', team: 'B', team_id: '63508', description: 'return', ps_A: 0, ps_B: 1, wall_time: '12:21:30' },
  ]
  it('shows the running score, never the point type, in the score column', () => {
    const p = pointsFromEvents(ev, '63825')
    expect(p.map((x) => x.score)).toEqual(['1–0', '2–0', '2–1', '0–1'])
    expect(p.map((x) => x.kind)).toEqual(['block', 'error_attack', 'serve', 'return'])
  })
  it('counts the score itself when ps_A/ps_B are missing, restarting each set', () => {
    const bare = ev.map((e) => ({ ...e, ps_A: undefined, ps_B: undefined }))
    expect(pointsFromEvents(bare, '63825').map((x) => x.score)).toEqual(['1–0', '2–0', '2–1', '0–1'])
  })
})

describe('set duration', () => {
  it('derives minutes from start and end when p*_duration is blank', () => {
    expect(minutesBetween('12:00:21', '12:18:19')).toBe('18')
    const sets = setsFromMatch({ p1s_A: '25', p1s_B: '16', p1_start_time: '12:00:21', p1_end_time: '12:18:19', p1_duration: '' })
    expect(sets[0].durationMin).toBe('18')
  })
  it('stays blank when a clock is missing', () => {
    expect(minutesBetween('', '12:18:19')).toBe('')
    expect(minutesBetween('12:18:19', '12:00:00')).toBe('')
  })
})

// Real Forfeited row: Wartti/N2 – OsVa/N2, 4.10.2026, no set scores, forfeit_A '1'.
describe('forfeit', () => {
  const wo = { status: 'Forfeited', fs_A: '', fs_B: '', p1s_A: '', p1s_B: '', forfeit_A: '1', walkover: 0 }
  it('is a result, not an upcoming game', () => {
    expect(resultIsTrusted(wo)).toBe(true)
    expect(phaseForDisplay(wo)).toBe('completed')
  })
  it('is never printed as 0–0', () => {
    expect(resultText(wo)).toBe('luovutus')
  })
  it('a Fixture 0–0 still has no result text', () => {
    expect(resultText({ status: 'Fixture', fs_A: '0', fs_B: '0' })).toBe('')
  })
})

describe('team match list', () => {
  it('drops other teams games when TASO answers with the whole group', () => {
    const rows = [
      { match_id: '1', team_A_id: '63825', team_B_id: '63508' },
      { match_id: '2', team_A_id: '111', team_B_id: '222' },
      { match_id: '3', team_A_id: '333', team_B_id: 63825 },
    ]
    expect(onlyTeamMatches(rows, '63825').map((m) => m.match_id)).toEqual(['1', '3'])
  })
})

describe('point tape when description is the set score (match 803471 shape)', () => {
  // Real rows: a "0-0" set-start marker, ps_A/ps_B counting the whole match, and repeated rows after the set ended.
  const ev = (period: string, team: string, description: string, ps_A: number, ps_B: number, wall_time: string) => ({
    code: 'piste', period, team, description, ps_A, ps_B, wall_time, team_id: team === 'A' ? '35560' : '35538',
  })
  const events = [
    ev('1', 'A', '0-0', 1, 0, '17:59:03'),
    ev('1', 'A', '1-0', 2, 0, '18:30:38'),
    ev('1', 'B', '1-1', 2, 1, '18:31:10'),
    ev('1', 'A', '2-1', 3, 1, '18:31:40'),
    ev('2', 'A', '0-0', 4, 1, '18:52:57'),
    ev('2', 'B', '0-1', 4, 2, '18:57:23'),
    ev('2', 'B', '0-2', 4, 3, '18:58:00'),
    ev('2', 'B', '0-2', 4, 4, '19:00:30'),
  ]
  it('uses the set score from description and drops rows that score nothing', () => {
    const pts = pointsFromEvents(events, '35560')
    expect(pts.map((p) => `${p.period}:${p.score}`)).toEqual(['1:1–0', '1:1–1', '1:2–1', '2:0–1', '2:0–2'])
    expect(pts.every((p) => p.kind === '')).toBe(true)
  })
  it('takes set length from the points when the set clock opened half an hour early', () => {
    const sets = setsFromMatch({
      team_A_id: '35560', events,
      p1s_A: '2', p1s_B: '1', p1_start_time: '17:59:03', p1_end_time: '18:31:40',
      p2s_A: '0', p2s_B: '2', p2_start_time: '18:52:57', p2_end_time: '19:00:30',
    })
    expect(sets[0].start).toBe('18:30:38')
    expect(sets[1].end).toBe('18:58:00')
  })
})
