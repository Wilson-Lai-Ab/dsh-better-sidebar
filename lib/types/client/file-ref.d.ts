import { type SelectionLines } from './selection-payload.ts';
/** Trigger-source name (must match the registered `@` source). */
export declare const FILE_SOURCE = "file";
/** Custom drag/clipboard type so the composer can mint a chip, not dump text. */
export declare const FILE_REF_MIME = "application/x-dsh-file-ref";
/** One file (optional line span + optional selected snippet). */
export interface FileRef {
    /** Path as stored (relative to cwd when known at insert time). */
    path: string;
    lines?: SelectionLines;
    /** Snippet sent to the model; omitted for a whole-file drop. */
    selected?: string;
    /** Absolute path for opening the editor (kept even when `path` is relative). */
    abs?: string;
}
/** Last path segment for the chip label. */
export declare function fileBaseName(path: string): string;
/** Chip label: `File.java` or `File.java (108-121)`. */
export declare function fileChipLabel(ref: FileRef): string;
/** One selected line (or a snippet with no span) is typed as plain text, not a chip. */
export declare function isPlainTextSelection(ref: FileRef): boolean;
/** Clipboard / persistence projection (`@rel` or `@rel:108-121`). */
export declare function fileClipboardText(ref: FileRef): string;
/** Project an absolute path to the session cwd when possible. */
export declare function fileRefOf(path: string, cwd: string | undefined, lines?: SelectionLines, selected?: string): FileRef;
export declare function encodeFileRef(ref: FileRef): string;
export declare function decodeFileRef(raw: string): FileRef | null;
/** `@rel`, `@rel:12`, `@rel:12-15` (the clipboard projection). */
export declare function parseAtToken(text: string): FileRef | null;
/**
 * Model form: a whole file is `@path`; a selection with a snippet is a
 * fenced block; a line span without a snippet is `@path:lines`.
 */
export declare function serializeFileRef(raw: string): string;
/** The insert-reference payload the input machine mints a chip from. */
export declare function fileReferenceInsert(ref: FileRef): {
    source: string;
    ref: string;
    label: string;
    clipboardText: string;
};
/**
 * Copy a selection for the composer chip AND for everywhere else:
 * the custom MIME is the chip payload; `text/plain` stays the selected
 * source so paste into chat/email/another editor is the original text.
 * No selected body → leave the event alone (browser default copy).
 */
export declare function writeFileRefClipboard(event: ClipboardEvent, ref: FileRef): void;
