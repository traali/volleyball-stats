import { Outlet, useNavigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function Layout() {
  const navigate = useNavigate()
  const embed = typeof window !== 'undefined' && new URLSearchParams(window.location.hash.split('?')[1] || window.location.search).get('embed') === 'true'
  return (
    <div className={`min-h-screen bg-[#0a0b0e] text-zinc-100 ${embed ? '' : 'pb-24'}`}>
      {!embed && (
        <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#0a0b0e]/90 backdrop-blur">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
            <button type="button" onClick={() => navigate('/')} className="text-left min-h-11">
              <p className="text-sm font-black tracking-tight">Lentopallotilastot</p>
              <p className="text-[10px] text-amber-400 font-semibold">Lentopalloliitto · TASO</p>
            </button>
            <span data-testid="app-version-badge" title={`Rakennettu ${__BUILD_TIME__}`} className="font-mono text-[10px] text-zinc-500">
              v{__APP_VERSION__} · {__COMMIT_HASH__}
            </span>
          </div>
        </header>
      )}
      <Outlet />
      {!embed && <BottomNav />}
    </div>
  )
}
