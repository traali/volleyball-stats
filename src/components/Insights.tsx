import { useEffect, useMemo, useState } from 'react'
import { basedOn, isPreliminary } from '../domain/gameFlow'
import { aiPrompt, countedFacts, insightInputs, type Finding } from '../domain/insights'
import type { PreviewData } from './MatchPreview'

type Row = Record<string, unknown>

interface LM { availability: () => Promise<string>; create: () => Promise<{ prompt: (t: string) => Promise<string>; destroy?: () => void }> }
const lm = (): LM | null => {
  const w = globalThis as unknown as { LanguageModel?: LM }
  return w.LanguageModel && typeof w.LanguageModel.create === 'function' ? w.LanguageModel : null
}

export function Insights({ preview, raw, phase }: { preview: PreviewData; raw: Row | null; phase: string }) {
  const { pre, live, liveBase } = useMemo(() => insightInputs(preview, raw, phase), [preview, raw, phase])
  const facts = useMemo(() => countedFacts(preview, raw, phase), [preview, raw, phase])
  return (
    <section className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3" data-testid="insights">
      <h2 className="text-sm font-bold text-white">Ennuste ja havainnot</h2>
      <p className="text-[11px] text-zinc-500">Johdettu TASO-datasta laskemalla. Tekoälyhavainnot vain, jos laitteessa on paikallinen malli.</p>
      {pre && <ul className="text-xs text-zinc-200 space-y-1 list-disc pl-4">{pre.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      {live && <Holds rows={live} live={phase === 'live'} base={liveBase} />}
      <LocalAi facts={facts} live={phase === 'live'} />
    </section>
  )
}

function Holds({ rows, live, base }: { rows: Finding[]; live: boolean; base: number | null }) {
  return (
    <div className="space-y-1" data-testid="pysyy-poikkeaa">
      <h3 className="text-xs font-bold text-zinc-200">Pysyy / Poikkeaa{live ? '' : ' (ottelu vs. viime ottelut)'}{base != null && <span className="font-normal text-zinc-500"> · {basedOn(base)}</span>}{base != null && isPreliminary(base) && <span className="ml-1 rounded bg-amber-900 px-1 text-[10px] font-bold text-amber-200" data-testid="alustava">alustava</span>}</h3>
      {!rows.length ? <p className="text-sm text-zinc-500">Ei tietoa: ei vielä tarpeeksi pisteitä vertailuun.</p> : (
        <ul className="text-xs space-y-0.5">
          {rows.map((f, i) => <li key={i}><span className={`font-bold ${f.holds ? 'text-emerald-400' : 'text-rose-400'}`}>{f.holds ? 'Pysyy' : 'Poikkeaa'}</span> {f.text}</li>)}
        </ul>
      )}
    </div>
  )
}

function LocalAi({ facts, live }: { facts: string[]; live: boolean }) {
  const [ok, setOk] = useState(false)
  const [out, setOut] = useState<string>('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const m = lm()
    if (!m) return
    void m.availability().then((a) => setOk(a === 'available' || a === 'readily')).catch(() => setOk(false))
  }, [])
  if (!ok || !facts.length) return null
  const run = async () => {
    setBusy(true)
    try {
      const sess = await lm()!.create()
      const text = await sess.prompt(aiPrompt(facts, live))
      sess.destroy?.()
      setOut(text)
    } catch { setOut('Paikallinen tekoäly ei vastannut.') }
    setBusy(false)
  }
  return (
    <div className="space-y-1" data-testid="local-ai">
      <button type="button" onClick={() => void run()} disabled={busy} className="min-h-[44px] rounded-xl bg-zinc-800 px-3 text-xs font-bold">{busy ? 'Lasketaan…' : 'Paikallinen tekoäly: mikä ratkaisee nyt?'}</button>
      {out && <p className="text-xs text-zinc-300">{out} <span className="text-zinc-500">(paikallinen tekoäly laitteella, vain lasketuista luvuista)</span></p>}
    </div>
  )
}
