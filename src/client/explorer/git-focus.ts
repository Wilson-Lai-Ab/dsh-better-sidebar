/**
 * Pick which git work tree owns an explorer path, then the repo-relative
 * directory the Git panel should expand to.
 */
export function gitFocusOf(
  path: string,
  isDir: boolean,
  repos: readonly { root: string }[],
): { repo: string; dir: string } | undefined {
  const abs = path.replace(/\\/g, '/')
  const root = [...repos]
    .map(repo => repo.root.replace(/\\/g, '/').replace(/\/+$/, ''))
    .filter(candidate => abs === candidate || abs.startsWith(`${candidate}/`))
    .sort((a, b) => b.length - a.length)[0]
  if (root === undefined) return undefined
  if (abs === root) return { repo: root, dir: '' }
  const rel = abs.slice(root.length + 1)
  const dir = isDir ? rel : rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
  return { repo: root, dir }
}
