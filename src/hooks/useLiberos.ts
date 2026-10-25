import { useCallback, useEffect, useState } from 'react'
import { cleanOverrides, isLibero as check, toggleLibero, type LiberoOverrides } from '../domain/libero'

const KEY = 'volleyball.liberos.v1'
const EVENT = 'volleyball-liberos'

export function readLiberos(): LiberoOverrides {
  try {
    const raw = localStorage.getItem(KEY)
    return cleanOverrides(raw ? JSON.parse(raw) : {})
  } catch {
    return {}
  }
}

/** Libero marks per team live in this phone's localStorage (built-in defaults apply until overridden). */
export function useLiberos() {
  const [items, setItems] = useState<LiberoOverrides>(readLiberos)
  useEffect(() => {
    const sync = () => setItems(readLiberos())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  const toggle = useCallback((teamId: string, playerId: string) => {
    const next = toggleLibero(readLiberos(), teamId, playerId)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* storage blocked: keep for this visit */
    }
    setItems(next)
    window.dispatchEvent(new Event(EVENT))
  }, [])
  const isLibero = useCallback((teamId: string, playerId: string) => check(items, teamId, playerId), [items])
  return { isLibero, toggle }
}
