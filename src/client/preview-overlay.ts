/**
 * The conversation preview overlay must start below the host 对话 / 轨迹
 * strip. When file tabs wrap, the second row can paint past a 48px header
 * while `header.getBoundingClientRect().bottom` stays 48 — cover that by
 * taking the max of header and tablist bottoms.
 */
export function previewOverlayTop(
  header: { bottom: number } | null,
  tablist: { bottom: number } | null,
  fallback = 48,
): number {
  const bottoms = [header?.bottom, tablist?.bottom].filter((value): value is number => typeof value === 'number')
  if (bottoms.length === 0) return fallback
  return Math.max(...bottoms)
}
