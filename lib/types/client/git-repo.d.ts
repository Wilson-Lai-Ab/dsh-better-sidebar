/**
 * Pick the innermost git work tree that owns a file, then the path git
 * commands expect (repo-relative). File-level and hunk review share this
 * so `git show HEAD:…` never gets an absolute path.
 */
import { type SessionScope } from './api.ts';
export declare function relPathOf(root: string, file: string): string | undefined;
export declare function repoRootOf(file: string, roots: readonly string[]): string | undefined;
export interface GitFileTarget {
    scope: SessionScope;
    /** Path for `git show` / `git discard` (repo-relative when a repo was found). */
    gitPath: string;
    root?: string;
}
export declare function gitFileTarget(scope: SessionScope, path: string): Promise<GitFileTarget>;
