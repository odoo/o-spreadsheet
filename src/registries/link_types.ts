import { Model } from "..";
import { O_SPREADSHEET_LINK_PREFIX, parseSheetURL } from "../helpers";
import { Registry } from "../registry";
import { _lt } from "../translation";

//------------------------------------------------------------------------------
// URL Registry
//------------------------------------------------------------------------------

export interface URLType {
  match: (content) => boolean;
  open: (url: string, model: Model) => void;
  representation: (url: string, model: Model) => string;
  isEditable: boolean;
  sequence: number;
}

export const urlRegistry = new Registry<URLType>();

urlRegistry.add("sheet_URL", {
  match: (url) => url.startsWith(O_SPREADSHEET_LINK_PREFIX),
  open: (url: string, model: Model) => {
    const sheetId = parseSheetURL(url);
    model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: model.getters.getActiveSheetId(),
      sheetIdTo: sheetId,
    });
  },
  representation: (url: string, model: Model) => {
    const sheetId = parseSheetURL(url);
    return model.getters.tryGetSheetName(sheetId) || _lt("Invalid sheet");
  },
  isEditable: false,
  sequence: 0,
});
