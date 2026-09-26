import { NavLink } from 'react-router-dom'
import { Heart, Home, LayoutGrid, Search } from 'lucide-react'

const items = [
  { to: '/', label: 'Etusivu', icon: Home, end: true },
  { to: '/browse', label: 'Selaa', icon: LayoutGrid, end: false },
  { to: '/search', label: 'Haku', icon: Search, end: false },
  { to: '/favorites', label: 'Suosikit', icon: Heart, end: false },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex justify-around border-t border-zinc-800 bg-[#0a0b0e]/95 backdrop-blur pb-[max(8px,env(safe-area-inset-bottom))]">
      {items.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `flex flex-col items-center justify-center min-w-16 min-h-12 text-[10px] font-semibold uppercase tracking-wider ${isActive ? 'text-amber-300' : 'text-zinc-500'}`}
        >
          <item.icon className="w-5 h-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
