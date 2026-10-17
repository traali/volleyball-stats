import type { Favorite } from '../hooks/useFavorites'

export function FavButton({ item, on, onToggle, compact = false }: { item: Favorite; on: boolean; onToggle: (f: Favorite) => void; compact?: boolean }) {
  const label = on ? 'Poista suosikeista' : 'Lisää suosikkeihin'
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${label}: ${item.name}`}
      data-testid="fav-toggle"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(item) }}
      className={`min-h-11 shrink-0 rounded-xl border px-3 text-xs font-bold ${on ? 'border-rose-400/50 text-rose-200' : 'border-zinc-700 text-zinc-300'}`}
    >
      {compact ? (on ? '★' : '☆') : `${on ? '★' : '☆'} ${label}`}
    </button>
  )
}
