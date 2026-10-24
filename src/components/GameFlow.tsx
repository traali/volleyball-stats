import { courtNow, rotationAnalysis, setFlows, type RotationAnalysis, type RotationScore } from '../domain/gameFlow'

type Row = Record<string, unknown>
const NONE = 'text-sm text-zinc-500'
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']
const s = (v: unknown) => (v == null ? '' : String(v).trim())

export function PointTimeline({ raw, home, away }: { raw: Row; home: string; away: string }) {
  const flows = setFlows(raw)
  if (!flows.length) return <p className={NONE}>Ei tietoa: pistetapahtumia ei ole kirjattu.</p>
  const nm = (x: string) => (x === 'A' ? home : away)
  return (
    <div className="space-y-4" data-testid="point-timeline">
      <p className="text-[11px] text-zinc-500">● = syöttävä joukkue ennen palloa. Lihavoitu = pisteen voittaja. Putki = vähintään 3 peräkkäistä pistettä.</p>
      {[...flows].reverse().map((f) => (
        <section key={f.period} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">{f.period}. erä · {f.points[f.points.length - 1].a}–{f.points[f.points.length - 1].b}</h3>
          <p className="text-[11px] text-zinc-400">Pisin putki: {home} {f.longest.A} · {away} {f.longest.B}</p>
          {f.runs.length > 0 && <ul className="text-[11px] text-zinc-300">{f.runs.map((r, i) => <li key={i}>Putki {nm(r.side)}: {r.length} p ({r.from} → {r.to})</li>)}</ul>}
          <ol className="text-xs font-mono">
            {[...f.points].reverse().map((p, i) => (
              <li key={i} className="flex gap-2 border-t border-zinc-800 py-0.5">
                <span className="w-16 text-zinc-500">{p.time.slice(0, 8)}</span>
                <span className="w-4 text-amber-300">{p.server === 'A' ? '●' : ''}</span>
                <span className={p.winner === 'A' ? 'font-bold text-white' : 'text-zinc-400'}>{p.a}</span>–<span className={p.winner === 'B' ? 'font-bold text-white' : 'text-zinc-400'}>{p.b}</span>
                <span className="w-4 text-amber-300">{p.server === 'B' ? '●' : ''}</span>
                <span className="truncate text-zinc-500">{p.shirt ? `#${p.shirt} ` : ''}{nm(p.winner)}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

export function CourtNowBoard({ raw, home, away, live }: { raw: Row; home: string; away: string; live: boolean }) {
  const now = courtNow(raw)
  return (
    <section className="space-y-2" data-testid="court-now">
      <h2 className="text-sm font-bold text-white">{live ? 'Kentällä nyt' : 'Viimeisin kenttäasetelma'}</h2>
      {!now.length ? <p className={NONE}>Ei tietoa: pelipaikkoja ei ole kirjattu.</p> : now.map((c) => (
        <div key={c.side}>
          <p className="text-[11px] text-zinc-400 mb-1">{c.side === 'A' ? home : away} · {c.period}. erä {c.score}{c.libero ? ` · libero #${c.libero}` : ''}</p>
          <div className="text-[10px] text-zinc-500 text-center">verkko</div>
          {[[3, 2, 1], [4, 5, 0]].map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-1 mb-1">
              {row.map((k) => <div key={k} className="rounded border border-zinc-700 p-1 text-center"><div className="text-[10px] text-zinc-500">{ROMAN[k]}</div><div className="font-mono font-bold">#{c.shirts[k]}</div></div>)}
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}

const fmt = (r: RotationScore) => `${r.won}–${r.lost} (${r.net >= 0 ? '+' : ''}${r.net})`

export function RotationAnalysisView({ title, a }: { title: string; a: RotationAnalysis | null }) {
  return (
    <div className="space-y-1 text-xs" data-testid="rotation-analysis">
      <p className="font-bold text-zinc-200">{title}{a ? ` · ${a.games} ott.` : ''}</p>
      {!a ? <p className={NONE}>Ei tietoa: pisteitä ja syöttövuoroja ei ole kirjattu.</p> : (
        <>
          <p><span className="text-emerald-400 font-bold">Vahvat kierrot:</span> {a.strong.map((r) => `kierto ${r.rotation} ${fmt(r)}`).join(' · ')}</p>
          <p><span className="text-rose-400 font-bold">Haastavat kierrot:</span> {a.weak.map((r) => `kierto ${r.rotation} ${fmt(r)}`).join(' · ')}</p>
          <div className="grid grid-cols-6 gap-1 text-center">
            {a.lines.map((r) => <div key={r.rotation} className={`rounded p-1 ${r.net > 0 ? 'bg-emerald-500/15' : r.net < 0 ? 'bg-rose-500/15' : 'bg-zinc-800'}`}><div className="text-[10px] text-zinc-500">{r.rotation}</div><div className="font-mono">{r.net >= 0 ? '+' : ''}{r.net}</div></div>)}
          </div>
        </>
      )}
    </div>
  )
}

export function MatchRotationAnalysis({ raw, home, away }: { raw: Row; home: string; away: string }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-white">Kierrot tässä ottelussa</h2>
      <p className="text-[11px] text-zinc-500">Kierto 1 = erän aloitusasetelma; joukkue kiertää voittaessaan pisteen vastustajan syötöstä. Pisteet voitettu–menetetty kunkin kierron aikana.</p>
      <RotationAnalysisView title={home} a={rotationAnalysis([raw], s(raw.team_A_id))} />
      <RotationAnalysisView title={away} a={rotationAnalysis([raw], s(raw.team_B_id))} />
    </section>
  )
}
