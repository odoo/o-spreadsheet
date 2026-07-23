import { Registry } from "../registries/registry";
import { LockSheetStore } from "../stores/lock_sheet_store";
import { SpreadsheetStore } from "../stores/spreadsheet_store";
import { StoreConstructor } from "../types/store_engine";

export const globalStores = new Registry<StoreConstructor<SpreadsheetStore>>();

globalStores.add("lock_sheet", LockSheetStore);
