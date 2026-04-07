import { Alias } from "./misc";

export type LocaleCode = string & Alias;

export interface Locale {
  name: string;
  code: LocaleCode;
  thousandsSeparator?: string;
  decimalSeparator: string;
  weekStart: number; //1 = Monday, 7 = Sunday
  dateFormat: string;
  timeFormat: string;
  formulaArgSeparator: string;
  /** Describes how to split the digits with the thousand separator. See `getIndexesOfDigitsWithThousandSeparator` for details. */
  digitGrouping?: string;
}

export const DEFAULT_LOCALES: Locale[] = [
  {
    name: "English (US)",
    code: "en_US" as LocaleCode,
    thousandsSeparator: ",",
    decimalSeparator: ".",
    weekStart: 7, // Sunday
    dateFormat: "m/d/yyyy",
    timeFormat: "hh:mm:ss a",
    formulaArgSeparator: ",",
  },
  {
    name: "French",
    code: "fr_FR" as LocaleCode,
    thousandsSeparator: " ",
    decimalSeparator: ",",
    weekStart: 1, // Monday
    dateFormat: "dd/mm/yyyy",
    timeFormat: "hh:mm:ss",
    formulaArgSeparator: ";",
  },
  {
    name: "English (India)",
    code: "en_IN" as LocaleCode,
    thousandsSeparator: ",",
    decimalSeparator: ".",
    weekStart: 7, // Sunday
    dateFormat: "dd/mm/yyyy",
    timeFormat: "hh:mm:ss a",
    formulaArgSeparator: ",",
    digitGrouping: "[3,2,0]", // 12,34,56,789.00
  },
];
export const DEFAULT_LOCALE: Locale = DEFAULT_LOCALES[0];

export const DEFAULT_LOCALE_DIGIT_GROUPING = "[3,0]"; // Group digits 3 by 3
