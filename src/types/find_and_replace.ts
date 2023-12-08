import { Range } from "./range";

export interface SearchOptions {
  matchCase: boolean;
  exactMatch: boolean;
  searchFormulas: boolean;
  searchScope: "allSheets" | "activeSheet" | "specificRange";
  specificRange?: Range;
}
