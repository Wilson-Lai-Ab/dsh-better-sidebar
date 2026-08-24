/**
 * Per-hunk review: turn a unified diff (or two snapshots) into ranges on
 * the NEW file, then undo one range by splicing the old block back in.
 */
import { type DiffFile } from '../DiffView.tsx';
export interface ReviewHunk {
    key: string;
    /** First NEW-file line of the splice block (may include diff context). */
    start: number;
    /** Last NEW-file line of the splice block (may include diff context). */
    end: number;
    /** First painted / actually-changed NEW-file line. */
    paintStart: number;
    /** Last painted / actually-changed NEW-file line. */
    paintEnd: number;
    oldBlock: string;
    newBlock: string;
}
export declare function hunksFromFiles(files: readonly DiffFile[]): ReviewHunk[];
export declare function hunksOfDiff(diff: string): ReviewHunk[];
/** Consecutive changed regions between two snapshots (HEAD vs buffer). */
export declare function hunksFromTexts(oldText: string, newText: string): ReviewHunk[];
/** One hunk covering every line of a brand-new file. */
export declare function hunksOfAllAdd(lineCount: number): ReviewHunk[];
export declare function hunkAtLine(hunks: readonly ReviewHunk[], line: number): ReviewHunk | undefined;
/** `L24` or `L12–16` — painted lines only, never surrounding diff context. */
export declare function hunkLineLabel(hunk: ReviewHunk): string;
/** Consecutive same-mark gutter lines become one hoverable hunk. */
export declare function hunksFromGutterLines(lines: readonly {
    line: number;
    mark?: string;
}[]): ReviewHunk[];
/**
 * Replace this hunk's new-file block with its old-file block.
 * Whole-file additions (empty old block + span covering the file) become ''.
 */
export declare function applyHunkUndo(text: string, hunk: ReviewHunk): string;
export type ReviewPaintPhase = 'pending' | 'just-decided' | 'revisit';
export interface ReviewGutterPaint {
    lines: {
        line: number;
        mark?: string;
        deleted?: string;
    }[];
    showButtons: boolean;
}
/**
 * Pending: hide decided hunks, keep buttons. Just-decided (this editor
 * session): clear paint and buttons. Revisit of an already-decided file:
 * leftover git paint, no review buttons.
 */
export declare function reviewGutterPaint(input: {
    phase: ReviewPaintPhase;
    lines: readonly {
        line: number;
        mark?: string;
        deleted?: string;
    }[];
    hunks: readonly {
        key: string;
        paintStart: number;
        paintEnd: number;
    }[];
    decidedHunkKeys: ReadonlySet<string>;
}): ReviewGutterPaint;
