import { describe, expect, it } from 'vitest'
import fx from './fixtures/tournaments.json'
import { isForfeit, phaseForDisplay, resultIsTrusted, resultText, setsWonRecorded } from './rally'
import {
  courtLabel,
  formatLabel,
  isTie,
  matchFormat,
  noticeParts,
  placeholderLabel,
  scheduleByDay,
  setWentToExtraPoints,
  sideName,
  stagesFromGroups,
  standingColumns,
  standingsState,
  timeOf,
  type GroupRow,
} from './tournament'

type Row = Record<string, unknown>

const groupRows = (rows: Array<Record<string, unknown>>): GroupRow[] => rows.map((g) => ({
  id: String(g.group_id),
  name: String(g.group_name),
  type: String(g.group_type),
  phaseNumber: g.phase_number == null || g.phase_number === '' ? null : Number(g.phase_number),
  phaseName: String(g.phase_name ?? ''),
}))

describe('tournament stages (real Power Cup 2025 D-pojat and Etelä-Suomi U13-tytöt groups)', () => {
  it('orders group stage, extra groups, knockout, and sorts group ids as numbers', () => {
    const stages = stagesFromGroups(groupRows(fx.groupsPowerCupPD))
    // Phase 3 is the 1-4 … 21-25 brackets plus a 23-25 placement pool, as TASO has it.
    expect(stages.map((s) => s.title)).toEqual(['1. vaihe · Alkulohkot', '2. vaihe · Jatkolohkot', '3. vaihe · Jatkolohkot', '3. vaihe · Pudotuspelit'])
    expect(stages[0].groups.map((g) => g.name)).toEqual(['A', 'B', 'C', 'D'])
    expect(stages[1].groups.map((g) => g.id)).toEqual(['5', '6', '7', '8', '9', '10'])
    expect(stages[2].groups.map((g) => g.name)).toEqual(['23-25'])
    expect(stages[3].groups.map((g) => g.name)).toEqual(['1-4', '5-8', '9-12', '13-16', '17-20', '21-25'])
  })

  it('uses TASO phase names for youth tournament days (Alkulohkot, Pooli 1, Pooli 2 …)', () => {
    const stages = stagesFromGroups(groupRows(fx.groupsU13T))
    expect(stages[0].title).toBe('Alkulohkot')
    expect(stages[0].groups.map((g) => g.name)).toEqual(['Lohko 1', 'Lohko 2', 'Lohko 3', 'Lohko 4', 'Lohko 5', 'Lohko 6'])
    expect(stages.slice(1).every((s) => s.kind === 'extra')).toBe(true)
    expect(stages[1].groups[0].name).toBe('Pooli 1A')
  })
})

describe('standings only when TASO gives a real table', () => {
  it('shows the U13 group table that TASO computed', () => {
    expect(standingsState(fx.groupU13T1.group_type, fx.groupU13T1.teams as Row[])).toBe('table')
  })

  it('never shows a table for a knockout bracket, even though TASO lists its teams', () => {
    expect(standingsState(fx.groupKnockout.group_type, fx.groupKnockout.teams as Row[])).toBe('none')
  })

  it('does not show an all-zero table for a pool nobody has played yet', () => {
    expect(standingsState(fx.groupPooliNotStarted.group_type, fx.groupPooliNotStarted.teams as Row[])).toBe('not-started')
  })

  it('shows a league table once one game is in (Mestaruusliiga after round 1)', () => {
    expect(standingsState(fx.groupLeagueML.group_type, fx.groupLeagueML.teams as Row[])).toBe('table')
  })

  it('refuses rows that are not standings rows', () => {
    expect(standingsState('group_stage', [{ team_id: '1', team_name: 'X' }])).toBe('none')
    expect(standingsState('group_stage', [])).toBe('none')
  })

  it('league columns follow 3,2,1,0; youth with ties gets a T column; best-of-three youth gets V/H', () => {
    expect(standingColumns(fx.groupLeagueML.match_points, fx.groupLeagueML.teams as Row[]).map((c) => c.label)).toEqual(['O', 'V3', 'V2', 'H1', 'H'])
    expect(standingColumns(fx.groupU11Ties.match_points, fx.groupU11Ties.teams as Row[]).map((c) => c.label)).toEqual(['O', 'V', 'T', 'H'])
    expect(standingColumns(fx.groupU13T1.match_points, fx.groupU13T1.teams as Row[]).map((c) => c.label)).toEqual(['O', 'V', 'H'])
  })
})

describe('match formats', () => {
  it('a fixed two-set U11 game that ends 1–1 is a finished tie, not an unfinished game', () => {
    const m = fx.u11Tie as Row
    expect(matchFormat(m)).toEqual({ kind: 'fixed', sets: 2 })
    expect(formatLabel(matchFormat(m))).toContain('2 erää')
    expect(isTie(m)).toBe(true)
    expect(phaseForDisplay(m)).toBe('completed')
    expect(resultText(m)).toBe('1–1')
  })

  it('best of three: 2–0 and 2–1 are complete results', () => {
    for (const m of fx.u13tDay as Row[]) {
      expect(matchFormat(m)).toEqual({ kind: 'best-of', toWin: 2, maxSets: 3 })
      expect(phaseForDisplay(m)).toBe('completed')
      expect(['2–0', '0–2', '2–1', '1–2']).toContain(resultText(m))
    }
    expect(formatLabel(matchFormat(fx.u13tDay[0] as Row))).toBe('Paras kolmesta (2 voitettua erää)')
  })

  it('a Planned game is upcoming with no result', () => {
    const m = fx.u11Planned as Row
    expect(phaseForDisplay(m)).toBe('upcoming')
    expect(resultText(m)).toBe('')
  })

  it('a set on the sheet with TASO 0–0 prints no 0–0 and no computed score', () => {
    const m = fx.powerCupOneSetZeroZero as Row
    expect(resultText(m)).toBe('')
    expect(setsWonRecorded(m)).toBeNull()
  })

  it('a forfeit without date or time is still a result', () => {
    const m = fx.cupForfeitNoTime as Row
    expect(isForfeit(m)).toBe(true)
    expect(resultIsTrusted(m)).toBe(true)
    expect(timeOf(m)).toBe('')
  })

  it('extra points work for 25, 21 and 15 point sets', () => {
    expect(setWentToExtraPoints(26, 24)).toBe(true)
    expect(setWentToExtraPoints(27, 25)).toBe(true)
    expect(setWentToExtraPoints(25, 23)).toBe(false)
    expect(setWentToExtraPoints(25, 17)).toBe(false)
    expect(setWentToExtraPoints(17, 15)).toBe(true)
    expect(setWentToExtraPoints(15, 13)).toBe(false)
    expect(setWentToExtraPoints(23, 21)).toBe(true)
    expect(setWentToExtraPoints(21, 19)).toBe(false)
    // Real: U11 817099 set 1 was 27–25, PD 731175 set 2 was 25–11.
    expect(setWentToExtraPoints(Number(fx.powerCupKnockout[0].p2s_A), Number(fx.powerCupKnockout[0].p2s_B))).toBe(false)
  })
})

describe('tournament day schedule', () => {
  it('lists a U13 tournament day by hall, then time', () => {
    const days = scheduleByDay(fx.u13tDay as Row[])
    expect(days).toHaveLength(1)
    expect(days[0].date).toBe('2026-10-04')
    expect(days[0].venues.map((v) => v.venue)).toEqual(['Karkkilan liikuntahalli'])
    expect(days[0].venues[0].matches.map((m) => timeOf(m))).toEqual(['14:30', '14:30', '15:30', '15:30', '16:30', '16:30'])
  })

  it('Power Cup courts are numbers: sorted by time then court, labelled as courts', () => {
    const days = scheduleByDay(fx.powerCupGroupA as Row[])
    const first = days[0].venues[0].matches
    expect(days[0].venues[0].venue).toBe('')
    expect(first.map((m) => `${timeOf(m)} ${String(m.venue_name)}`)).toEqual(['12:00 201', '12:00 202', '12:00 203', '14:00 202', '14:00 203', '15:00 201'])
    expect(courtLabel(first[0])).toBe('Kenttä 201')
    expect(courtLabel(fx.u13tDay[0] as Row)).toBe('Karkkilan liikuntahalli')
  })

  it('games without a date go last', () => {
    const days = scheduleByDay([fx.cupForfeitNoTime as Row, fx.cupDrawPending as Row, fx.u13tDay[0] as Row])
    expect(days.map((d) => d.date)).toEqual(['2026-10-04', '2026-11-01', '2026-11-15'])
    const undated = scheduleByDay([{ match_id: '1', date: '' }, fx.u13tDay[0] as Row])
    expect(undated.map((d) => d.date)).toEqual(['2026-10-04', ''])
  })
})

describe('playoff placeholders', () => {
  it('names a bracket slot by the game it comes from', () => {
    expect(placeholderLabel('v5462')).toBe('Ottelun 5462 voittaja')
    expect(placeholderLabel('h5463')).toBe('Ottelun 5463 häviäjä')
    expect(placeholderLabel('JA1/I')).toBe('JA1/I')
  })

  it('a cup game before the draw has no team link', () => {
    const m = fx.cupDrawPending as Row
    expect(sideName(m, 'A')).toEqual({ name: 'Arvotaan', teamId: '' })
  })

  it('a played knockout game keeps the real team and its id', () => {
    const m = fx.powerCupKnockout[2] as Row
    expect(sideName(m, 'A')).toEqual({ name: 'RVS/1', teamId: String(m.team_A_id) })
  })

  it('a slot with only a placeholder description reads as a winner/loser slot', () => {
    expect(sideName({ team_A_id: '', team_A_name: '', team_A_description: 'v5462' }, 'A')).toEqual({ name: 'Ottelun 5462 voittaja', teamId: '' })
  })
})

describe('category notice', () => {
  it('keeps the text and the schedule PDF link, drops the HTML', () => {
    const n = noticeParts(fx.categoryNoticePD)
    expect(n.text).toContain('Sarjaan siirretään yksi joukkue')
    expect(n.text).not.toContain('<')
    expect(n.links[0].href).toBe('https://www.powercup.fi/wp-content/uploads/2025/05/Sarjakaaviot-2025.pdf')
  })

  it('drops javascript links', () => {
    expect(noticeParts('<a href="javascript:alert(1)">x</a>').links).toEqual([])
  })
})
