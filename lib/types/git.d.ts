/** A parsed `git status --porcelain=v1 -z` entry. */
export interface GitStatusEntry {
    path: string;
    /** Two-letter index/worktree status (X Y), e.g. 'M ', ' M', 'A ', '??'. */
    xy: string;
}
/** One git work tree discovered under the session workspace. */
export interface GitRepoInfo {
    /** Absolute path of the repository top level. */
    root: string;
    /** Last path segment (picker label). */
    name: string;
    /** Path relative to the session cwd (`'.'` when the cwd IS the repo). */
    rel: string;
}
/** The source-control panel snapshot. */
export interface GitStatusResult {
    isRepo: boolean;
    branch?: string;
    /** Absolute repository top level when `isRepo` (so the client can pin the picker). */
    root?: string;
    entries: GitStatusEntry[];
}
/** One `git log` row. */
export interface GitLogEntry {
    /** Short hash (7+ chars, display). */
    hash: string;
    /** Full 40-char hash (advanced operations: revert / cherry-pick). */
    hashFull: string;
    subject: string;
    author: string;
    /** ISO 8601 author date (`%ai`), e.g. `2024-01-01 10:00:00 +0800`. */
    date: string;
    /** Ref decorations (`%D` with --decorate=short), e.g. `HEAD -> main, origin/main`; '' when none. */
    refs: string;
}
/** One git failure (stderr text as the message). */
export declare class GitCommandError extends Error {
    readonly code: string;
    readonly command: string;
    constructor(message: string, code: string | undefined, command: string);
}
/** Parse porcelain v1 -z output into entries (rename/copy pairs collapse to one row). */
export declare function parsePorcelainZ(output: string): GitStatusEntry[];
/** Parse `git log --pretty=format:%h%x1f%s%x1f%an%x1f%ai%x1f%H%x1f%D` rows. */
export declare function parseLogLines(output: string): GitLogEntry[];
/** Whether the directory is inside a git work tree (exit-0 `git rev-parse`). */
export declare function isGitRepo(cwd: string): Promise<boolean>;
/** The repository top level containing `cwd` (`git rev-parse --show-toplevel`). */
export declare function repoRoot(cwd: string): Promise<string>;
/** The current branch name (`git rev-parse --abbrev-ref HEAD`; 'HEAD' when detached). */
export declare function currentBranch(cwd: string): Promise<string>;
/** Discover git work trees at / under `cwd` (the cwd's own repo plus nested ones). */
export declare function listRepos(cwd: string): Promise<GitRepoInfo[]>;
/** Working-tree status (untracked included). */
export declare function status(cwd: string): Promise<GitStatusResult>;
/** Unified-diff context lines for the source-control / review surfaces. */
export declare const DIFF_CONTEXT_LINES = 30;
/** Diff text of the worktree (unstaged) or the index (staged). */
export declare function diff(cwd: string, path: string | undefined, staged: boolean): Promise<string>;
/** Stage paths (all when path is undefined). */
export declare function stage(cwd: string, path: string | undefined): Promise<void>;
/** Stage tracked modifications and deletions only (`git add -u`) — untracked
 *  files stay in their own bucket so the panel can keep the IDEA-style
 *  "modified" vs "untracked" split. */
export declare function stageTracked(cwd: string): Promise<void>;
/** Stage the given untracked paths in one batch (`git add -- <paths>`). */
export declare function stageUntracked(cwd: string, paths: string[]): Promise<void>;
/** Unstage paths (all when path is undefined). */
export declare function unstage(cwd: string, path: string | undefined): Promise<void>;
/** Commit the staged changes with a message (global identity untouched). */
export declare function commit(cwd: string, message: string): Promise<void>;
/** Branch names (current first). */
export declare function branches(cwd: string): Promise<{
    current: string;
    names: string[];
}>;
/** Switch to an existing branch. */
export declare function checkout(cwd: string, branch: string): Promise<void>;
/** Recent commit history (newest first), lazily pageable via skip/count. */
export declare function log(cwd: string, count?: number, skip?: number): Promise<GitLogEntry[]>;
/**
 * Content of a file at a revision (`git show <rev>:<path>`), or null when the
 * revision has no such path (a new/untracked file has no HEAD side).
 */
export declare function show(cwd: string, rev: string, path: string): Promise<string | null>;
/** Full patch text of one commit (`git show` with the commit header suppressed).
 *  Merge commits show their diff against the first parent (`-m --first-parent`
 *  is a no-op for regular commits), so a history click always has content. */
export declare function commitDiff(cwd: string, hash: string): Promise<string>;
/** Discard the worktree changes of one path (`git checkout -- <path>`; the index is untouched). */
export declare function discard(cwd: string, path: string): Promise<void>;
/** Revert one commit onto the current branch with an auto-generated message. */
export declare function revert(cwd: string, hash: string): Promise<void>;
/** Cherry-pick one commit onto the current branch. */
export declare function cherryPick(cwd: string, hash: string): Promise<void>;
