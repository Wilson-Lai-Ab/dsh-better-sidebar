import { type FileFindHit } from './fs-find-match.ts';
export { presentFindHit, scoreFileNameMatch, shouldSkipFindDir, treeOfFindHits, type FileFindHit, type FileNameMatch, type FindTreeFile, type FindTreeNode, } from './fs-find-match.ts';
export interface FindFilesOptions {
    limit?: number;
    maxMs?: number;
    maxVisited?: number;
    now?: () => number;
}
export declare const FIND_LIMIT_DEFAULT = 50;
export declare function findFiles(root: string, query: string, options?: FindFilesOptions): Promise<FileFindHit[]>;
