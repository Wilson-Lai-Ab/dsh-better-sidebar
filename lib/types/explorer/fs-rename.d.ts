/** True when `name` is a single path segment (no slash, not `.` / `..`). */
export declare function isRenameName(name: string): boolean;
/**
 * Resolve and fence a rename. Throws SidebarError when the pair is not a
 * sibling rename under `cwd`.
 */
export declare function fencedRename(cwd: string, fromRaw: string, toRaw: string): {
    from: string;
    to: string;
};
