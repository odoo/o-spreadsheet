export function formatNumber(n: number): string {
  if (Number.isInteger(n)) {
    return n.toString();
  }
  return n.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 10 });
}
