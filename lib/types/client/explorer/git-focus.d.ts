/**
 * Pick which git work tree owns an explorer path, then the repo-relative
 * directory the Git panel should expand to.
 */
export declare function gitFocusOf(path: string, isDir: boolean, repos: readonly {
    root: string;
}[]): {
    repo: string;
    dir: string;
} | undefined;
