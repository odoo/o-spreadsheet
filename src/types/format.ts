import { Locale } from "./locale";

import { Alias } from "@odoo/o-spreadsheet-engine";

export type Format = string & Alias;

export type FormattedValue = string & Alias;

export interface LocaleFormat {
  locale: Locale;
  format?: Format;
}
