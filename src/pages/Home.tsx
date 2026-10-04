import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites'

export function Home() {
  const navigate = useNavigate()
  const { items } = useFavorites()
  const [q, setQ] = useState('')
  const [teamId, setTeamId] = useState('')
  const [matchId, setMatchId] = useState('')
  const [playerId, setPlayerId] = useState('')
  const go = (value: string) => {
    const v = value.trim()
    if (v) navigate(`/search?q=${encodeURIComponent(v)}`)
  }
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black">Lentopallotilastot</h1>
        <p className="text-sm text-zinc-400">Hae seuran nimellä tai liitä tulospalvelu-linkki. Ottelut tulevat lentopallon tulospalvelusta.</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); go(q) }} className="flex gap-2">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hae PuMa, U15 tai liitä lentopallo-linkki" className="flex-1 min-h-12 rounded-2xl bg-zinc-900 border border-zinc-800 px-4 text-sm" />
        <button className="min-h-12 px-4 rounded-2xl bg-amber-500 text-zinc-950 font-bold text-sm" type="submit">Hae</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {['Nuoret', 'U15-tytöt', 'Etelä-Suomi'].map((chip) => (
          <button key={chip} type="button" onClick={() => go(chip)} className="px-3 py-1.5 rounded-full border border-zinc-700 text-xs font-semibold text-zinc-300">{chip}</button>
        ))}
        <button type="button" onClick={() => navigate('/browse')} className="px-3 py-1.5 rounded-full border border-amber-500/40 text-xs font-semibold text-amber-300">Selaa sarjoja</button>
      </div>
      {items.filter((i) => i.kind === 'team').length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Suosikkijoukkueet</h2>
          <div className="flex flex-wrap gap-2">
            {items.filter((i) => i.kind === 'team').map((t) => (
              <button key={t.id} type="button" onClick={() => navigate(`/team/${t.id}`)} className="px-3 py-1.5 rounded-full border border-rose-400/30 text-xs text-rose-200">{t.name}</button>
            ))}
          </div>
        </section>
      )}
      <section className="rounded-2xl border border-zinc-800 p-3 space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Avaa tunnuksella</h2>
        <IdRow label="Joukkue-ID" value={teamId} setValue={setTeamId} onGo={(id) => navigate(`/team/${id}`)} />
        <IdRow label="Ottelu-ID" value={matchId} setValue={setMatchId} onGo={(id) => navigate(`/match/${id}`)} />
        <IdRow label="Pelaaja-ID" value={playerId} setValue={setPlayerId} onGo={(id) => navigate(`/player/${id}`)} />
      </section>
    </main>
  )
}

function IdRow({ label, value, setValue, onGo }: { label: string; value: string; setValue: (v: string) => void; onGo: (id: string) => void }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) onGo(value.trim()) }} className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
      <label className="text-xs text-zinc-400 sm:w-24">{label}</label>
      <input value={value} onChange={(e) => setValue(e.target.value)} className="flex-1 min-h-11 rounded-xl bg-zinc-950 border border-zinc-800 px-3 text-sm" />
      <button type="submit" className="min-h-11 px-3 rounded-xl bg-zinc-800 text-xs font-bold">Avaa</button>
    </form>
  )
}
