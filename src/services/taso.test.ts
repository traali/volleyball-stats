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
