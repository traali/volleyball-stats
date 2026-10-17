import { useCallback, useEffect, useState } from 'react'

export type Load<T> =
  | { state: 'loading' }
  | { state: 'ok'; data: T }
  | { state: 'notfound' }
  | { state: 'failed' }

export type TasoLoad<T> = Load<T> & { retry: () => void }

/**
 * Load from TASO. A thrown error is 'failed' (couldn't load, try again), never "nothing found".
 * A null answer is 'notfound' only when TASO itself said so.
 */
export function useTaso<T>(load: () => Promise<T | null>, deps: unknown[]): TasoLoad<T> {
  const [attempt, setAttempt] = useState(0)
  const key = JSON.stringify([...deps, attempt])
  const [done, setDone] = useState<{ key: string; result: Load<T> } | null>(null)
  useEffect(() => {
    let cancel = false
    load().then(
      (data) => { if (!cancel) setDone({ key, result: data == null ? { state: 'notfound' } : { state: 'ok', data } }) },
      () => { if (!cancel) setDone({ key, result: { state: 'failed' } }) },
    )
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const result: Load<T> = done && done.key === key ? done.result : { state: 'loading' }
  return { ...result, retry }
}
