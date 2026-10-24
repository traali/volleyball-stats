const ORIGIN = 'https://lentopallo-api.torneopal.net/taso/rest'
const KEY = 'df8e84j9xtdz269euy3h'
const SALT = 'ysnyp4h6e9egetkc3s3v'

/** Text TASO signs: '<method>?<salt>' plus '&k=v' for every parameter, raw values in query order. */
export function signingInput(path: string): string {
  const [method, query = ''] = path.split('?')
  let input = `${method}?${SALT}`
  for (const part of query.split('&').filter(Boolean)) {
    const i = part.indexOf('=')
    const k = i < 0 ? part : part.slice(0, i)
    const v = i < 0 ? '' : part.slice(i + 1)
    input += `&${safeDecode(k)}=${safeDecode(v)}`
  }
  return input
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v.replace(/\+/g, ' '))
  } catch {
    return v
  }
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Signed URL for one TASO call: the hash goes last, as the official results site does. */
export async function signedUrl(path: string): Promise<string> {
  const hash = await sha256Hex(signingInput(path))
  return `${ORIGIN}/${path}${path.includes('?') ? '&' : '?'}hash=${hash}`
}

export type TasoResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; reason: 'notfound' | 'failed' }

/** TASO did not answer (403, 'Not allowed', network error). Never the same as "no results". */
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
  // One signed call and one retry. TASO checks the Referer; with this policy the browser sends our origin.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(await signedUrl(path), {
        headers: { Accept: `json/${KEY}` },
        referrerPolicy: 'strict-origin-when-cross-origin',
        cache: 'no-store',
      })
      if (!res.ok) continue
      // "Not allowed" (HTTP 200, plain text) or any other non-JSON body is a failure, never empty data.
      const result = readTasoBody(await res.text())
      if (result) return result
    } catch {
      /* retry */
    }
  }
  return { ok: false, reason: 'failed' }
}

/** One TASO call with a short in-memory cache. Failures are not cached, so "try again" really tries again. */
export function tasoFetch(path: string, fresh = false): Promise<TasoResult> {
  const hit = cache.get(path)
  if (!fresh && hit && Date.now() - hit.at < TTL_MS) return hit.value
  const value = load(path).then((r) => {
    if (!r.ok && r.reason === 'failed') cache.delete(path)
    return r
  })
  cache.set(path, { at: Date.now(), value })
  return value
}

/** Data, or throw TasoError when TASO did not answer. 'notfound' comes back as null. */
export async function tasoData(path: string, fresh = false): Promise<Record<string, unknown> | null> {
  const r = await tasoFetch(path, fresh)
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
