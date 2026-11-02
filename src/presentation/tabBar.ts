/** Keep the floating tabs, screen padding and focus timer in the same safe area. */
export function tabBarMetrics(fontScale: number, bottomInset: number) {
  const height = 72 + Math.max(0, (fontScale - 1) * 32);
  const bottom = Math.max(bottomInset, 8);
  return { height, bottom, reserved: height + bottom };
}
