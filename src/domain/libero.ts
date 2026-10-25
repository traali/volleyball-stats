/**
 * TASO never records the libero (no libero flag per player, libero swaps not in events), so a libero
 * looks like a bench player in set participation. The user marks liberos per team on this phone.
 * Marked liberos show 'Libero' instead of invented on-court / bench counts.
 */
export type LiberoOverrides = Record<string, boolean>
export type LiberoCheck = (teamId: string, playerId: string) => boolean

export const LIBERO_NOTE = 'Liberon eriä ei kirjata liiton datassa'

/** Built-in marks confirmed by the user: Riku Tall #10 is EsIsku/M1's libero. */
export const DEFAULT_LIBEROS: LiberoOverrides = { '63954|20763': true }

export const liberoKey = (teamId: string, playerId: string) => `${String(teamId).trim()}|${String(playerId).trim()}`

/** Local override wins (also false = unmarked default), else the built-in default. */
export function isLibero(overrides: LiberoOverrides, teamId: string, playerId: string): boolean {
  if (!teamId || !playerId) return false
  const k = liberoKey(teamId, playerId)
  if (typeof overrides[k] === 'boolean') return overrides[k]
  return DEFAULT_LIBEROS[k] === true
}

export function toggleLibero(overrides: LiberoOverrides, teamId: string, playerId: string): LiberoOverrides {
  if (!teamId.trim() || !playerId.trim()) return overrides
  return { ...overrides, [liberoKey(teamId, playerId)]: !isLibero(overrides, teamId, playerId) }
}

/** Keep only well-formed boolean entries from storage. */
export function cleanOverrides(v: unknown): LiberoOverrides {
  const out: LiberoOverrides = {}
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out
  for (const [k, b] of Object.entries(v as Record<string, unknown>)) if (/^\d+\|\d+$/.test(k) && typeof b === 'boolean') out[k] = b
  return out
}
