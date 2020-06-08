import { toXC } from "../../helpers/index";
import { Registry } from "../../registry";
import { Cell, SpreadsheetEnv } from "../../types/index";

//------------------------------------------------------------------------------
// Context Menu Registry
//------------------------------------------------------------------------------

export type ContextMenuType = "COLUMN" | "ROW" | "CELL";

interface BaseContextMenuItem {
  name: string;
  description: string;
  isEnabled?: (cell: Cell | null) => boolean;
  isVisible?: (type: ContextMenuType, env: SpreadsheetEnv) => boolean;
}

export interface ActionContextMenuItem extends BaseContextMenuItem {
  type: "action";
  action: (env: SpreadsheetEnv) => void;
}

export interface RootContextMenuItem extends BaseContextMenuItem {
  type: "root";
  subMenus: (env: SpreadsheetEnv) => ContextMenuItem[];
}

interface SeparatorContextMenuItem {
  type: "separator";
  isVisible?: (type: ContextMenuType) => boolean;
}

export type ContextMenuItem =
  | ActionContextMenuItem
  | RootContextMenuItem
  | SeparatorContextMenuItem;

export const contextMenuRegistry = new Registry<ContextMenuItem>()
  .add("cut", {
    type: "action",
    name: "cut",
    description: "Cut",
    action(env: SpreadsheetEnv) {
      env.dispatch("CUT", { target: env.getters.getSelectedZones() });
    },
  })
  .add("copy", {
    type: "action",
    name: "copy",
    description: "Copy",
    action(env: SpreadsheetEnv) {
      env.dispatch("COPY", { target: env.getters.getSelectedZones() });
    },
  })
  .add("paste", {
    type: "action",
    name: "paste",
    description: "Paste",
    action(env: SpreadsheetEnv) {
      env.dispatch("PASTE", { target: env.getters.getSelectedZones(), interactive: true });
    },
  })
  .add("paste_special", {
    type: "root",
    name: "paste_special",
    description: "Paste special",
    subMenus: (env: SpreadsheetEnv) => [
      {
        type: "action",
        name: "paste_special_format",
        description: "Paste format only",
        action(env: SpreadsheetEnv) {
          env.dispatch("PASTE", {
            target: env.getters.getSelectedZones(),
            onlyFormat: true,
          });
        },
      },
    ],
  })
  .add("separator1", {
    type: "separator",
  })
  .add("clear_cell", {
    type: "action",
    name: "clear_cell",
    description: "Clear cell",
    action(env: SpreadsheetEnv) {
      env.dispatch("SET_VALUE", { xc: toXC(...env.getters.getPosition()), text: "" });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "CELL";
    },
    isEnabled: (cell: Cell | null) => {
      return Boolean(cell && cell.content);
    },
  })
  .add("conditional_formatting", {
    type: "action",
    name: "conditional_formatting",
    description: "Conditional formatting",
    action(env: SpreadsheetEnv) {
      env.openSidePanel("ConditionalFormatting");
    },
  })
  .add("delete_column", {
    type: "action",
    name: "delete_column",
    description: "Delete column(s)",
    action(env: SpreadsheetEnv) {
      const columns = env.getters.getActiveCols();
      env.dispatch("REMOVE_COLUMNS", {
        columns: [...columns],
        sheet: env.getters.getActiveSheet(),
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "COLUMN";
    },
  })
  .add("clear_column", {
    type: "action",
    name: "clear_column",
    description: "Clear column(s)",
    action(env: SpreadsheetEnv) {
      const target = [...env.getters.getActiveCols()].map((index) =>
        env.getters.getColsZone(index, index)
      );
      env.dispatch("DELETE_CONTENT", {
        target,
        sheet: env.getters.getActiveSheet(),
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "COLUMN";
    },
  })
  .add("add_column_before", {
    type: "action",
    name: "add_column_before",
    description: "Add column before",
    action(env: SpreadsheetEnv) {
      const column = Math.min(...env.getters.getActiveCols());
      const quantity = env.getters.getActiveCols().size;
      env.dispatch("ADD_COLUMNS", {
        sheet: env.getters.getActiveSheet(),
        position: "before",
        column,
        quantity,
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "COLUMN";
    },
  })
  .add("add_column_after", {
    type: "action",
    name: "add_column_after",
    description: "Add column after",
    action(env: SpreadsheetEnv) {
      const column = Math.max(...env.getters.getActiveCols());
      const quantity = env.getters.getActiveCols().size;
      env.dispatch("ADD_COLUMNS", {
        sheet: env.getters.getActiveSheet(),
        position: "after",
        column,
        quantity,
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "COLUMN";
    },
  })
  .add("delete_row", {
    type: "action",
    name: "delete_row",
    description: "Delete row(s)",
    action(env: SpreadsheetEnv) {
      const rows = env.getters.getActiveRows();
      env.dispatch("REMOVE_ROWS", { sheet: env.getters.getActiveSheet(), rows: [...rows] });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "ROW";
    },
  })
  .add("clear_row", {
    type: "action",
    name: "clear_row",
    description: "Clear row(s)",
    action(env: SpreadsheetEnv) {
      const target = [...env.getters.getActiveRows()].map((index) =>
        env.getters.getRowsZone(index, index)
      );
      env.dispatch("DELETE_CONTENT", {
        target,
        sheet: env.getters.getActiveSheet(),
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "ROW";
    },
  })
  .add("add_row_before", {
    type: "action",
    name: "add_row_before",
    description: "Add row before",
    action(env: SpreadsheetEnv) {
      const row = Math.min(...env.getters.getActiveRows());
      const quantity = env.getters.getActiveRows().size;
      env.dispatch("ADD_ROWS", {
        sheet: env.getters.getActiveSheet(),
        position: "before",
        row,
        quantity,
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "ROW";
    },
  })
  .add("add_row_after", {
    type: "action",
    name: "add_row_after",
    description: "Add row after",
    action(env: SpreadsheetEnv) {
      const row = Math.max(...env.getters.getActiveRows());
      const quantity = env.getters.getActiveRows().size;
      env.dispatch("ADD_ROWS", {
        sheet: env.getters.getActiveSheet(),
        position: "after",
        row,
        quantity,
      });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "ROW";
    },
  });
