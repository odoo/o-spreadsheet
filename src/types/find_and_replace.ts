import { Range, RangeData } from "./range";

export interface SearchOptions {
  matchCase: boolean;
  exactMatch: boolean;
  searchFormulas: boolean;
  searchScope: "allSheets" | "activeSheet" | "specificRange";
  specificRange?: RangeData;
}

export interface SearchOptionsInternal extends Omit<SearchOptions, "specificRange"> {
  specificRange?: Range;
}
