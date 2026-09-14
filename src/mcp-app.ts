/**
 * Volleyball Stats MCP App Tool Handler & WebMCP Browser Registry
 * Standard: @modelcontextprotocol/ext-apps (2026 UI Capabilities Standard)
 * Reference: https://modelcontextprotocol.info/blog/mcp-apps-ui-capabilities/
 *
 * Exposes interactive Volleyball set breakdowns and team form tools with `_meta.ui.resourceUri`.
 */

import { formatVolleyballStatsContract } from './types/contracts'
import type { SportStatsContract } from './types/contracts'

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
            {
                type: 'resource',
                resource: {
                    uri: 'data://volleyball/stats.json',
                    mimeType: 'application/json',
                    text: JSON.stringify(stats),
                },
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

export interface ModelContextTool {
    name: string
    description: string
    inputSchema: {
        type: string
        properties?: Record<string, unknown>
        required?: string[]
    }
    execute: (args: Record<string, unknown>) => Promise<unknown>
}

export interface ModelContextRegistry {
    registerTool: (tool: ModelContextTool) => Promise<void> | void
    unregisterTool?: (name: string) => Promise<void> | void
    getTools: () => ModelContextTool[]
    listTools: () => Promise<{ tools: Array<{ name: string; description: string; inputSchema: ModelContextTool['inputSchema'] }> }>
    callTool: (params: { name: string; arguments?: Record<string, unknown> }) => Promise<McpToolResponse>
    executeTool: (name: string, args?: Record<string, unknown>) => Promise<unknown>
}

declare global {
    interface Document {
        modelContext?: ModelContextRegistry
    }
    interface Navigator {
        modelContext?: ModelContextRegistry
    }
    interface Window {
        modelContext?: ModelContextRegistry
    }
}

let _volleyballMessageHandler: ((event: MessageEvent) => void) | null = null

export function registerVolleyballWebMCP(): ModelContextRegistry | undefined {
    if (typeof window === 'undefined') return

    const registeredTools = new Map<string, ModelContextTool>()

    const registry: ModelContextRegistry = {
        registerTool: async (tool: ModelContextTool) => {
            registeredTools.set(tool.name, tool)
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('webmcp:tool_registered', { detail: { toolName: tool.name } }))
            }
        },
        unregisterTool: async (name: string) => {
            registeredTools.delete(name)
        },
        getTools: () => Array.from(registeredTools.values()),
        listTools: async () => ({
            tools: Array.from(registeredTools.values()).map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema,
            })),
        }),
        callTool: async (params: { name: string; arguments?: Record<string, unknown> }) => {
            const tool = registeredTools.get(params.name)
            if (!tool) {
                return {
                    content: [{ type: 'text', text: `Error: Tool '${params.name}' not found in Volleyball Stats WebMCP.` }],
                }
            }
            try {
                const res = await tool.execute(params.arguments || {})
                if (res && typeof res === 'object' && 'content' in res) {
                    return res as McpToolResponse
                }
                return {
                    content: [{
                        type: 'text',
                        text: typeof res === 'string' ? res : JSON.stringify(res, null, 2),
                    }],
                }
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err)
                return {
                    content: [{ type: 'text', text: `Error executing '${params.name}': ${errorMessage}` }],
                }
            }
        },
        executeTool: async (name: string, args: Record<string, unknown> = {}) => {
            const tool = registeredTools.get(name)
            if (!tool) throw new Error(`Tool '${name}' not found`)
            return tool.execute(args)
        },
    }

    if (typeof document !== 'undefined') {
        try {
            Object.defineProperty(document, 'modelContext', {
                value: registry,
                configurable: true,
                enumerable: true,
                writable: true,
            })
        } catch {
            ;(document as unknown as { modelContext?: ModelContextRegistry }).modelContext = registry
        }
    }
    if (typeof navigator !== 'undefined') {
        try {
            Object.defineProperty(navigator, 'modelContext', {
                value: registry,
                configurable: true,
                enumerable: true,
                writable: true,
            })
        } catch {
            ;(navigator as unknown as { modelContext?: ModelContextRegistry }).modelContext = registry
        }
    }
    if (typeof window !== 'undefined') {
        ;(window as unknown as { modelContext?: ModelContextRegistry }).modelContext = registry

        if (_volleyballMessageHandler) {
            window.removeEventListener('message', _volleyballMessageHandler)
        }
        const messageHandler = async (event: MessageEvent) => {
            const data = event.data
            if (!data || data.type !== 'webmcp:request' || !data.id) return

            try {
                if (data.method === 'tools/list' || data.method === 'listTools') {
                    const result = await registry.listTools()
                    window.postMessage({ type: 'webmcp:response', id: data.id, result }, '*')
                } else if (data.method === 'tools/call' || data.method === 'callTool') {
                    const result = await registry.callTool(data.params || { name: '', arguments: {} })
                    window.postMessage({ type: 'webmcp:response', id: data.id, result }, '*')
                }
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'WebMCP execution failed'
                window.postMessage({
                    type: 'webmcp:response',
                    id: data.id,
                    error: { message: errorMessage },
                }, '*')
            }
        }
        _volleyballMessageHandler = messageHandler
        window.addEventListener('message', messageHandler)

        window.dispatchEvent(
            new CustomEvent('webmcp:ready', { detail: { location: 'navigator.modelContext & document.modelContext' } })
        )
    }

    // Register get_volleyball_sets tool
    registry.registerTool({
        name: 'get_volleyball_sets',
        description: 'Returns volleyball set breakdowns, point totals, deuce thresholds, and UI widget URI.',
        inputSchema: {
            type: 'object',
            properties: {
                homeTeam: { type: 'string', description: 'Home team name' },
                awayTeam: { type: 'string', description: 'Away team name' },
                leagueName: { type: 'string', description: 'Optional competition name' },
            },
            required: ['homeTeam', 'awayTeam'],
        },
        execute: async (args) => getVolleyballSetsTool(args as { homeTeam: string; awayTeam: string; leagueName?: string }),
    })

    // Register get_volleyball_standings tool
    registry.registerTool({
        name: 'get_volleyball_standings',
        description: 'Returns volleyball standings, Lentopalloliitto 3-1-0/3-2-1 table points, set quotients and ball ratios.',
        inputSchema: {
            type: 'object',
            properties: {
                pool: { type: 'string', description: 'Pool or division identifier' },
            },
        },
        execute: async ({ pool }) => ({
            pool: (pool as string) || 'B-tytöt SM-sarja',
            teams: [
                { rank: 1, team: 'PuMa Volley', played: 6, won3_0_or_3_1: 5, won3_2: 1, lost2_3: 0, lost0_3_or_1_3: 0, points: 17, setRatio: '18/4' },
                { rank: 2, team: 'LP Viesti Akatemia', played: 6, won3_0_or_3_1: 4, won3_2: 0, lost2_3: 1, lost0_3_or_1_3: 1, points: 13, setRatio: '14/8' },
            ],
            pointsRule: '3-0 / 3-1 win: 3p (loser 0p). 3-2 win: 2p (loser 1p).',
        }),
    })

    console.log('✨ [WebMCP] Successfully registered Volleyball Stats tools into navigator.modelContext & document.modelContext')
    return registry
}
