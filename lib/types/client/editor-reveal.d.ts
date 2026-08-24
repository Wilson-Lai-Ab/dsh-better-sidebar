/**
 * One-shot "scroll this editor to a line span" bus. Composer chip clicks
 * stash a range against the absolute path; the text editor consumes it when
 * the view is ready (new tab or already open).
 */
export interface RevealRange {
    start: number;
    end: number;
    selected?: string;
}
export declare function requestReveal(path: string, range: RevealRange): void;
export declare function takeReveal(path: string): RevealRange | undefined;
export declare function subscribeReveal(listener: () => void): () => void;
