/**
 * Volleyball Stats MCP App Tool Handler & WebMCP Browser Registry
 * Standard: @modelcontextprotocol/ext-apps (2026 UI Capabilities Standard)
 * Reference: https://modelcontextprotocol.info/blog/mcp-apps-ui-capabilities/
 *
 * Exposes interactive Volleyball set breakdowns and team form tools with `_meta.ui.resourceUri`.
 */

import { formatVolleyballStatsContract } from './types/contracts'
import type { SportStatsContract } from './types/contracts'
import { resultIsTrusted, setsFromMatch, setWasPlayed } from './domain/rally'
import { fetchGroup, fetchMatchRaw, fetchPlayer, searchDiscovery } from './services/discovery'

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
    homeTeam?: string
    awayTeam?: string
    leagueName?: string
    matchId?: string
}): Promise<McpToolResponse> {
    const matchId = String(args.matchId || '').trim()
    if (!matchId) {
        return {
            content: [{
                type: 'text',
                text: 'matchId is required. Set scores are not invented from team names.',
            }],
        }
    }
    const loaded = await getVolleyballMatchTool({ matchId })
    const stats: SportStatsContract = formatVolleyballStatsContract({
        matchId,
        baseUrl: 'https://volleyball-stats-7xq.pages.dev',
    })
    return {
        content: loaded.content,
        _meta: {
            ui: {
                resourceUri: `ui://volleyball/sets?matchId=${encodeURIComponent(matchId)}`,
            },
        },
        ...('match' in loaded ? { match: loaded.match, stats } : { stats }),
    }
}

function text(message: string, extra?: Record<string, unknown>): McpToolResponse & Record<string, unknown> {
    return { content: [{ type: 'text', text: message }], ...extra }
}

function field(row: Record<string, unknown>, key: string): string {
    const value = row[key]
    return value == null ? '' : String(value).trim()
}

export async function getVolleyballMatchTool(args: Record<string, unknown>) {
    const matchId = String(args.matchId || '').trim()
    if (!matchId) return text('matchId is required. Do not invent a set score.')
    const raw = await fetchMatchRaw(matchId)
    if (!raw) return text(`Ottelua ${matchId} ei löytynyt TASOsta.`)
    const sets = setsFromMatch(raw).filter(setWasPlayed)
    const home = field(raw, 'team_A_name')
    const away = field(raw, 'team_B_name')
    const trusted = resultIsTrusted(raw)
    const setText = sets.map((set) => `${set.number}. erä ${set.home}–${set.away}`).join(', ')
    const summary = trusted
        ? `${home} ${field(raw, 'fs_A')}–${field(raw, 'fs_B')} ${away}. ${setText}`
        : `${home} vs ${away} ${field(raw, 'date')} ${field(raw, 'time')}. Ei kirjattua tulosta.`.trim()
    return text(summary, {
        match: {
            matchId,
            home,
            away,
            setsWonHome: trusted ? field(raw, 'fs_A') : '',
            setsWonAway: trusted ? field(raw, 'fs_B') : '',
            sets,
            date: field(raw, 'date'),
            time: field(raw, 'time'),
            venue: field(raw, 'venue_name'),
        },
    })
}

export async function getVolleyballPlayerTool(args: Record<string, unknown>) {
    const playerId = String(args.playerId || '').trim()
    if (!playerId) return text('playerId is required.')
    const player = await fetchPlayer(playerId)
    if (!player) return text(`Pelaajaa ${playerId} ei löytynyt.`)
    const name = field(player, 'player_name')
        || `${field(player, 'first_name')} ${field(player, 'last_name')}`.trim()
        || field(player, 'name')
    return text(`${name || playerId}`, { player: { playerId, name, team: field(player, 'team_name') } })
}

export async function searchVolleyballTool(args: Record<string, unknown>) {
    const query = String(args.query || args.q || '').trim()
    if (query.length < 2) return text('query is required (club, series, or a lentopallo link).')
    const hits = await searchDiscovery(query)
    const summary = hits.length === 0
        ? `Ei osumia haulle «${query}».`
        : hits.slice(0, 12).map((hit) => `${hit.kind} ${hit.title} (${hit.id})`).join('\n')
    return text(summary, { hits: hits.slice(0, 20) })
}

export async function getVolleyballStandingsTool(args: Record<string, unknown>) {
    const competitionId = String(args.competitionId || '').trim()
    const categoryId = String(args.categoryId || '').trim()
    const groupId = String(args.groupId || '').trim()
    if (!competitionId || !categoryId || !groupId) {
        return text('Tarvitaan competitionId, categoryId ja groupId. Sarjataulukkoa ei keksitä.')
    }
    const group = await fetchGroup(competitionId, categoryId, groupId)
    const teams = [...group.teams].sort(
        (a, b) => Number(a.current_standing || 99) - Number(b.current_standing || 99),
    )
    const lines = teams.map((team) =>
        `${field(team, 'current_standing')}. ${field(team, 'team_name')} ${field(team, 'points')} p`,
    )
    return text(lines.join('\n') || 'Lohkossa ei ole joukkueita.', {
        competition: group.competition,
        category: group.category,
        group: group.name,
        teams: teams.map((team) => ({
            rank: field(team, 'current_standing'),
            teamId: field(team, 'team_id'),
            team: field(team, 'team_name'),
            played: field(team, 'matches_played'),
            points: field(team, 'points'),
        })),
    })
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

export async function registerVolleyballWebMCP(): Promise<ModelContextRegistry | undefined> {
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

    const tools: ModelContextTool[] = [
        {
            name: 'search_volleyball',
            description: 'Search Lentopalloliitto clubs and series. Pass a club name or a tulospalvelu link.',
            inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
            execute: searchVolleyballTool,
        },
        {
            name: 'get_volleyball_match',
            description: 'Fetch a TASO volleyball match by matchId: set scores and the result. Does not invent a score.',
            inputSchema: { type: 'object', properties: { matchId: { type: 'string' } }, required: ['matchId'] },
            execute: getVolleyballMatchTool,
        },
        {
            name: 'get_volleyball_player',
            description: 'Fetch a volleyball player by playerId.',
            inputSchema: { type: 'object', properties: { playerId: { type: 'string' } }, required: ['playerId'] },
            execute: getVolleyballPlayerTool,
        },
        {
            name: 'get_volleyball_sets',
            description: 'Set scores for one TASO match. Requires matchId. Team names alone are not a result.',
            inputSchema: { type: 'object', properties: { matchId: { type: 'string' } }, required: ['matchId'] },
            execute: async (args) => getVolleyballSetsTool(args),
        },
        {
            name: 'get_volleyball_standings',
            description: 'Live group table from TASO. Requires competitionId, categoryId and groupId. Never invent a table.',
            inputSchema: {
                type: 'object',
                properties: {
                    competitionId: { type: 'string' },
                    categoryId: { type: 'string' },
                    groupId: { type: 'string' },
                },
                required: ['competitionId', 'categoryId', 'groupId'],
            },
            execute: getVolleyballStandingsTool,
        },
    ]

    const host = (typeof document !== 'undefined'
        ? (document as Document & { modelContext?: { registerTool?: (tool: ModelContextTool) => unknown; callTool?: unknown } }).modelContext
        : undefined)
    if (host && typeof host.registerTool === 'function' && typeof host.callTool !== 'function') {
        for (const tool of tools) {
            try { await host.registerTool(tool) } catch { /* host already has this name */ }
        }
        return undefined
    }

    if (typeof document !== 'undefined' && !(host && typeof host.registerTool === 'function')) {
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
    if (typeof navigator !== 'undefined' && !(navigator as Navigator & { modelContext?: { registerTool?: unknown } }).modelContext) {
        try {
            Object.defineProperty(navigator, 'modelContext', {
                value: registry,
                configurable: true,
                enumerable: true,
                writable: true,
            })
        } catch {
            /* host getter */
        }
    }
    if (typeof window !== 'undefined') {
        const win = window as Window & { modelContext?: ModelContextRegistry }
        if (!win.modelContext) win.modelContext = registry

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
            new CustomEvent('webmcp:ready', { detail: { location: 'document.modelContext' } })
        )
    }

    for (const tool of tools) {
        await registry.registerTool(tool)
    }
    return registry
}
