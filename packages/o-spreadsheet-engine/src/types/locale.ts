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
  arrayRowSeparator: string;
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
    arrayRowSeparator: ";",
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
    arrayRowSeparator: "\\",
  },
];
export const DEFAULT_LOCALE: Locale = DEFAULT_LOCALES[0];
