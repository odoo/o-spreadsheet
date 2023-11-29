import { Locale } from "./locale";
import { Alias } from "./misc";

export type Format = string & Alias;

export type FormattedValue = string & Alias;

export interface LocaleFormat {
  locale: Locale;
  format?: Format;
}

export const PLAIN_TEXT_FORMAT: Format = "@"; // see OpenXML spec §18.8.31
