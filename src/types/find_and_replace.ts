import { Range } from "@odoo/o-spreadsheet-engine/types/range";

export interface SearchOptions {
  matchCase: boolean;
  exactMatch: boolean;
  searchFormulas: boolean;
  searchScope: "allSheets" | "activeSheet" | "specificRange";
  specificRange?: Range;
}
