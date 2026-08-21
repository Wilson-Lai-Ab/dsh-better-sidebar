/**
 * One-shot "scroll this editor to a line span" bus. Composer chip clicks
 * stash a range against the absolute path; the text editor consumes it when
 * the view is ready (new tab or already open).
 */
export interface RevealRange {
  start: number
  end: number
  selected?: string
}

const pending = new Map<string, RevealRange>()
const listeners = new Set<() => void>()

export function requestReveal(path: string, range: RevealRange): void {
  if (range.start < 1) return
  pending.set(path, {
    start: range.start,
    end: Math.max(range.start, range.end),
    ...(range.selected !== undefined && range.selected !== '' ? { selected: range.selected } : {}),
  })
  for (const listener of listeners) listener()
}

export function takeReveal(path: string): RevealRange | undefined {
  const range = pending.get(path)
  if (range === undefined) return undefined
  pending.delete(path)
  return range
}

export function subscribeReveal(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
