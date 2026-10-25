import { describe, expect, it } from 'vitest'
import { cleanOverrides, isLibero, toggleLibero, LIBERO_NOTE } from './libero'
import { playerStatsMd } from './gameFlow'
import { setParticipation } from './setParticipation'
import m816603 from './fixtures/match-816603.json'
import { buildVolleyballPreviewMd } from '../utils/buildVolleyballPreviewMd'
import type { VolleyballMatchDetail } from '../types/volleyball'

describe('libero marks', () => {
  it('defaults Riku Tall (20763) as EsIsku/M1 (63954) libero, only for that team', () => {
    expect(isLibero({}, '63954', '20763')).toBe(true)
    expect(isLibero({}, '99999', '20763')).toBe(false)
    expect(isLibero({}, '63954', '1')).toBe(false)
  })
  it('toggles: unmark the default, mark another player', () => {
    const off = toggleLibero({}, '63954', '20763')
    expect(isLibero(off, '63954', '20763')).toBe(false)
    expect(isLibero(toggleLibero(off, '63954', '20763'), '63954', '20763')).toBe(true)
    expect(isLibero(toggleLibero({}, '1', '2'), '1', '2')).toBe(true)
  })
  it('cleans junk from storage', () => {
    expect(cleanOverrides({ '1|2': true, bad: true, '3|4': 'x' })).toEqual({ '1|2': true })
    expect(cleanOverrides(null)).toEqual({})
    expect(cleanOverrides([1])).toEqual({})
  })
})

const raw = m816603 as unknown as Record<string, unknown>

describe('libero in markdown', () => {
  it('816603: Tall looks benched in TASO data; marked libero shows Libero, not Vaihdossa', () => {
    const tall = setParticipation(raw).find((p) => p.playerId === '20763')!
    expect(tall.teamId).toBe('63954')
    expect(tall.onCourt).toHaveLength(0)
    expect(tall.bench.length).toBeGreaterThan(0)
    const plain = playerStatsMd(raw, 'A', 'B').join('\n')
    const md = playerStatsMd(raw, 'A', 'B', (t, p) => isLibero({}, t, p)).join('\n')
    expect(plain).toMatch(/#10 Tall[^\n]*vaihdossa [1-9]/)
    expect(md).toMatch(/#10 Tall[^\n]*erät: Libero \(Liberon eriä ei kirjata liiton datassa\)/)
    expect(md).not.toMatch(/#10 Tall[^\n]*vaihdossa/)
  })
  it('roster md shows Libero', () => {
    const match = { homeTeamName: 'EsIsku', awayTeamName: 'X', sets: [] } as unknown as VolleyballMatchDetail
    const md = buildVolleyballPreviewMd({ match, rosters: [{ team: 'EsIsku', lineupPublished: true, players: [{ id: '20763', name: 'Riku Tall', number: '10', matches: 5, points: 3, sets: 0, setsBench: 5, inLineup: true, libero: true }] }] })
    expect(md).toContain(`#10 Riku Tall · 3p / 5 ott · erät: Libero (${LIBERO_NOTE})`)
    expect(md).not.toMatch(/Riku Tall[^\n]*vaihdossa/)
  })
})
