import { useEffect, useRef, useState } from 'react'
import { BALL_LABEL, CONF_LABEL, STAT_LABEL, clock, fetchAnalysis, teamStats, youtubeLink, type BallField, type MatchAnalysis } from '../domain/videoAnalysis'

interface YTPlayer { seekTo(s: number, allow: boolean): void; playVideo(): void; destroy(): void }
interface YTNamespace { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer }
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }

let apiPromise: Promise<YTNamespace> | null = null
function loadYouTubeApi(): Promise<YTNamespace> {
  const w = window as YTWindow
  if (w.YT?.Player) return Promise.resolve(w.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = w.onYouTubeIframeAPIReady
      w.onYouTubeIframeAPIReady = () => { prev?.(); if (w.YT) resolve(w.YT) }
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    })
  }
  return apiPromise
}

const TYPE_LABEL: Record<string, string> = {
  attack: 'hyökkäys', serve: 'syöttö', block: 'torjunta', error_attack: 'hyökkäysvirhe', error_serve: 'syöttövirhe',
  error_technical: 'tekninen virhe', error_block: 'torjuntavirhe', error_reception: 'vastaanottovirhe',
}
const EVENT_ICON: Record<string, string> = { timeout: '⏱', sub: '⇄', replay: '👍', fault: '⚠', camera: '🎥', other: '•' }

export function VideoAnalysisSection({ matchId }: { matchId: string }) {
  const [data, setData] = useState<MatchAnalysis | null>(null)
  useEffect(() => {
    let stop = false
    void fetchAnalysis(matchId).then((d) => { if (!stop) setData(d) })
    return () => { stop = true }
  }, [matchId])
  if (!data) return null
  return <VideoAnalysisView data={data} />
}

function VideoAnalysisView({ data }: { data: MatchAnalysis }) {
  const host = useRef<HTMLDivElement>(null)
  const player = useRef<YTPlayer | null>(null)
  const pending = useRef<number | null>(null)
  const ready = useRef(false)
  const setKeys = Object.keys(data.sets).sort()
  const [set, setSet] = useState(setKeys[0] ?? '1')
  const [current, setCurrent] = useState<string | null>(null)
  const name = (side: 'home' | 'away') => (side === 'home' ? data.home : data.away)

  useEffect(() => {
    let alive = true
    void loadYouTubeApi().then((YT) => {
      if (!alive || !host.current) return
      const el = document.createElement('div')
      host.current.appendChild(el)
      player.current = new YT.Player(el, {
        videoId: data.video.id,
        host: 'https://www.youtube-nocookie.com',
        width: '100%', height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            ready.current = true
            if (pending.current != null) { player.current?.seekTo(pending.current, true); player.current?.playVideo(); pending.current = null }
          },
        },
      })
    })
    return () => { alive = false; ready.current = false; player.current?.destroy(); player.current = null }
  }, [data.video.id])

  const seek = (t: number, key: string) => {
    setCurrent(key)
    if (player.current && ready.current) { player.current.seekTo(t, true); player.current.playVideo() } else pending.current = t
    host.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const stats = teamStats(data)
  const rallies = data.sets[set] ?? []
  const analysed = data.analysedSets.includes(Number(set))

  return (
    <section data-testid="video-analysis" className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <h2 className="text-sm font-bold text-white">Videoanalyysi</h2>
      <div ref={host} data-testid="va-player" className="relative aspect-video w-full overflow-hidden rounded-lg bg-black [&>*]:absolute [&>*]:inset-0 [&>*]:h-full [&>*]:w-full" />
      <p className="text-xs text-zinc-500">
        Napauta pallorallia tai tapahtumaa, niin video siirtyy kohtaan.{data.video.endsAt ? ` Video päättyy: ${data.video.endsAt}.` : ''}
      </p>

      <div role="tablist" className="flex flex-wrap gap-1">
        {setKeys.map((k) => (
          <button key={k} role="tab" aria-selected={k === set} onClick={() => setSet(k)}
            className={`min-h-[44px] rounded-lg px-3 text-xs font-bold ${k === set ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
            {k}. erä{data.setScores[k] ? ` ${data.setScores[k]}` : ''}
          </button>
        ))}
      </div>
      {!analysed && <p className="text-xs text-zinc-500">Tämän erän videoanalyysi on kesken; viralliset pisteet ja videoajat näytetään.</p>}

      <ol className="divide-y divide-zinc-800 text-xs">
        {rallies.map((r) => {
          const key = `${set}:${r.score}`
          const t = r.youtubeS
          return (
            <li key={key} className={current === key ? 'bg-amber-400/10' : ''}>
              <div className="flex items-start gap-2 py-1">
                <button disabled={t == null} onClick={() => t != null && seek(t, key)}
                  className="min-h-[44px] flex-1 text-left disabled:opacity-60">
                  <span className="font-mono font-bold text-amber-300">{r.score}</span>
                  <span className="ml-2 text-zinc-200">{name(r.officialWinner)}</span>
                  {r.torneopalType && <span className="ml-2 text-zinc-500">{TYPE_LABEL[r.torneopalType] ?? r.torneopalType}</span>}
                  <span className="ml-2 font-mono text-zinc-500">{t != null ? `▶ ${clock(t)}` : 'ei videolla'}</span>
                  {r.finding
                    ? <span className="block text-zinc-300">Video: {r.finding.text} · {CONF_LABEL[r.finding.confidence]}</span>
                    : analysed && <span className="block text-zinc-600">Ei vahvistettu videolta</span>}
                  {r.ball && (
                    <span className="block text-zinc-400">
                      {(Object.entries(r.ball) as [BallField, { text: string; confidence: keyof typeof CONF_LABEL }][])
                        .map(([f, v]) => `${BALL_LABEL[f]}: ${v.text} (${CONF_LABEL[v.confidence]})`).join(' · ')}
                    </span>
                  )}
                  {r.note && <span className="block italic text-zinc-500">{r.note}</span>}
                </button>
                {t != null && (
                  <a href={youtubeLink(data.video.id, t)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center text-[11px] text-zinc-500 underline">YouTube ↗</a>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {data.events.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-zinc-200">Tapahtumat</h3>
          <ol className="divide-y divide-zinc-800 text-xs">
            {data.events.map((e, i) => {
              const key = `ev${i}`
              return (
                <li key={key} className={`flex items-start gap-2 ${current === key ? 'bg-amber-400/10' : ''}`}>
                  <button disabled={e.youtubeS == null} onClick={() => e.youtubeS != null && seek(e.youtubeS, key)}
                    className="min-h-[44px] flex-1 text-left disabled:opacity-60">
                    <span className="mr-1">{EVENT_ICON[e.kind] ?? '•'}</span>
                    <span className="font-mono text-amber-300">{e.set}. erä {e.score}</span>
                    <span className="ml-2 text-zinc-300">{e.text}</span>
                    {e.youtubeS != null && <span className="ml-2 font-mono text-zinc-500">▶ {clock(e.youtubeS)}</span>}
                  </button>
                  {e.youtubeS != null && (
                    <a href={youtubeLink(data.video.id, e.youtubeS)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center text-[11px] text-zinc-500 underline">YouTube ↗</a>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {stats.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-zinc-200">Joukkuetilastot (videolta vahvistetut pisteet)</h3>
          <table className="w-full text-xs">
            <thead><tr className="text-zinc-500"><th className="text-left font-normal">Tyyppi</th><th className="text-right font-normal">{data.home}</th><th className="text-right font-normal">{data.away}</th></tr></thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.kind} className="border-t border-zinc-800"><td className="py-1 text-zinc-300">{STAT_LABEL[s.kind]}</td><td className="text-right font-mono">{s.home}</td><td className="text-right font-mono">{s.away}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details className="text-xs text-zinc-400">
        <summary className="min-h-[44px] cursor-pointer text-zinc-400">Menetelmä ja rajoitukset</summary>
        <ul className="list-disc space-y-1 pl-4">{data.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </details>
    </section>
  )
}
