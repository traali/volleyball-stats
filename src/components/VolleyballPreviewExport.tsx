import { useMemo, useState } from 'react'
import type { VolleyballMatchDetail, VolleyballPlayerStat, VolleyballStandingRow } from '../types/volleyball'
import { Check, Copy, Download } from 'lucide-react'
import { buildVolleyballPreviewMd } from '../utils/buildVolleyballPreviewMd'

interface VolleyballPreviewExportProps {
  match: VolleyballMatchDetail
  standings?: VolleyballStandingRow[]
  players?: VolleyballPlayerStat[]
}

export function VolleyballPreviewExport({ match, standings = [], players = [] }: VolleyballPreviewExportProps) {
  const [copied, setCopied] = useState(false)
  const md = useMemo(() => buildVolleyballPreviewMd({ match, standings, players }), [match, standings, players])

  const copy = async () => {
    await navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = `${match.homeTeamName}_vs_${match.awayTeamName}.md`.replace(/\s+/g, '_')
    el.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white">AI-ennakko (.md kuten jalkapallo)</h3>
          <p className="text-xs text-zinc-400">Kopioi malliin — vain tämän dokumentin luvut</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={copy} className="inline-flex items-center gap-2 py-2 px-3 rounded-xl bg-zinc-800 text-xs font-semibold">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Kopioitu' : 'Kopioi markdown'}
          </button>
          <button type="button" onClick={download} className="inline-flex items-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold">
            <Download className="w-4 h-4" /> Lataa .md
          </button>
        </div>
      </div>
      <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-[28rem] overflow-auto">
        {md}
      </pre>
    </div>
  )
}
