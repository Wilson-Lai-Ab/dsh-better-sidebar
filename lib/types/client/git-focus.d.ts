/**
 * One-shot "open the Git panel on this repo/dir" bus. The explorer stashes
 * a focus; GitView consumes it on open (new tab or already showing).
 */
export interface GitFocus {
    repo: string;
    dir: string;
}
export declare function requestGitFocus(focus: GitFocus): void;
export declare function takeGitFocus(): GitFocus | undefined;
export declare function subscribeGitFocus(listener: () => void): () => void;
