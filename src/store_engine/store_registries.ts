import { Registry } from "../registries/registry";
import { InsertPivotStore } from "../stores/insert_pivot";
import { SpreadsheetStore } from "../stores/spreadsheet_store";
import { StoreConstructor } from "../types/store_engine";

export const globalStores = new Registry<StoreConstructor<SpreadsheetStore>>().add(
  "insert_pivot",
  InsertPivotStore
);
