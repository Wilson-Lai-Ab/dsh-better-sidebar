/**
 * Docked file bodies stay mounted while their tabs exist.
 *
 * Chat hides the overlay with opacity so the last HTML iframe stays
 * laid out. Scroll itself is restored via the html-route postMessage bridge.
 */
export declare function resolveCenterShown(tabIds: readonly string[], activeId: string | null, lastId: string | null): {
    shownId: string | null;
    chatting: boolean;
    lastId: string | null;
};
export declare function isCenterBodyShown(tabId: string, shownId: string | null): boolean;
