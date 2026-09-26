import { useCallback, useState } from 'react'

export interface Favorite {
  kind: 'team' | 'player'
  id: string
  name: string
}

const KEY = 'volleyball.favorites.v1'

function read(): Favorite[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useFavorites() {
  const [items, setItems] = useState<Favorite[]>(read)

  const toggle = useCallback((item: Favorite) => {
    setItems((prev) => {
      const exists = prev.some((p) => p.kind === item.kind && p.id === item.id)
      const next = exists ? prev.filter((p) => !(p.kind === item.kind && p.id === item.id)) : [item, ...prev].slice(0, 40)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { items, toggle }
}
