import { describe, expect, it } from 'vitest'
import { resultIsTrusted } from './rally'

describe('resultIsTrusted', () => {
  it('does not trust a Played 0-0 with no set', () => {
    expect(resultIsTrusted({ status: '1', fs_A: '0', fs_B: '0', date: '2099-06-01', time: '18:00' })).toBe(false)
  })

  it('trusts a set that actually started', () => {
    expect(resultIsTrusted({ status: '1', fs_A: '3', fs_B: '1', p1s_A: '25', p1s_B: '18' })).toBe(true)
  })
})
