import { SortStore } from "../plugins/ui_feature/sort";
import { Registry } from "../registries/registry";
import { SpreadsheetStore } from "../stores/spreadsheet_store";
import { StoreConstructor } from "../types/store_engine";

export const globalStores = new Registry<StoreConstructor<SpreadsheetStore>>().add(
  "sort",
  SortStore
);
