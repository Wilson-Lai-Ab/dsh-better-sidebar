/**
 * Filename Quick-Open walker. Scoring lives in {@link ./fs-find-match.ts}
 * so the explorer client can group hits without importing Node fs.
 */
import { opendir } from 'node:fs/promises'
import { join } from 'node:path'
import { scoreFileNameMatch, shouldSkipFindDir, type FileFindHit } from './fs-find-match.ts'

export {
  presentFindHit, scoreFileNameMatch, shouldSkipFindDir, treeOfFindHits,
  type FileFindHit, type FileNameMatch, type FindTreeFile, type FindTreeNode,
} from './fs-find-match.ts'

export interface FindFilesOptions {
  limit?: number
  maxMs?: number
  maxVisited?: number
  now?: () => number
}

export const FIND_LIMIT_DEFAULT = 50
const FIND_MAX_MS = 1500
const FIND_MAX_VISITED = 8000

function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, '/')
}

export async function findFiles(root: string, query: string, options: FindFilesOptions = {}): Promise<FileFindHit[]> {
  const q = query.trim()
  if (q === '') return []
  const limit = Math.max(1, options.limit ?? FIND_LIMIT_DEFAULT)
  const maxMs = options.maxMs ?? FIND_MAX_MS
  const maxVisited = options.maxVisited ?? FIND_MAX_VISITED
  const now = options.now ?? Date.now
  const deadline = now() + maxMs
  const hits: FileFindHit[] = []
  const stack: { abs: string; rel: string }[] = [{ abs: root, rel: '' }]
  let visited = 0

  while (stack.length > 0) {
    if (now() > deadline || visited >= maxVisited) break
    const dir = stack.pop()!
    let level
    try {
      level = await opendir(dir.abs)
    } catch {
      continue
    }
    const children: { abs: string; rel: string }[] = []
    try {
      for await (const dirent of level) {
        visited += 1
        if (visited > maxVisited) break
        const name = dirent.name
        const rel = dir.rel === '' ? name : `${dir.rel}/${name}`
        if (dirent.isDirectory()) {
          if (shouldSkipFindDir(name)) continue
          children.push({ abs: join(dir.abs, name), rel })
          continue
        }
        if (!dirent.isFile() && !dirent.isSymbolicLink()) continue
        const match = scoreFileNameMatch(q, rel)
        if (match === null) continue
        hits.push({ path: join(dir.abs, name), rel: normalizeRel(rel), score: match.score, indices: match.indices })
      }
    } catch {
      /* unreadable directory */
    }
    for (let i = children.length - 1; i >= 0; i -= 1) stack.push(children[i]!)
  }

  hits.sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel))
  return hits.slice(0, limit)
}
