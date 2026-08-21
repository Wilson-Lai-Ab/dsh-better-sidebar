/**
 * Filename Quick-Open scoring and result-tree grouping. Browser-safe:
 * no Node fs — the explorer client and the host walker both import this.
 */

export interface FileNameMatch {
  score: number
  indices: number[]
}

export interface FileFindHit {
  path: string
  rel: string
  score: number
  indices: number[]
}

export interface FindTreeFile {
  name: string
  path: string
  rel: string
  score: number
  indices: number[]
}

export interface FindTreeNode {
  name: string
  path: string
  dirs: FindTreeNode[]
  files: FindTreeFile[]
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'lib', 'coverage', '.pnpm-store',
  'target', 'build', '.next', '.turbo', 'out',
])

export function shouldSkipFindDir(name: string): boolean {
  return name.startsWith('.') || SKIP_DIRS.has(name)
}

function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, '/')
}

function scoreAgainst(query: string, text: string, indexOffset: number): FileNameMatch | null {
  const q = query.toLowerCase()
  const lower = text.toLowerCase()
  const indices: number[] = []
  let qi = 0
  let score = 0
  let consec = 0
  for (let i = 0; i < lower.length && qi < q.length; i += 1) {
    if (lower[i] !== q[qi]) {
      consec = 0
      continue
    }
    indices.push(i + indexOffset)
    let bonus = 1
    if (i === 0 || text[i - 1] === '/' || text[i - 1] === '-' || text[i - 1] === '_' || text[i - 1] === '.') bonus += 8
    if (consec > 0) bonus += 8
    if (i > 0 && /[a-z]/.test(text[i - 1]!) && /[A-Z]/.test(text[i]!)) bonus += 10
    score += bonus
    consec += 1
    qi += 1
  }
  if (qi < q.length) return null
  if (indices[0] === indexOffset) score += 18
  const lastLocal = indices[indices.length - 1]! - indexOffset
  const after = lastLocal + 1
  if (after < text.length && /[A-Z]/.test(text[after]!)) score += 22
  if (after === text.length || text[after] === '.') score += 16
  score -= (text.length - q.length) * 0.04
  return { score, indices }
}

/**
 * Case-insensitive subsequence. A query without `/` matches the **basename**
 * only, so long Java paths cannot absorb a class name as scattered letters.
 * A query with `/` still matches the relative path (`client/rev`).
 */
export function scoreFileNameMatch(query: string, rel: string): FileNameMatch | null {
  const q = query.trim()
  if (q === '') return null
  const path = normalizeRel(rel)
  if (q.includes('/') || q.includes('\\')) {
    return scoreAgainst(q.replace(/\\/g, '/'), path, 0)
  }
  const baseStart = path.lastIndexOf('/') + 1
  const match = scoreAgainst(q, path.slice(baseStart), baseStart)
  if (match === null) return null
  return { score: match.score + 24, indices: match.indices }
}

/** Nest flat hits into an explorer-style directory tree. File highlight indices become basename-relative. */
export function treeOfFindHits(hits: readonly FileFindHit[]): FindTreeNode {
  const root: FindTreeNode = { name: '', path: '', dirs: [], files: [] }
  for (const hit of hits) {
    const parts = normalizeRel(hit.rel).split('/').filter(part => part !== '')
    const fileName = parts.pop()
    if (fileName === undefined) continue
    let node = root
    let acc = ''
    for (const part of parts) {
      acc = acc === '' ? part : `${acc}/${part}`
      let child = node.dirs.find(dir => dir.name === part)
      if (child === undefined) {
        child = { name: part, path: acc, dirs: [], files: [] }
        node.dirs.push(child)
      }
      node = child
    }
    const baseStart = hit.rel.length - fileName.length
    node.files.push({
      name: fileName,
      path: hit.path,
      rel: hit.rel,
      score: hit.score,
      indices: hit.indices.filter(index => index >= baseStart).map(index => index - baseStart),
    })
  }
  const sortNode = (node: FindTreeNode): void => {
    node.dirs.sort((a, b) => a.name.localeCompare(b.name))
    node.files.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    for (const dir of node.dirs) sortNode(dir)
  }
  sortNode(root)
  return root
}

export interface FindHitPresentation {
  name: string
  location: string | null
  module: string | null
}

const SOURCE_ROOTS = [
  'src/main/java/',
  'src/test/java/',
  'src/main/kotlin/',
  'src/test/kotlin/',
  'src/main/scala/',
]

function fileStem(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(0, dot) : fileName
}

/** IDE-style row: class/file name, package or leftover folder, top-level module. */
export function presentFindHit(rel: string): FindHitPresentation {
  const path = rel.replace(/\\/g, '/')
  const parts = path.split('/').filter(part => part !== '')
  const fileName = parts.pop() ?? path
  if (parts.length === 0) return { name: fileName, location: null, module: null }
  const module = parts[0] ?? null
  const afterModule = parts.slice(1)
  const joined = afterModule.join('/')
  const lower = `${joined}/`.toLowerCase()
  for (const root of SOURCE_ROOTS) {
    const at = lower.indexOf(root)
    if (at === -1) continue
    const pkg = joined.slice(at + root.length)
    return {
      name: fileStem(fileName),
      location: pkg === '' ? null : pkg.replaceAll('/', '.'),
      module,
    }
  }
  return {
    name: fileName,
    location: afterModule.length === 0 ? null : afterModule.join('/'),
    module,
  }
}
