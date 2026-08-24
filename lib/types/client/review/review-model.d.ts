/** How the agent touched the file. */
export type ReviewEditKind = 'add' | 'edit' | 'delete';
/** One file the current conversation produced. */
export interface SessionEdit {
    path: string;
    kind: ReviewEditKind;
    turn: number | undefined;
    seq: number | undefined;
    prompt: string;
    /** Epoch ms from the conversation node, when the host provides one. */
    time?: number;
    /** Pre-write snapshot from the last tool card (`null` = the file was created). */
    oldText?: string | null;
}
/** Paths a tool-result view reports as an agent mutation. */
export declare function reviewLocations(view: unknown): {
    path: string;
    kind: ReviewEditKind;
}[];
/** Last tool card's old-file snapshot for this path (`null` = created). */
export declare function oldTextOf(view: unknown, path: string): string | null | undefined;
/**
 * Flatten conversation nodes into one row per (turn, path). The same file
 * written in several turns shows up under each turn. File-level undo still
 * uses {@link latestSessionEdits} so the first snapshot wins.
 */
export declare function collectSessionEdits(nodes: readonly unknown[], cwd?: string): SessionEdit[];
/** Last write of each path; first `oldText` is kept for file-level undo. */
export declare function latestSessionEdits(edits: readonly SessionEdit[]): SessionEdit[];
/** One-line prompt preview for the review list (Cursor-style). */
export declare function promptPreview(prompt: string, max?: number): string;
/** Files last written by the same user turn / prompt. */
export interface ReviewGroup {
    key: string;
    turn: number | undefined;
    prompt: string;
    time?: number;
    edits: SessionEdit[];
}
/** Group first-seen edits by the conversation turn that last wrote them. Newest turn first. */
export declare function groupEditsByTurn(edits: readonly SessionEdit[]): ReviewGroup[];
