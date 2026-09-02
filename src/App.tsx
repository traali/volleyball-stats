import { useState, useEffect } from 'react';
import { parseIncomingCrossRepoQuery } from './types/contracts';

export default function App() {
  const [query, setQuery] = useState(() => parseIncomingCrossRepoQuery(new URLSearchParams(window.location.search)));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__APP_BUILD_INFO__ = {
        version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0',
        commit: typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev',
        buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString()
      };
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setQuery(parseIncomingCrossRepoQuery(new URLSearchParams(window.location.search)));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const sets = [
    { number: 1, home: 25, away: 21, duration: '24 min', status: 'finished' },
    { number: 2, home: 23, away: 25, duration: '28 min', status: 'finished' },
    { number: 3, home: 25, away: 18, duration: '21 min', status: 'finished' },
    { number: 4, home: 25, away: 22, duration: '26 min', status: 'finished' },
    { number: 5, home: 0, away: 0, duration: 'Tie-break (15p)', status: 'unplayed' },
  ];

  const homeSetsWon = sets.filter(s => s.status === 'finished' && s.home > s.away).length;
  const awaySetsWon = sets.filter(s => s.status === 'finished' && s.away > s.home).length;

  return (
    <div className={`min-h-screen flex flex-col justify-between ${query.embed ? 'p-4 bg-[#0a0b0e]/95' : 'p-4 sm:p-8 bg-[#0a0b0e]'}`}>
      <div className="max-w-3xl w-full mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner">
              🏐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider text-amber-400 uppercase">Lentopallo • Torneopal</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-semibold">Live</span>
              </div>
              <h1 className="text-xl font-black tracking-tight text-white">Lentopallon Ottelukeskus</h1>
            </div>
          </div>
          {query.embed ? (
            <span className="rounded-full bg-zinc-800/80 border border-zinc-700/50 px-3 py-1 text-xs text-zinc-300 font-medium">
              Pelipäivä Embedded
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs text-amber-300 font-medium">
              Lentopalloliitto
            </span>
          )}
        </header>

        {/* Hero Scoreboard Card */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-6">
            <span className="font-semibold uppercase tracking-wider text-zinc-500">Miesten / Naisten 1-sarja</span>
            <span className="font-mono text-zinc-400">Lopputulos (4 erää)</span>
          </div>

          <div className="grid grid-cols-3 items-center text-center gap-4">
            {/* Team A */}
            <div className="space-y-1">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 text-lg">
                K
              </div>
              <p className="font-bold text-base sm:text-lg text-white">KaLe</p>
              <p className="text-xs text-zinc-400">Kotijoukkue</p>
            </div>

            {/* Score */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-3 px-5 py-2 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-inner">
                <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">{homeSetsWon}</span>
                <span className="text-xl text-zinc-600 font-bold">:</span>
                <span className="text-3xl sm:text-4xl font-black text-zinc-300 font-mono">{awaySetsWon}</span>
              </div>
              <p className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">Erävoitot</p>
            </div>

            {/* Team B */}
            <div className="space-y-1">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center font-bold text-blue-300 text-lg">
                V
              </div>
              <p className="font-bold text-base sm:text-lg text-white">Vantaa Ducks</p>
              <p className="text-xs text-zinc-400">Vierasjoukkue</p>
            </div>
          </div>
        </section>

        {/* 5-Set Scoring Breakdown */}
        <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <span>📊</span>
              <span>Eräkohtaiset Pisteet (Sets)</span>
            </h2>
            <span className="text-[11px] text-zinc-400">25 pistettä (ero 2p) • 5. erä 15p</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {sets.map((s) => {
              const homeWon = s.home > s.away;
              return (
                <div
                  key={s.number}
                  className={`rounded-2xl p-3 border text-center transition-all ${
                    s.status === 'unplayed'
                      ? 'bg-zinc-950/30 border-zinc-850/50 opacity-40'
                      : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-[11px] font-bold text-zinc-400 block mb-1">
                    {s.number}. Erä
                  </span>
                  {s.status === 'finished' ? (
                    <div className="text-lg font-black font-mono">
                      <span className={homeWon ? 'text-amber-400' : 'text-zinc-300'}>{s.home}</span>
                      <span className="text-zinc-600 mx-1">-</span>
                      <span className={!homeWon ? 'text-amber-400' : 'text-zinc-300'}>{s.away}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600 font-mono">—</span>
                  )}
                  <span className="text-[10px] text-zinc-500 block mt-1">{s.duration}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Intel Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <span className="text-xs text-zinc-400 block mb-1">Sarjasijoitus</span>
            <p className="text-xl font-bold text-zinc-100">#2 <span className="text-xs font-normal text-amber-400">(24 pistettä)</span></p>
          </div>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <span className="text-xs text-zinc-400 block mb-1">Seuraava Ottelu</span>
            <p className="text-sm font-semibold text-zinc-200">KaLe vs Lempo-Volley</p>
            <span className="text-[11px] text-zinc-500">Lauantaina klo 14:00</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400 max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-200">Volleyball Stats</span>
          <span>•</span>
          <span
            data-testid="app-version-badge"
            className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-amber-400"
          >
            v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'} (git:{typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev'})
          </span>
        </div>
        <div className="text-[10px] opacity-75">
          Suomen Lentopalloliitto ry & Torneopal Tulospalvelu
        </div>
      </footer>
    </div>
  );
}
