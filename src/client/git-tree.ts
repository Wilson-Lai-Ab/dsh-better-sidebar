/**
 * A directory tree over repo-relative paths. Used by the git change list
 * (module / directory grouping) and the history file list so nested folders
 * can expand and collapse like IDEA's commit tree.
 */

export type PathTreeNode<T> =
  | { kind: 'dir'; name: string; key: string; children: PathTreeNode<T>[] }
  | { kind: 'file'; name: string; key: string; entry: T }

type MutableDir<T> = {
  kind: 'dir'
  name: string
  key: string
  dirs: Map<string, MutableDir<T>>
  files: Array<{ kind: 'file'; name: string; key: string; entry: T }>
}

/** Split a repo-relative path into non-empty segments (`a\\b` → `['a','b']`). */
export function pathSegments(path: string): string[] {
  return path.replace(/\\/g, '/').split('/').filter(part => part !== '')
}

/**
 * Build a sorted directory tree. Files at the repo root sit at the top
 * level; intermediate folders become expandable dir nodes.
 */
export function buildPathTree<T extends { path: string }>(entries: readonly T[]): PathTreeNode<T>[] {
  const root: MutableDir<T> = { kind: 'dir', name: '', key: '', dirs: new Map(), files: [] }
  for (const entry of entries) {
    const parts = pathSegments(entry.path)
    if (parts.length === 0) continue
    let node = root
    for (let index = 0; index < parts.length - 1; index += 1) {
      const name = parts[index]!
      const key = parts.slice(0, index + 1).join('/')
      let next = node.dirs.get(name)
      if (next === undefined) {
        next = { kind: 'dir', name, key, dirs: new Map(), files: [] }
        node.dirs.set(name, next)
      }
      node = next
    }
    const name = parts[parts.length - 1]!
    node.files.push({ kind: 'file', name, key: entry.path, entry })
  }
  const freeze = (dir: MutableDir<T>): PathTreeNode<T>[] => {
    const dirs = [...dir.dirs.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(child => ({
        kind: 'dir' as const,
        name: child.name,
        key: child.key,
        children: freeze(child),
      }))
    const files = [...dir.files].sort((a, b) => a.name.localeCompare(b.name))
    return compactPathTree([...dirs, ...files])
  }
  return freeze(root)
}

/**
 * Collapse a chain of single-child directories into one row
 * (`src/main/java/com/hexin`) — IDEA/VSCode style. A folder that has
 * files or more than one child stays a real expand point.
 */
export function compactPathTree<T>(nodes: readonly PathTreeNode<T>[]): PathTreeNode<T>[] {
  return nodes.map((node) => compactNode(node))
}

function compactNode<T>(node: PathTreeNode<T>): PathTreeNode<T> {
  if (node.kind === 'file') return node
  let name = node.name
  let key = node.key
  let children = compactPathTree(node.children)
  while (children.length === 1) {
    const only: PathTreeNode<T> | undefined = children[0]
    if (only === undefined || only.kind !== 'dir') break
    name = `${name}/${only.name}`
    key = only.key
    children = only.children
  }
  return { kind: 'dir', name, key, children }
}

/** Every directory key in the tree (used to start fully expanded). */
export function collectDirKeys<T>(nodes: readonly PathTreeNode<T>[]): string[] {
  const keys: string[] = []
  const walk = (items: readonly PathTreeNode<T>[]): void => {
    for (const node of items) {
      if (node.kind !== 'dir') continue
      keys.push(node.key)
      walk(node.children)
    }
  }
  walk(nodes)
  return keys
}
