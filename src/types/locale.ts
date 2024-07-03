import { Alias } from "./misc";

export type LocaleCode = string & Alias;

export interface Locale {
  name: string;
  code: LocaleCode;
  thousandsSeparator?: string;
  decimalSeparator: string;
  dateFormat: string;
  timeFormat: string;
  formulaArgSeparator: string;
}

export const DEFAULT_LOCALES: Locale[] = [
  {
    name: "English (US)",
    code: "en_US",
    thousandsSeparator: ",",
    decimalSeparator: ".",
    dateFormat: "m/d/yyyy",
    timeFormat: "hh:mm:ss a",
    formulaArgSeparator: ",",
  },
  {
    name: "French",
    code: "fr_FR",
    thousandsSeparator: " ",
    decimalSeparator: ",",
    dateFormat: "dd/mm/yyyy",
    timeFormat: "hh:mm:ss",
    formulaArgSeparator: ";",
  },
];
export const DEFAULT_LOCALE: Locale = DEFAULT_LOCALES[0];
