/**
 * Collapsible directory tree for git file lists. Directories toggle open /
 * closed; files are rendered by the caller so status / history rows keep
 * their own actions and colors.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { collectDirKeys, type PathTreeNode } from './git-tree.ts'
import css from './sidebar.module.css'

export function GitPathTree<T extends { path: string }>(props: {
  nodes: readonly PathTreeNode<T>[]
  renderFile: (entry: T, name: string, depth: number) => ReactNode
}) {
  const { nodes, renderFile } = props
  const allKeys = useMemo(() => collectDirKeys(nodes), [nodes])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  // A newly appeared directory starts expanded (IDEA default).
  useEffect(() => {
    setCollapsed((current) => {
      const known = new Set(allKeys)
      let changed = false
      const next = new Set<string>()
      for (const key of current) {
        if (known.has(key)) next.add(key)
        else changed = true
      }
      return changed ? next : current
    })
  }, [allKeys])

  const toggle = useCallback((key: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const rows: ReactNode[] = []
  const walk = (items: readonly PathTreeNode<T>[], depth: number): void => {
    for (const node of items) {
      if (node.kind === 'dir') {
        const open = !collapsed.has(node.key)
        rows.push(
          <button
            key={`d:${node.key}`}
            type="button"
            className={css.gitTreeDir}
            style={{ paddingLeft: 8 + depth * 14 }}
            aria-expanded={open}
            onClick={() => { toggle(node.key) }}
          >
            <span className={open ? css.gitTreeChevronOpen : css.gitTreeChevron} aria-hidden />
            <span className={css.gitTreeDirName}>{node.name}</span>
          </button>,
        )
        if (open) walk(node.children, depth + 1)
        continue
      }
      rows.push(
        <div key={`f:${node.key}`} className={css.gitTreeFile} style={{ paddingLeft: 8 + depth * 14 }}>
          {renderFile(node.entry, node.name, depth)}
        </div>,
      )
    }
  }
  walk(nodes, 0)
  return <>{rows}</>
}
