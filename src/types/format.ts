import type { Locale } from "./locale";
import type { Alias } from "./misc";

export type Format = string & Alias;

export type FormattedValue = string & Alias;

export interface LocaleFormat {
  locale: Locale;
  format?: Format;
}
