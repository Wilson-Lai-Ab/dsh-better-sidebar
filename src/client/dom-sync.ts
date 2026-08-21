/**
 * DOM observers that paint into the host conversation header. A callback
 * that mutates the tree must not re-enter itself, and a drag must not
 * schedule work — both used to freeze the page (MutationObserver + class
 * paints, or drop-pad inserts while `data-dsh-tab-dragging` is on).
 */

/** True while a workbench tab or file is being dragged. */
export function isPluginDragActive(): boolean {
  return document.body.hasAttribute('data-dsh-tab-dragging')
    || document.body.hasAttribute('data-dsh-file-dragging')
}

/** Explorer / history file rows: pause host-header observers for the gesture. */
export function setFileDragging(active: boolean): void {
  if (active) document.body.setAttribute('data-dsh-file-dragging', '')
  else document.body.removeAttribute('data-dsh-file-dragging')
}

/**
 * Coalesce `work` onto the next animation frame. Re-entry while `work`
 * runs is ignored (our own mutations must not retrigger us). Drags skip
 * the callback entirely so drop-pad CSS / host hover classes cannot loop.
 */
export function scheduleGuardedFrame(work: () => void): {
  schedule: () => void
  disconnect: () => void
} {
  let frame = 0
  let running = false
  let skippedForDrag = false
  const run = (): void => {
    frame = 0
    if (isPluginDragActive()) {
      skippedForDrag = true
      return
    }
    running = true
    try {
      work()
    } finally {
      running = false
    }
  }
  const schedule = (): void => {
    if (running || frame !== 0) return
    if (isPluginDragActive()) {
      skippedForDrag = true
      return
    }
    frame = window.requestAnimationFrame(run)
  }
  const afterDrag = (): void => {
    if (!skippedForDrag) return
    skippedForDrag = false
    schedule()
  }
  window.addEventListener('dragend', afterDrag, true)
  window.addEventListener('drop', afterDrag, true)
  return {
    schedule,
    disconnect: () => {
      window.removeEventListener('dragend', afterDrag, true)
      window.removeEventListener('drop', afterDrag, true)
      if (frame !== 0) window.cancelAnimationFrame(frame)
      frame = 0
    },
  }
}

/**
 * Observe `target` without watching `class` (decorate paints classes).
 * Child-list / selected-tab attribute changes still refresh.
 */
export function observeHostHeader(target: Node, onChange: () => void): MutationObserver {
  const watcher = new MutationObserver(onChange)
  watcher.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-selected'],
  })
  return watcher
}
