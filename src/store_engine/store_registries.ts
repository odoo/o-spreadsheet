import { Registry } from "../registries/registry";
import { FormatStore } from "../stores/format";
import { SpreadsheetStore } from "../stores/spreadsheet_store";
import { StoreConstructor } from "../types/store_engine";

export const globalStores = new Registry<StoreConstructor<SpreadsheetStore>>().add(
  "format",
  FormatStore
);
