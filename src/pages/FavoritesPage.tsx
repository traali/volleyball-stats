import { Link } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites'

export function FavoritesPage() {
  const { items } = useFavorites()
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
      <h1 className="text-2xl font-black">Suosikit</h1>
      <p className="text-xs text-zinc-500">Tällä puhelimella. Avain volleyball.favorites.v1.</p>
      {items.length === 0 && <p className="text-sm text-zinc-500">Ei suosikkeja. Lisää joukkue sen sivulta.</p>}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <Link to={item.kind === 'team' ? `/team/${item.id}` : `/player/${item.id}`} className="block rounded-xl border border-zinc-800 px-3 py-2">{item.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
