import { courtNow, hotPlayers, rotationAnalysis, serveStats, setFlows, type RotationAnalysis, type RotationScore } from '../domain/gameFlow'

type Row = Record<string, unknown>
const NONE = 'text-sm text-zinc-500'
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']
const s = (v: unknown) => (v == null ? '' : String(v).trim())

function inRun(pts: { winner: string }[], i: number, min = 3): boolean {
  let a = i, b = i
  while (a > 0 && pts[a - 1].winner === pts[i].winner) a--
  while (b < pts.length - 1 && pts[b + 1].winner === pts[i].winner) b++
  return b - a + 1 >= min
}

export function PointTimeline({ raw, home, away }: { raw: Row; home: string; away: string }) {
  const flows = setFlows(raw)
  if (!flows.length) return <p className={NONE}>Ei tietoa: pistetapahtumia ei ole kirjattu.</p>
  const nm = (x: string) => (x === 'A' ? home : away)
  return (
    <div className="space-y-4" data-testid="point-timeline">
      <p className="text-[11px] text-zinc-500">● = syöttävä joukkue ennen palloa. Lihavoitu = pisteen voittaja. Korostettu = putki, vähintään 3 peräkkäistä pistettä. Uusin ensin.</p>
      {[...flows].reverse().map((f) => (
        <section key={f.period} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">{f.period}. erä · {f.points[f.points.length - 1].a}–{f.points[f.points.length - 1].b}</h3>
          <p className="text-[11px] text-zinc-400">Pisin putki: {home} {f.longest.A} · {away} {f.longest.B}</p>
          {f.runs.length > 0 && <ul className="text-[11px] text-zinc-300">{f.runs.map((r, i) => <li key={i}>Putki {nm(r.side)}: {r.length} p ({r.from} → {r.to})</li>)}</ul>}
          <ol className="text-xs font-mono">
            {[...f.points].reverse().map((p, i) => (
              <li key={i} className={`flex gap-2 border-t border-zinc-800 py-1 ${inRun(f.points, f.points.length - 1 - i) ? (p.winner === 'A' ? 'bg-amber-500/10' : 'bg-sky-500/10') : ''}`}>
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

export function MatchRotationAnalysis({ raw, home, away, usual }: { raw: Row; home: string; away: string; usual?: (RotationAnalysis | null | undefined)[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-white">Kierrot tässä ottelussa</h2>
      <p className="text-[11px] text-zinc-500">Kierto 1 = erän aloitusasetelma; joukkue kiertää voittaessaan pisteen vastustajan syötöstä. Pisteet voitettu–menetetty kunkin kierron aikana.</p>
      <RotationAnalysisView title={home} a={rotationAnalysis([raw], s(raw.team_A_id))} />
      {usual?.[0] && <RotationAnalysisView title={`${home}: tavallisesti (viime ${usual[0].games} ott.)`} a={usual[0]} />}
      <RotationAnalysisView title={away} a={rotationAnalysis([raw], s(raw.team_B_id))} />
      {usual?.[1] && <RotationAnalysisView title={`${away}: tavallisesti (viime ${usual[1].games} ott.)`} a={usual[1]} />}
    </section>
  )
}

type Roster = { number: string; name: string }[]
const who = (roster: Roster | undefined, shirt: string) => { const p = roster?.find((x) => x.number === shirt); return `#${shirt}${p ? ` ${p.name.split(' ').slice(-1)[0]}` : ''}` }

/** Main in-game panels: kuumana, syötöt, putket (rotation + server) — per team, counted from piste/pelipaikat. */
export function InGameTactics({ raw, teams, part }: { raw: Row; teams: { id: string; name: string; roster?: Roster; games: Row[] }[]; part: 'hot' | 'serve' | 'runs' }) {
  const flows = setFlows(raw)
  return (
    <section className="space-y-2" data-testid={`in-game-${part}`}>
      <h2 className="text-sm font-bold text-white">{part === 'hot' ? 'Kuumana' : part === 'serve' ? 'Syötöt pelaajittain' : 'Putket'}</h2>
      {teams.map((t) => {
        const side = s(raw.team_A_id) === t.id ? 'A' : 'B'
        const hot = hotPlayers(raw, t.id, t.games).filter((h) => h.recent >= 2).slice(0, 3)
        const sv = serveStats([raw], t.id)
        const runs = flows.flatMap((f) => f.runs.filter((r) => r.side === side).map((r) => ({ ...r, period: f.period }))).reverse()
        return (
          <div key={t.id} className="space-y-1 rounded-xl bg-zinc-900 p-3">
            <h3 className="text-xs font-bold text-white">{t.name}</h3>
            {part === 'hot' && <div>
              <p className="text-[11px] font-semibold text-orange-300">Kuumana (viimeiset {hot[0]?.window || 20} palloa vs tavallinen)</p>
              {hot.length ? hot.map((h) => <p key={h.shirt} className="text-xs">{who(t.roster, h.shirt)}: <b>{h.recent} p</b> <span className="text-zinc-500">(odotus {h.expected.toFixed(1)})</span>{h.recent >= h.expected + 2 ? ' 🔥' : ''}</p>) : <p className={NONE}>Ei vielä tarpeeksi palloja.</p>}
            </div>}
            {part === 'serve' && <div>
              <p className="text-[11px] font-semibold text-sky-300">Syötöt</p>
              {sv.length ? (
                <table className="w-full text-xs"><thead><tr className="text-zinc-500"><th className="text-left">Syöttäjä</th><th>Syött.</th><th>P omalla</th><th>Ässä</th><th>Virhe</th><th>Putki</th></tr></thead>
                  <tbody>{sv.map((x) => <tr key={x.shirt}><td>{who(t.roster, x.shirt)}</td><td className="text-center">{x.serves}</td><td className="text-center">{x.won}</td><td className="text-center">{x.aces}</td><td className="text-center">{x.errors}</td><td className="text-center">{x.bestRun}</td></tr>)}</tbody></table>
              ) : <p className={NONE}>Syöttäjiä ei voi päätellä (pelipaikat puuttuvat).</p>}
            </div>}
            {part === 'runs' && <div>
              <p className="text-[11px] font-semibold text-emerald-300">Putket (≥3), uusin ensin</p>
              {runs.length ? runs.map((r, i) => <p key={i} className="text-xs">{r.period}. erä: <b>{r.length} p</b> {r.from} → {r.to}, kierto {r.rotation}{r.servers.length ? `, syötti ${r.servers.map((x) => who(t.roster, x)).join(', ')}` : ''}</p>) : <p className={NONE}>Ei putkia.</p>}
            </div>}
          </div>
        )
      })}
    </section>
  )
}
