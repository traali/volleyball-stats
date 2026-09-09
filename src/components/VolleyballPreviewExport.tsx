import { useState } from 'react'
import type { VolleyballMatchDetail } from '../types/volleyball'
import { Share2, Check, Copy } from 'lucide-react'

interface VolleyballPreviewExportProps {
  match: VolleyballMatchDetail
}

export function VolleyballPreviewExport({ match }: VolleyballPreviewExportProps) {
  const [copied, setCopied] = useState(false)

  const finishedSets = match.sets.filter((s) => s.status === 'finished')
  const setsScoreString = finishedSets.map((s) => `${s.homeScore}-${s.awayScore}`).join(', ')

  const briefingText = [
    `🏐 LENTOPALLO: ${match.tournamentName || 'Turnausottelu'}`,
    `🏆 ${match.homeTeamName} ${match.setsWonHome} - ${match.setsWonAway} ${match.awayTeamName}`,
    `📊 Erät: ${setsScoreString || 'Ei pelattu'}`,
    `📍 ${match.venue || 'Pelipaikka'}${match.courtName ? ` (${match.courtName})` : ''}`,
    `⏰ Alkamisaika: ${match.scheduledTime || '13:00'}`,
    `🔗 Katso tarkat erätilastot: https://volleyball-stats-7xq.pages.dev/match/${encodeURIComponent(match.id)}`,
  ].join('\n')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(briefingText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.warn('Clipboard write failed:', err)
    }
  }

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(briefingText)}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white">1-Tap WhatsApp Briefing</h3>
        <p className="text-xs text-zinc-400">Jaa ottelun tilanne tai lopputulos suoraan vanhempien WhatsApp-ryhmään</p>
      </div>

      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3 backdrop-blur-md">
        <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
          {briefingText}
        </pre>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all"
          >
            <Share2 className="w-4 h-4" />
            Avaa WhatsAppissa
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-zinc-700 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Kopioitu!' : 'Kopioi'}
          </button>
        </div>
      </div>
    </div>
  )
}
