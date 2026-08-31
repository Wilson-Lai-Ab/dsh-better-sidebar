/**
 * Preview / edit mode for markdown and HTML files.
 *
 * First open of a file the current conversation wrote lands in source
 * (Keep / Undo paints). After the user picks Preview or Edit, that choice
 * survives hiding the center overlay (对话 ↔ file tab) and content reloads
 * of the same path. Closing the tab forgets it.
 */
export type ViewMode = 'preview' | 'edit';
export declare function viewModeKey(sessionId: string, path: string): string;
/** Default before the user has toggled: reviewed markdown/HTML open in source. */
export declare function defaultViewMode(viewerId: string, hasReview: boolean): ViewMode;
export declare function rememberViewMode(sessionId: string, path: string, mode: ViewMode): void;
/** Closing the file tab (not hiding it behind 对话) drops the choice. */
export declare function forgetViewMode(sessionId: string, path: string): void;
export declare function resolveViewMode(input: {
    sessionId: string;
    path: string;
    viewerId: string;
    hasReview: boolean;
}): ViewMode;
/** Test-only: specs share this module's map across cases. */
export declare function resetRememberedViewModes(): void;
