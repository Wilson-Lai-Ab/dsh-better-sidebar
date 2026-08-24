/**
 * IDEA-style git change marks for the editor gutter: a 3px bar next to
 * the line number (green add / blue modify / red delete).
 */
import { type Extension } from '@codemirror/state';
export type GutterMark = 'add' | 'mod' | 'del';
export interface GutterLine {
    line: number;
    mark: GutterMark;
    /** Deleted text shown as a no-number red row above `line`. */
    deleted?: string;
}
/**
 * Map two file snapshots onto the NEW file's line numbers (same marks as
 * a unified diff). Large files skip the quadratic walk and return nothing.
 */
export declare function gutterLinesOfTexts(oldText: string, newText: string): GutterLine[];
export declare function gutterLinesOfDiff(diff: string): GutterLine[];
export declare const setGitGutter: import("@codemirror/state").StateEffectType<readonly GutterLine[]>;
export declare function gitGutter(): Extension[];
