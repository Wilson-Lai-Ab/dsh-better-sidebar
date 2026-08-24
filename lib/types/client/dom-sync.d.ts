/**
 * DOM observers that paint into the host conversation header. A callback
 * that mutates the tree must not re-enter itself, and a drag must not
 * schedule work — both used to freeze the page (MutationObserver + class
 * paints, or drop-pad inserts while `data-dsh-tab-dragging` is on).
 */
/** True while a workbench tab or file is being dragged. */
export declare function isPluginDragActive(): boolean;
/** Explorer / history file rows: pause host-header observers for the gesture. */
export declare function setFileDragging(active: boolean): void;
/**
 * Coalesce `work` onto the next animation frame. Re-entry while `work`
 * runs is ignored (our own mutations must not retrigger us). Drags skip
 * the callback entirely so drop-pad CSS / host hover classes cannot loop.
 */
export declare function scheduleGuardedFrame(work: () => void): {
    schedule: () => void;
    disconnect: () => void;
};
/**
 * Observe `target` without watching `class` (decorate paints classes).
 * Child-list / selected-tab attribute changes still refresh.
 */
export declare function observeHostHeader(target: Node, onChange: () => void): MutationObserver;
