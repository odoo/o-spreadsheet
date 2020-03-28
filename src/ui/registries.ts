import { Registry } from "../registry";
import { ConditionalFormattingPanel } from "./side_panel/conditional_formatting";
import { Cell } from "../types/index";
import { GridModel } from "../model/grid_model";
import { SpreadsheetEnv } from "./spreadsheet";

//------------------------------------------------------------------------------
// Side Panel
//------------------------------------------------------------------------------
interface SidePanelContent {
  title: string;
  Body: any;
  Footer?: any;
}

export const sidePanelRegistry = new Registry<SidePanelContent>();

sidePanelRegistry.add("ConditionalFormatting", {
  title: "Conditional Formatting",
  Body: ConditionalFormattingPanel
});

//------------------------------------------------------------------------------
// Context Menu
//------------------------------------------------------------------------------
export type ContextMenuType = "COLUMN" | "ROW" | "CELL";

export interface ContextMenuItem {
  type: "separator" | "action";
  name: string;
  description: string;
  isEnabled?: (cell: Cell | null) => boolean;
  isVisible?: (type: ContextMenuType) => boolean;
  action: (model: GridModel, subEnv: SpreadsheetEnv) => void;
}

export const contextMenuRegistry = new Registry<ContextMenuItem>();

contextMenuRegistry.add("cut", {
  type: "action",
  name: "cut",
  description: "Cut",
  action(model) {
    model.dispatch({ type: "CUT", target: model.state.selection.zones });
  }
});
contextMenuRegistry.add("copy", {
  type: "action",
  name: "copy",
  description: "Copy",
  action(model) {
    model.dispatch({ type: "COPY", target: model.state.selection.zones });
  }
});
contextMenuRegistry.add("paste", {
  type: "action",
  name: "paste",
  description: "Paste",
  action(model) {
    model.dispatch({
      type: "PASTE",
      target: model.state.selection.zones,
      onlyFormat: false
    });
  }
});
contextMenuRegistry.add("clear_cell", {
  type: "action",
  name: "clear_cell",
  description: "Clear cell",
  action(model: GridModel) {
    model.dispatch({ type: "SET_VALUE", xc: model.state.activeXc, text: "" });
  },
  isVisible: (type: ContextMenuType): boolean => {
    return type === "CELL";
  },
  isEnabled: (cell: Cell | null) => {
    return Boolean(cell && cell.content);
  }
});
contextMenuRegistry.add("conditional_formatting", {
  type: "action",
  name: "conditional_formatting",
  description: "Conditional Format",
  action(model, subEnv: SpreadsheetEnv) {
    subEnv.openSidePanel("ConditionalFormatting");
  }
});
