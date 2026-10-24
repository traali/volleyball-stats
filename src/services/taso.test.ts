import { describe, expect, it } from 'vitest'
import { readTasoBody } from './taso'

describe('reading a TASO answer', () => {
  it('ok answers are data', () => {
    const r = readTasoBody('{"call":{"status":"OK"},"player":{"player_id":"56961"}}')
    expect(r?.ok).toBe(true)
  })

  it('proxy HTTP 200 with a 403 inside is a failure, not data and not "not found"', () => {
    expect(readTasoBody('{"call":{"status":"error","http":403},"error":"upstream"}')).toBeNull()
    expect(readTasoBody('{"call":{"status":"error","http":403}}')).toBeNull()
  })

  it('the proxy\'s plain-text "endpoint" answer is a failure', () => {
    expect(readTasoBody('endpoint')).toBeNull()
  })

  it('TASO saying a match does not exist is "not found"', () => {
    expect(readTasoBody('{"call":{"method":"getMatch","status":"error","error_message":"Match not found or published 3"}}')).toEqual({ ok: false, reason: 'notfound' })
    expect(readTasoBody('{"call":{"status":"error","error":"Player not found"}}')).toEqual({ ok: false, reason: 'notfound' })
  })

  it('getTeam for an unknown id answers with a PHP dump that says NOTFOUND', () => {
    expect(readTasoBody('object(joukkue)#20 (76) {\n  ["ID"]=>\n  string(7) "joukkue"\n  ["NOTFOUND"]=>\n  bool(true)\n')).toEqual({ ok: false, reason: 'notfound' })
  })

  it('other TASO errors are failures', () => {
    expect(readTasoBody('{"call":{"status":"error","error":"Unkown method"}}')).toBeNull()
  })
})

describe('signing', () => {
  it('signs method, salt and raw params in query order', async () => {
    const { signingInput, signedUrl } = await import('./taso')
    expect(signingInput('getMatches?date=2026-10-24')).toBe('getMatches?ysnyp4h6e9egetkc3s3v&date=2026-10-24')
    expect(signingInput('getMatch?match_id=816603')).toBe('getMatch?ysnyp4h6e9egetkc3s3v&match_id=816603')
    expect(signingInput('getTeams?q=a%20b&x=1')).toBe('getTeams?ysnyp4h6e9egetkc3s3v&q=a b&x=1')
    // Real hash from a call TASO answered with status ok on 24.10.2026.
    const url = await signedUrl('getMatches?date=2026-10-24')
    expect(url).toMatch(/^https:\/\/lentopallo-api\.torneopal\.net\/taso\/rest\/getMatches\?date=2026-10-24&hash=20a28efb263d83e0de46dd294e5c9e5d25590d7a26673853253cf76edb47de8c$/)
  })

  it('"Not allowed" is a failure, not empty data', () => {
    expect(readTasoBody('Not allowed')).toBeNull()
  })
})
