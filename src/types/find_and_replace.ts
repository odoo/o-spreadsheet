import { Range } from "./range";

export interface SearchOptions {
  matchCase: boolean;
  exactMatch: boolean;
  searchFormulas: boolean;
  includeHidden: boolean;
  searchScope: "allSheets" | "activeSheet" | "specificRange";
  specificRange?: Range;
}
