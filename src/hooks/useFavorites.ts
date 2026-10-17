import { useCallback, useEffect, useState } from 'react'
import { toggleFavorite, type Favorite } from '../domain/favorites'

export type { Favorite }

const KEY = 'volleyball.favorites.v1'
const EVENT = 'volleyball-favorites'

function read(): Favorite[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Favourites live in this phone's localStorage. Every page sees the same list, also after a toggle elsewhere. */
export function useFavorites() {
  const [items, setItems] = useState<Favorite[]>(read)

  useEffect(() => {
    const sync = () => setItems(read())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggle = useCallback((item: Favorite) => {
    const next = toggleFavorite(read(), item)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* storage full or blocked: keep it for this visit */
    }
    setItems(next)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  const has = useCallback((kind: Favorite['kind'], id: string) => items.some((i) => i.kind === kind && i.id === id), [items])

  return { items, toggle, has }
}
