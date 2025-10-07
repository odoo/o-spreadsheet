import { _t } from "../../translation";
import { Locale } from "../../types/locale";
import { formatValue } from "../format/format";

export function getPivotTooBigErrorMessage(numberOfCells: number, locale: Locale): string {
  const formattedNumber = formatValue(numberOfCells, {
    format: "0,00",
    locale: locale,
  });
  return _t(
    "Oops—this pivot table is quite large (%s cells). Try simplifying it using the side panel.",
    formattedNumber
  );
}
