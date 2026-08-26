/**
 * One-shot "open the Git panel on this repo/dir" bus. The explorer stashes
 * a focus; GitView consumes it on open (new tab or already showing).
 */
export interface GitFocus {
  repo: string
  dir: string
}

let pending: GitFocus | undefined
const listeners = new Set<() => void>()

export function requestGitFocus(focus: GitFocus): void {
  pending = focus
  for (const listener of listeners) listener()
}

export function takeGitFocus(): GitFocus | undefined {
  const focus = pending
  pending = undefined
  return focus
}

export function subscribeGitFocus(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
