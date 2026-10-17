export interface Favorite {
  kind: 'team' | 'player'
  id: string
  name: string
}

export const MAX_FAVORITES = 40

/** Add to the front, or remove when already there. Empty ids and names are not stored. */
export function toggleFavorite(list: Favorite[], item: Favorite): Favorite[] {
  const clean = list.filter((p) => p && p.id && (p.kind === 'team' || p.kind === 'player'))
  const exists = clean.some((p) => p.kind === item.kind && p.id === item.id)
  if (exists) return clean.filter((p) => !(p.kind === item.kind && p.id === item.id))
  if (!item.id.trim() || !item.name.trim()) return clean
  return [{ kind: item.kind, id: item.id.trim(), name: item.name.trim() }, ...clean].slice(0, MAX_FAVORITES)
}
