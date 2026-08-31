/**
 * Preview / edit mode for markdown and HTML files.
 *
 * First open of a file the current conversation wrote lands in source
 * (Keep / Undo paints). After the user picks Preview or Edit, that choice
 * survives hiding the center overlay (对话 ↔ file tab) and content reloads
 * of the same path. Closing the tab forgets it.
 */
export type ViewMode = 'preview' | 'edit'

const remembered = new Map<string, ViewMode>()

export function viewModeKey(sessionId: string, path: string): string {
  return `${sessionId}\n${path}`
}

/** Default before the user has toggled: reviewed markdown/HTML open in source. */
export function defaultViewMode(viewerId: string, hasReview: boolean): ViewMode {
  return hasReview && (viewerId === 'markdown' || viewerId === 'html') ? 'edit' : 'preview'
}

export function rememberViewMode(sessionId: string, path: string, mode: ViewMode): void {
  remembered.set(viewModeKey(sessionId, path), mode)
}

/** Closing the file tab (not hiding it behind 对话) drops the choice. */
export function forgetViewMode(sessionId: string, path: string): void {
  remembered.delete(viewModeKey(sessionId, path))
}

export function resolveViewMode(input: {
  sessionId: string
  path: string
  viewerId: string
  hasReview: boolean
}): ViewMode {
  return remembered.get(viewModeKey(input.sessionId, input.path))
    ?? defaultViewMode(input.viewerId, input.hasReview)
}

/** Test-only: specs share this module's map across cases. */
export function resetRememberedViewModes(): void {
  remembered.clear()
}
