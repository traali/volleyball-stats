import { describe, expect, it } from 'vitest'
import raw from '../../public/analysis/816603.json'
import { classifyFinding, clock, isMatchAnalysis, teamStats, youtubeLink } from './videoAnalysis'

const data: unknown = raw

describe('video analysis 816603', () => {
  it('is valid and keeps Torneopal rally counts', () => {
    expect(isMatchAnalysis(data)).toBe(true)
    if (!isMatchAnalysis(data)) return
    expect(data.sets['1']).toHaveLength(47)
    expect(data.sets['5']).toHaveLength(28)
    const r = data.sets['1'].find((x) => x.score === '22-20')!
    expect(r.officialWinner).toBe('away')
    expect(r.youtubeS).toBe(2383)
  })
  it('classifies findings', () => {
    expect(classifyFinding('HSC ace', 'HSC', 'EsIsku')).toEqual({ side: 'home', kind: 'ace' })
    expect(classifyFinding('EsIsku attack out, no touch', 'HSC', 'EsIsku')).toEqual({ side: 'away', kind: 'attackError' })
    expect(classifyFinding('HSC #15 kill off block (block-touch signal)', 'HSC', 'EsIsku')?.kind).toBe('kill')
    expect(classifyFinding('EsIsku middle quick attack kill, landed in, no block touch', 'HSC', 'EsIsku')?.kind).toBe('kill')
  })
  it('counts team stats', () => {
    if (!isMatchAnalysis(data)) return
    const k = teamStats(data).find((x) => x.kind === 'kill')!
    expect(k.home + k.away).toBeGreaterThan(0)
  })
  it('formats links', () => {
    expect(youtubeLink('QYsk3kQvJvg', 2383)).toBe('https://www.youtube.com/watch?v=QYsk3kQvJvg&t=2383s')
    expect(clock(2383)).toBe('0:39:43')
  })
})
