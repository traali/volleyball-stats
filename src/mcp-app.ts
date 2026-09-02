/**
 * Volleyball Stats MCP App Tool Handler
 * Standard: @modelcontextprotocol/ext-apps (2026 UI Capabilities Standard)
 * Reference: https://modelcontextprotocol.info/blog/mcp-apps-ui-capabilities/
 *
 * Exposes interactive Volleyball set breakdowns and team form tools with `_meta.ui.resourceUri`.
 */

import { formatVolleyballStatsContract } from './types/contracts'
import type { SportStatsContract } from '../../contracts'

export interface McpToolResponse {
    content: Array<{
        type: 'text' | 'resource'
        text?: string
        resource?: {
            uri: string
            mimeType: string
            text?: string
        }
    }>
    _meta?: {
        ui?: {
            resourceUri: string
        }
    }
}

/**
 * MCP App Tool: get_volleyball_sets
 * Returns structured SportStatsContract data and an interactive UI widget resource URI.
 */
export async function getVolleyballSetsTool(args: {
    homeTeam: string
    awayTeam: string
    leagueName?: string
}): Promise<McpToolResponse> {
    const stats: SportStatsContract = formatVolleyballStatsContract({
        matchId: `${args.homeTeam}-${args.awayTeam}`,
        recentForm: ['W', 'W', 'L', 'W', 'W'],
        rank: 2,
        totalTeams: 10,
        points: 24,
        playedMatches: 9,
        h2h: { wins: 3, draws: 0, losses: 1, lastResult: '3-1' },
        setWinRate: '75%',
    })

    const summary = `🏐 Lentopallon eräanalyysi (${args.homeTeam} vs ${args.awayTeam}): Sarjasijoitus #${
        stats.standingsSummary?.rank || 2
    }, Viimeisimmät ottelut [${(stats.recentForm || []).join('-')}]. Keskinäiset: ${
        stats.headToHead?.wins || 0
    } voittoa.`

    return {
        content: [
            {
                type: 'text',
                text: summary,
            },
        ],
        _meta: {
            ui: {
                resourceUri: `ui://volleyball/sets?home=${encodeURIComponent(args.homeTeam)}&away=${encodeURIComponent(
                    args.awayTeam
                )}&league=${encodeURIComponent(args.leagueName || 'Lentopallosarja')}`,
            },
        },
    }
}
