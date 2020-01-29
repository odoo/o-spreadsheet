export function formatNumber(n: number): string {
  if (Number.isInteger(n)) {
    return n.toString();
  }
  return n.toLocaleString("fullwide", { useGrouping: false, maximumFractionDigits: 10 });
}
