import { toXC } from "../../helpers/index";
import { Registry } from "../../registry";
import { Cell } from "../../types";
import { SpreadsheetEnv } from "../spreadsheet";
import { Model } from "../../model";

//------------------------------------------------------------------------------
// Context Menu Registry
//------------------------------------------------------------------------------

export type ContextMenuType = "COLUMN" | "ROW" | "CELL";

export interface ActionContextMenuItem {
  type: "action";
  name: string;
  description: string;
  isEnabled?: (cell: Cell | null) => boolean;
  isVisible?: (type: ContextMenuType) => boolean;
  action: (model: Model, subEnv: SpreadsheetEnv) => void;
}

interface SeparatorContextMenuItem {
  type: "separator";
  isVisible?: (type: ContextMenuType) => boolean;
}

export type ContextMenuItem = ActionContextMenuItem | SeparatorContextMenuItem;

export const contextMenuRegistry = new Registry<ContextMenuItem>()
  .add("cut", {
    type: "action",
    name: "cut",
    description: "Cut",
    action(model) {
      model.dispatch("CUT", { target: model.getters.getSelectedZones() });
    }
  })
  .add("copy", {
    type: "action",
    name: "copy",
    description: "Copy",
    action(model) {
      model.dispatch("COPY", { target: model.getters.getSelectedZones() });
    }
  })
  .add("paste", {
    type: "action",
    name: "paste",
    description: "Paste",
    action(model) {
      model.dispatch("PASTE", {
        target: model.getters.getSelectedZones(),
        onlyFormat: false
      });
    }
  })
  .add("separator1", {
    type: "separator"
  })
  .add("clear_cell", {
    type: "action",
    name: "clear_cell",
    description: "Clear cell",
    action(model: Model) {
      model.dispatch("SET_VALUE", { xc: toXC(...model.getters.getPosition()), text: "" });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "CELL";
    },
    isEnabled: (cell: Cell | null) => {
      return Boolean(cell && cell.content);
    }
  })
  .add("conditional_formatting", {
    type: "action",
    name: "conditional_formatting",
    description: "Conditional Format",
    action(model, subEnv: SpreadsheetEnv) {
      subEnv.openSidePanel("ConditionalFormatting");
    }
  })
  .add("delete_column", {
    type: "action",
    name: "delete_column",
    description: "Delete column(s)",
    action(model) {
      const columns = model.getters.getActiveCols();
      model.dispatch("REMOVE_COLUMNS", {
        columns: [...columns],
        sheet: model.getters.getActiveSheet()
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "COLUMN";
    }
  })
  .add("clear_column", {
    type: "action",
    name: "clear_column",
    description: "Clear column(s)",
    action(model) {
      const target = [...model.getters.getActiveCols()].map(index =>
        model.getters.getColsZone(index, index)
      );
      model.dispatch("DELETE_CONTENT", {
        target,
        sheet: model.getters.getActiveSheet()
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "COLUMN";
    }
  })
  .add("add_column_before", {
    type: "action",
    name: "add_column_before",
    description: "Add column before",
    action(model) {
      const column = Math.min(...model.getters.getActiveCols());
      const quantity = model.getters.getActiveCols().size;
      model.dispatch("ADD_COLUMNS", {
        sheet: model.getters.getActiveSheet(),
        position: "before",
        column,
        quantity
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "COLUMN";
    }
  })
  .add("add_column_after", {
    type: "action",
    name: "add_column_after",
    description: "Add column after",
    action(model) {
      const column = Math.max(...model.getters.getActiveCols());
      const quantity = model.getters.getActiveCols().size;
      model.dispatch("ADD_COLUMNS", {
        sheet: model.getters.getActiveSheet(),
        position: "after",
        column,
        quantity
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "COLUMN";
    }
  })
  .add("delete_row", {
    type: "action",
    name: "delete_row",
    description: "Delete row(s)",
    action(model) {
      const rows = model.getters.getActiveRows();
      model.dispatch("REMOVE_ROWS", { sheet: model.getters.getActiveSheet(), rows: [...rows] });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "ROW";
    }
  })
  .add("clear_row", {
    type: "action",
    name: "clear_row",
    description: "Clear row(s)",
    action(model) {
      const target = [...model.getters.getActiveRows()].map(index =>
        model.getters.getRowsZone(index, index)
      );
      model.dispatch("DELETE_CONTENT", {
        target,
        sheet: model.getters.getActiveSheet()
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "ROW";
    }
  })
  .add("add_row_before", {
    type: "action",
    name: "add_row_before",
    description: "Add row before",
    action(model) {
      const row = Math.min(...model.getters.getActiveRows());
      const quantity = model.getters.getActiveRows().size;
      model.dispatch("ADD_ROWS", {
        sheet: model.getters.getActiveSheet(),
        position: "before",
        row,
        quantity
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "ROW";
    }
  })
  .add("add_row_after", {
    type: "action",
    name: "add_row_after",
    description: "Add row after",
    action(model) {
      const row = Math.max(...model.getters.getActiveRows());
      const quantity = model.getters.getActiveRows().size;
      model.dispatch("ADD_ROWS", {
        sheet: model.getters.getActiveSheet(),
        position: "after",
        row,
        quantity
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "ROW";
    }
  });
