import { Locale } from "./locale";
import { Alias } from "./misc";

export type Format = string & Alias;

export type FormattedValue = string & Alias;

export interface LocaleFormat {
  locale: Locale;
  format?: Format;
}
