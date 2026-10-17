const PROXY = 'https://taso-proxy.sakkoja.workers.dev/volley'
const ORIGIN = 'https://lentopallo-api.torneopal.net/taso/rest'
const KEY = 'df8e84j9xtdz269euy3h'

export type TasoResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; reason: 'notfound' | 'failed' }

/** TASO did not answer (403, network, proxy error). Never the same as "no results". */
export class TasoError extends Error {
  constructor(path: string) {
    super(`TASO did not answer: ${path}`)
    this.name = 'TasoError'
  }
}

type Body = Record<string, unknown> & { call?: { status?: string; error?: string; error_message?: string; http?: number }; error?: string }

/**
 * Read one TASO answer. 'ok' only when call.status is ok — the proxy can send HTTP 200 with
 * {"call":{"status":"error","http":403}}. 'notfound' only when TASO itself says the thing does not exist.
 */
export function readTasoBody(text: string): TasoResult | null {
  // getTeam answers an unknown id with a PHP object dump instead of JSON.
  if (/\["NOTFOUND"\]=>\s*bool\(true\)/.test(text)) return { ok: false, reason: 'notfound' }
  const i = text.indexOf('{')
  if (i < 0) return null
  let data: Body
  try {
    data = JSON.parse(text.slice(i)) as Body
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  if (data.error === 'upstream') return null
  const status = String(data.call?.status || '').toLowerCase()
  if (status === 'ok') return { ok: true, data }
  if (status === 'error') {
    const why = `${data.call?.error || ''} ${data.call?.error_message || ''}`.toLowerCase()
    if (!data.call?.http && why.includes('not found')) return { ok: false, reason: 'notfound' }
    return null
  }
  return null
}

const TTL_MS = 120_000
const cache = new Map<string, { at: number; value: Promise<TasoResult> }>()

async function load(path: string): Promise<TasoResult> {
  const sep = path.includes('?') ? '&' : '?'
  // Origin first: the proxy currently answers 403 or "endpoint" for most methods, and every miss costs a round trip.
  const urls = [`${ORIGIN}/${path}`, `${PROXY}/${path}`, `${ORIGIN}/${path}${sep}_cb=${Date.now()}`]
  for (const url of urls) {
    try {
      const viaProxy = url.startsWith(PROXY)
      const res = await fetch(url, {
        headers: viaProxy ? { Accept: 'application/json' } : { Accept: `json/${KEY}` },
      })
      if (!res.ok) continue
      const result = readTasoBody(await res.text())
      if (result) return result
    } catch {
      /* next */
    }
  }
  return { ok: false, reason: 'failed' }
}

/** One TASO call with a short in-memory cache. Failures are not cached, so "try again" really tries again. */
export function tasoFetch(path: string): Promise<TasoResult> {
  const hit = cache.get(path)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value
  const value = load(path).then((r) => {
    if (!r.ok && r.reason === 'failed') cache.delete(path)
    return r
  })
  cache.set(path, { at: Date.now(), value })
  return value
}

/** Data, or throw TasoError when TASO did not answer. 'notfound' comes back as null. */
export async function tasoData(path: string): Promise<Record<string, unknown> | null> {
  const r = await tasoFetch(path)
  if (r.ok) return r.data
  if (r.reason === 'notfound') return null
  throw new TasoError(path)
}

/** Legacy helper: data or null (failure and not-found look the same — prefer tasoData). */
export async function volleyGet(path: string): Promise<Record<string, unknown> | null> {
  const r = await tasoFetch(path)
  return r.ok ? r.data : null
}

export function asList(data: Record<string, unknown> | null, key: string): Record<string, unknown>[] {
  const v = data?.[key]
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : []
}
