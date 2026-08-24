import { type ReviewDocument } from './review-document.ts';
export { emptyReviewDocument, parseReviewDocument, type ReviewDecision, type ReviewDocument, } from './review-document.ts';
export declare const REVIEW_FILE = "review.json";
/** Encode one path segment the same way DSH's jsonl backend does. */
export declare function encodeSessionSegment(raw: string): string;
/** Human-navigable project folder under `~/.dsh/sessions`. */
export declare function projectKey(cwd: string): string;
export declare function defaultSessionsRoot(): string;
export declare function reviewFilePath(root: string, cwd: string | undefined, sessionId: string): string;
export declare function readReviewDocument(path: string): Promise<ReviewDocument>;
export declare function writeReviewDocument(path: string, doc: ReviewDocument): Promise<void>;
