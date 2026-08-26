/**
 * The conversation preview overlay must start below the host 对话 / 轨迹
 * strip. When file tabs wrap, the second row can paint past a 48px header
 * while `header.getBoundingClientRect().bottom` stays 48 — cover that by
 * taking the max of header and tablist bottoms.
 */
export declare function previewOverlayTop(header: {
    bottom: number;
} | null, tablist: {
    bottom: number;
} | null, fallback?: number): number;
