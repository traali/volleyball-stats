import { useEffect, useState } from 'react'
import { BREAK_SEC, coachView, nextRotationLine, tempo, type CoachTeam } from '../domain/coach'
import { courtNow, type RotationAnalysis } from '../domain/gameFlow'

type Row = Record<string, unknown>
const pct = (x: number | null) => (x == null ? '–' : `${Math.round(x * 100)}%`)
const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`
const LABEL_CLS: Record<string, string> = { Vahva: 'text-emerald-300', Heikko: 'text-rose-300', tasainen: 'text-zinc-400', 'liian vähän': 'text-zinc-500' }

interface LM { availability: () => Promise<string>; create: () => Promise<{ prompt: (t: string) => Promise<string>; destroy?: () => void }> }

function TeamCard({ t, name, other, otherName, usual, shirts }: { t: CoachTeam; name: string; other: CoachTeam; otherName: string; usual?: RotationAnalysis | null; shirts?: string[] }) {
  const cur = t.lines.find((l) => l.rotation === t.current)
  const theirs = other.lines.find((l) => l.rotation === other.current)
  const nextK = t.next[0]
  const nextL = t.lines.find((l) => l.rotation === nextK)
  return (
    <div className="space-y-1 rounded-xl bg-zinc-900 p-2" data-testid={`coach-team-${t.side}`}>
      <p className="text-xs font-bold text-white">{name}{t.serving ? ' ●' : ''} · nyt <span className="text-amber-300">K{t.current ?? '–'}</span>{cur ? <span className={LABEL_CLS[cur.label]}> {signed(cur.net)} {cur.label}</span> : null}{t.next.length ? <span className="font-normal text-zinc-400"> · tulossa K{t.next.join(', K')}</span> : null}</p>
      {shirts && <p className="text-[11px] font-mono text-zinc-400">Kentällä I–VI: {shirts.map((x) => `#${x}`).join(' ')}</p>}
      <div className="grid grid-cols-6 gap-0.5 text-center text-[10px] leading-tight">
        {t.lines.map((l) => (
          <div key={l.rotation} className={`rounded p-0.5 ${l.rotation === t.current ? 'ring-1 ring-amber-400' : ''} ${l.label === 'Vahva' ? 'bg-emerald-500/15' : l.label === 'Heikko' ? 'bg-rose-500/15' : 'bg-zinc-800'}`}>
            <div className="text-zinc-400">K{l.rotation}</div>
            <div className="font-mono font-bold text-white">{signed(l.net)}</div>
            <div className="font-mono text-zinc-400">{l.won}–{l.lost}</div>
            <div className="text-zinc-500" title="side-out % / break %">{pct(l.sideOut)}/{pct(l.breakPct)}</div>
            <div className={LABEL_CLS[l.label]}>{l.label === 'liian vähän' ? 'vähän' : l.label === 'tasainen' ? '±' : l.label}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-200" data-testid="coach-next">{nextRotationLine(t, usual)}</p>
      {nextK && other.current && <p className="text-[11px] text-zinc-400">Seuraava K{nextK} ({nextL ? `${signed(nextL.net)}, ${nextL.rallies} p` : 'ei palloja'}) vs {otherName} nyt K{other.current} ({theirs ? `${signed(theirs.net)}, ${theirs.rallies} p` : 'ei palloja'})</p>}
    </div>
  )
}

export function CoachView({ raw, home, away, live, usual }: { raw: Row; home: string; away: string; live: boolean; usual?: (RotationAnalysis | null | undefined)[] }) {
  const { teams, period } = coachView(raw)
  const court = courtNow(raw)
  const tp = tempo(raw)
  const [ai, setAi] = useState('')
  const facts = teams.map((t, i) => `${i ? away : home}: ${nextRotationLine(t, usual?.[i])}`).join('. ')
  useEffect(() => {
    const L = (globalThis as unknown as { LanguageModel?: LM }).LanguageModel
    if (!L || typeof L.create !== 'function' || !teams[0].lines.length) return
    let gone = false
    void (async () => {
      try {
        if ((await L.availability()) === 'unavailable') return
        const sess = await L.create()
        const out = await sess.prompt(`Lentopallovalmentajan yhden lauseen vinkki suomeksi vain näistä lasketuista luvuista, älä keksi uusia lukuja: ${facts}`)
        sess.destroy?.()
        if (!gone) setAi(out.trim().split('\n')[0].slice(0, 200))
      } catch { /* no local model */ }
    })()
    return () => { gone = true }
  }, [facts]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!teams[0].lines.length) return null
  const names = [home, away]
  return (
    <section className="space-y-2 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-3" data-testid="coach-view">
      <h2 className="text-sm font-bold text-white">Valmentajan näkymä{!live ? ' (jälkikatselu)' : ''}{period ? <span className="font-normal text-zinc-400"> · {period}. erä</span> : null}</h2>
      <p className="text-[11px] text-zinc-500">Tämän ottelun pallot kierroittain (K1 = erän aloitusasetelma): netto, voitettu–menetetty, side-out % / break %. Vahva/Heikko vasta ≥6 pallosta, muuten "vähän".</p>
      {teams.map((t, i) => <TeamCard key={t.side} t={t} name={names[i]} other={teams[1 - i]} otherName={names[1 - i]} usual={usual?.[i]} shirts={court.find((c) => c.side === t.side)?.shirts} />)}
      {ai && <p className="text-xs text-sky-200" data-testid="coach-ai">Paikallinen tekoäly: {ai}</p>}
      {tp && (
        <details className="text-xs" data-testid="tempo">
          <summary className="min-h-[44px] text-zinc-300">Aika pisteiden välillä · mediaani {tp.median} s</summary>
          <p className="text-[11px] text-zinc-500">Pöytäkirjan kirjausajoista (1 s tarkkuus). Sisältää pallon, katkon ja kirjausviiveen – ei pallon kestoa.</p>
          <p>Erittäin: {tp.perSet.map((x) => `${x.period}. ${x.median} s`).join(' · ')} <span className="text-zinc-500">(ilman ≥{BREAK_SEC} s katkoja)</span></p>
          {tp.split && <p>Pitkät (&gt;{tp.split.cut} s) / lyhyet välit, pisteet: {home} {tp.split.long.A}/{tp.split.short.A} · {away} {tp.split.long.B}/{tp.split.short.B} <span className="text-zinc-500">(n {tp.split.long.n}/{tp.split.short.n}, ei aikalisän/vaihdon jälkeen)</span></p>}
          {tp.breaks.length > 0 && <p className="text-zinc-400">Katkot ≥{BREAK_SEC} s: {tp.breaks.map((b) => `${b.period}. ${b.score} ${b.sec} s${b.afterTimeout ? ' aikalisä' : b.afterSub ? ' vaihto' : ''}`).join(' · ')}</p>}
        </details>
      )}
    </section>
  )
}
