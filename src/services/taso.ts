const PROXY = 'https://taso-proxy.sakkoja.workers.dev/volley'
const ORIGIN = 'https://lentopallo-api.torneopal.net/taso/rest'
const KEY = 'df8e84j9xtdz269euy3h'

export async function volleyGet(path: string): Promise<Record<string, unknown> | null> {
  const urls = [`${PROXY}/${path}`, `${ORIGIN}/${path}`]
  for (const url of urls) {
    try {
      const headers: Record<string, string> = url.startsWith(PROXY)
        ? { Accept: 'application/json' }
        : {
            Accept: `json/${KEY}`,
            Referer: 'https://tulospalvelu.lentopallo.fi/',
          }
      const res = await fetch(url, { headers })
      if (!res.ok) continue
      const text = await res.text()
      const i = text.indexOf('{')
      if (i < 0) continue
      const data = JSON.parse(text.slice(i)) as Record<string, unknown>
      const call = data.call as { status?: string } | undefined
      if (call?.status && call.status !== 'ok' && call.status !== 'OK') continue
      return data
    } catch {
      /* next */
    }
  }
  return null
}

export function asList(data: Record<string, unknown> | null, key: string): Record<string, unknown>[] {
  const v = data?.[key]
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : []
}
