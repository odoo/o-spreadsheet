export function formatNumber(n: number): string {
  if (Number.isInteger(n)) {
    return n.toString();
  }
  return n.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 10 });
}

export function formatDecimal(n: number, decimals: number, sep: string = ""): string {
  if (n < 0) {
    return "-" + formatDecimal(-n, decimals);
  }
  const exponentString = `${n}e${decimals}`;
  const value = Math.round(Number(exponentString));
  let result = Number(`${value}e-${decimals}`).toFixed(decimals);
  if (sep) {
    let p: number = result.indexOf(".")!;
    result = result.replace(/\d(?=(?:\d{3})+(?:\.|$))/g, (m, i) =>
      p < 0 || i < p ? `${m}${sep}` : m
    );
  }
  return result;
}

export function formatPercent(n: number): string {
  return formatDecimal(100 * n, 2) + "%";
}

export function formatValue(value: any, format: string): string {
  if (format === "0.00%") {
    return formatPercent(value);
  }
  if (format === "#,##0.00") {
    return formatDecimal(value, 2, ",");
  }
  return "not implemented yet...";
}
