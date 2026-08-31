/**
 * Docked file bodies stay mounted while their tabs exist.
 *
 * Chat hides the overlay with opacity so the last HTML iframe stays
 * laid out. Scroll itself is restored via the html-route postMessage bridge.
 */
export function resolveCenterShown(
  tabIds: readonly string[],
  activeId: string | null,
  lastId: string | null,
): { shownId: string | null; chatting: boolean; lastId: string | null } {
  if (activeId !== null && tabIds.includes(activeId)) {
    return { shownId: activeId, chatting: false, lastId: activeId }
  }
  const keep = lastId !== null && tabIds.includes(lastId) ? lastId : null
  return { shownId: keep, chatting: true, lastId: keep }
}

export function isCenterBodyShown(tabId: string, shownId: string | null): boolean {
  return shownId === tabId
}
