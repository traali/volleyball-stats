import { Link } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites'

export function FavoritesPage() {
  const { items } = useFavorites()
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
      <h1 className="text-2xl font-black">Suosikit</h1>
      <p className="text-xs text-zinc-500">Suosikit tallentuvat tähän puhelimeen.</p>
      {items.length === 0 && <p className="text-sm text-zinc-500">Ei suosikkeja. Lisää joukkue tai pelaaja sen sivulta.</p>}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <Link to={item.kind === 'team' ? `/team/${item.id}` : `/player/${item.id}`} className="flex min-h-[44px] items-center justify-between rounded-xl border border-zinc-800 px-3 py-2"><span>{item.name}</span><span className="text-[11px] text-zinc-500">{item.kind === 'team' ? 'Joukkue' : 'Pelaaja'}</span></Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
