/**
 * Path projection helpers shared by the explorer rows: a path relative to
 * the session cwd (for the @-reference button and "copy relative path").
 * The fs-tree joins with '/' even on Windows, so both separators normalize
 * to '/' before comparison.
 */
/**
 * The path relative to the session's working directory.
 * @param cwd - the explorer root (absolute).
 * @param path - an absolute entry path from the fs-tree.
 * @returns the relative path with '/' separators ('.' for the cwd itself),
 * or `path` unchanged when it lies outside the cwd.
 *
 * The prefix test is case-insensitive: Windows paths (and macOS's
 * case-insensitive volumes) may arrive with different casing than the cwd
 * row, and the containment decision must not depend on it. The returned
 * relative text keeps the caller's own casing.
 */
export declare function relativeTo(cwd: string, path: string): string;
/** Whether two explorer paths name the same file (separators + letter case). */
export declare function sameFsPath(a: string | undefined, b: string | undefined): boolean;
/**
 * Absolute directories that must be expanded to show `path` in the explorer.
 * Empty when the file sits in the workspace root; null when it is outside.
 */
export declare function ancestorDirsOf(cwd: string, path: string): string[] | null;
