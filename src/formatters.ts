import { formatDecimal } from "./helpers/index";

export function formatValue(value: any, format: string): string {
  const parts = format.split(";");
  const l = parts.length;
  if (value < 0) {
    if (l > 1) {
      return _formatValue(-value, parts[1]);
    } else {
      return "-" + _formatValue(-value, parts[0]);
    }
  }
  const index = l === 3 && value === 0 ? 2 : 0;
  return _formatValue(value, parts[index]);
}

function _formatValue(value: any, format: string): string {
  const parts = format.split(".");
  const decimals = parts.length === 1 ? 0 : parts[1].match(/0/g)!.length;
  const separator = parts[0].includes(",") ? "," : "";
  const isPercent = format.includes("%");
  if (isPercent) {
    value = value * 100;
  }
  const rawNumber = formatDecimal(value, decimals, separator);
  if (isPercent) {
    return rawNumber + "%";
  }
  return rawNumber;
}
