import { Registry } from "../registries/registry";
import { MainViewportStore } from "../stores/main_viewport_store";
import { SpreadsheetStore } from "../stores/spreadsheet_store";
import { StoreConstructor } from "../types/store_engine";

export const globalStores = new Registry<StoreConstructor<SpreadsheetStore>>();

globalStores.add("main_viewport", MainViewportStore);
