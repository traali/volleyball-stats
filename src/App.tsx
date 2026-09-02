import { useState, useEffect } from 'react';
import { parseIncomingCrossRepoQuery } from './types/contracts';

export default function App() {
  const [query, setQuery] = useState(() => parseIncomingCrossRepoQuery(new URLSearchParams(window.location.search)));

  useEffect(() => {
    const handlePopState = () => {
      setQuery(parseIncomingCrossRepoQuery(new URLSearchParams(window.location.search)));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className={`min-h-screen ${query.embed ? 'p-4 bg-[#0a0b0e]/95' : 'p-6 bg-[#0a0b0e]'}`}>
      <header className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">Lentopallo • Volleyball</span>
          <h1 className="text-xl font-bold text-white">Lentopallo Tilastot</h1>
        </div>
        {query.embed && (
          <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
            Pelipäivä Embedded
          </span>
        )}
      </header>

      <main className="space-y-4">
        <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-zinc-300">Ottelun tiedot (Match Intel)</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Target ID: <code className="text-amber-300">{query.targetId || 'Demo / Yleisnäkymä'}</code>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-zinc-800/40 p-3">
              <span className="text-xs text-zinc-400">Erävoittosuhde</span>
              <p className="text-lg font-bold text-amber-400">3 — 1</p>
            </div>
            <div className="rounded-lg bg-zinc-800/40 p-3">
              <span className="text-xs text-zinc-400">Sarjasijoitus</span>
              <p className="text-lg font-bold text-zinc-200">#2 (24p)</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
