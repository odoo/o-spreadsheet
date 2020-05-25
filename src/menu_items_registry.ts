import { Registry } from "./registry";
import { SpreadsheetEnv } from "./types/env";
import { numberToLetters } from "./helpers/index";
import { Style } from "./types/misc";
import { fontSizes } from "./fonts";

//------------------------------------------------------------------------------
// Menu Item Registry
//------------------------------------------------------------------------------

/**
 * An ActionMenuItem represent a menu item for the menus of the topbar.
 * Later, it will be reused for the context menu items as well.
 *
 * An ActionMenuItem has:
 * - id, used for example to add child
 * - name, which can be a string or a function to compute it
 * - sequence, which represents its position inside the
 *   menus (the lower sequence it has, the upper it is in the menu)
 * - isVisible, which can be defined to compute the visibility of the item
 * - action, the action associated to this item
 * - children, subitems associated to this item
 *    NB: an item without action or children is not displayed !
 * - separator, whether it should add a separator below the item
 *    NB: a separator defined on the last item is not displayed !
 *
 */
export interface ActionMenuItem {
  name: string | ((env: SpreadsheetEnv) => string);
  sequence: number;
  id?: string;
  isVisible?: (env: SpreadsheetEnv) => boolean;
  action?: (env: SpreadsheetEnv) => void;
  children?: FullActionMenuItem[];
  separator?: boolean;
}

export type FullActionMenuItem = Required<ActionMenuItem>;

const DEFAULT_MENU_ITEM = (key: string) => ({
  isVisible: () => true,
  action: false,
  children: [],
  separator: false,
  id: key,
});
/**
 * The class Registry is extended in order to add the function addChild
 *
 */
export class MenuItemRegistry extends Registry<FullActionMenuItem> {
  createFullMenuItem(key: string, value: ActionMenuItem): FullActionMenuItem {
    return Object.assign(DEFAULT_MENU_ITEM(key), value);
  }
  /**
   * @override
   */
  add(key: string, value: ActionMenuItem): MenuItemRegistry {
    this.content[key] = this.createFullMenuItem(key, value);
    return this;
  }
  /**
   * Add a subitem to an existing item
   * @param path Path of items to add this subitem
   * @param value Subitem to add
   */
  addChild(key: string, path: string[], value: ActionMenuItem): MenuItemRegistry {
    const root = path.splice(0, 1)[0];
    let node: FullActionMenuItem | undefined = this.content[root];
    if (!node) {
      throw new Error(`Path ${root + ":" + path.join(":")} not found`);
    }
    for (let p of path) {
      node = node.children.find((elt) => elt.id === p);
      if (!node) {
        throw new Error(`Path ${root + ":" + path.join(":")} not found`);
      }
    }
    node.children.push(this.createFullMenuItem(key, value));
    return this;
  }
}

function getColumnsNumber(env: SpreadsheetEnv): number {
  const activeCols = env.getters.getActiveCols();
  if (activeCols.size) {
    return activeCols.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    return zone.right - zone.left + 1;
  }
}

function getRowsNumber(env: SpreadsheetEnv): number {
  const activeRows = env.getters.getActiveRows();
  if (activeRows.size) {
    return activeRows.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    return zone.bottom - zone.top + 1;
  }
}

function setFormatter(env: SpreadsheetEnv, formatter: string) {
  env.dispatch("SET_FORMATTER", {
    sheet: env.getters.getActiveSheet(),
    target: env.getters.getSelectedZones(),
    formatter,
  });
}

function setStyle(env: SpreadsheetEnv, style: Style) {
  env.dispatch("SET_FORMATTING", {
    sheet: env.getters.getActiveSheet(),
    target: env.getters.getSelectedZones(),
    style,
  });
}

export const menuItemRegistry = new MenuItemRegistry();

menuItemRegistry
  .add("file", { name: "File", sequence: 10 })
  .add("edit", { name: "Edit", sequence: 20 })
  .add("view", { name: "View", sequence: 30 })
  .add("insert", { name: "Insert", sequence: 40 })
  .add("format", { name: "Format", sequence: 50 })
  .add("data", { name: "Data", sequence: 60 })
  .addChild("save", ["file"], {
    name: "Save",
    sequence: 10,
    action: () => console.log("Not implemented"),
  })
  .addChild("undo", ["edit"], {
    name: "Undo",
    sequence: 10,
    action: (env: SpreadsheetEnv) => env.dispatch("UNDO"),
  })
  .addChild("redo", ["edit"], {
    name: "Redo",
    sequence: 20,
    action: (env: SpreadsheetEnv) => env.dispatch("REDO"),
    separator: true,
  })
  .addChild("copy", ["edit"], {
    name: "Copy",
    sequence: 30,
    action: (env: SpreadsheetEnv) =>
      env.dispatch("COPY", {
        target: env.getters.getSelectedZones(),
      }),
  })
  .addChild("cut", ["edit"], {
    name: "Cut",
    sequence: 40,
    action: (env: SpreadsheetEnv) =>
      env.dispatch("CUT", {
        target: env.getters.getSelectedZones(),
      }),
  })
  .addChild("paste", ["edit"], {
    name: "Paste",
    sequence: 50,
    action: (env: SpreadsheetEnv) =>
      env.dispatch("PASTE", { target: env.getters.getSelectedZones(), interactive: true }),
  })
  .addChild("paste_special", ["edit"], {
    name: "Paste special",
    sequence: 60,
    separator: true,
  })
  .addChild("paste_special_format", ["edit", "paste_special"], {
    name: "Paste format only",
    sequence: 20,
    action: (env: SpreadsheetEnv) => {
      env.dispatch("PASTE", {
        target: env.getters.getSelectedZones(),
        onlyFormat: true,
      });
    },
  })
  .addChild("edit_delete_cell_values", ["edit"], {
    name: "Delete values",
    sequence: 70,
    action: (env: SpreadsheetEnv) => {
      env.dispatch("DELETE_CONTENT", {
        sheet: env.getters.getActiveSheet(),
        target: env.getters.getSelectedZones(),
      });
    },
  })
  .addChild("edit_delete_row", ["edit"], {
    name: (env: SpreadsheetEnv) => {
      let first = 0;
      let last = 0;
      const activesRows = env.getters.getActiveRows();
      if (activesRows.size !== 0) {
        first = Math.min(...activesRows);
        last = Math.max(...activesRows);
      } else {
        const zone = env.getters.getSelectedZones()[0];
        first = zone.top;
        last = zone.bottom;
      }
      if (first === last) {
        return `Delete row ${first + 1}`;
      }
      return `Delete rows ${first + 1} - ${last + 1}`;
    },
    sequence: 80,
    action: (env: SpreadsheetEnv) => {
      let rows = [...env.getters.getActiveRows()];
      if (!rows.length) {
        const zone = env.getters.getSelectedZones()[0];
        for (let i = zone.top; i <= zone.bottom; i++) {
          rows.push(i);
        }
      }
      env.dispatch("REMOVE_ROWS", {
        sheet: env.getters.getActiveSheet(),
        rows,
      });
    },
  })
  .addChild("edit_delete_column", ["edit"], {
    name: (env: SpreadsheetEnv) => {
      let first = 0;
      let last = 0;
      const activeCols = env.getters.getActiveCols();
      if (activeCols.size !== 0) {
        first = Math.min(...activeCols);
        last = Math.max(...activeCols);
      } else {
        const zone = env.getters.getSelectedZones()[0];
        first = zone.left;
        last = zone.right;
      }
      if (first === last) {
        return `Delete column ${numberToLetters(first)}`;
      }
      return `Delete columns ${numberToLetters(first)} - ${numberToLetters(last)}`;
    },
    sequence: 90,
    action: (env: SpreadsheetEnv) => {
      let columns = [...env.getters.getActiveCols()];
      if (!columns.length) {
        const zone = env.getters.getSelectedZones()[0];
        for (let i = zone.left; i <= zone.right; i++) {
          columns.push(i);
        }
      }
      env.dispatch("REMOVE_COLUMNS", {
        sheet: env.getters.getActiveSheet(),
        columns,
      });
    },
  })
  .addChild("insert_row_before", ["insert"], {
    name: (env: SpreadsheetEnv) => {
      const number = getRowsNumber(env);
      if (number === 1) {
        return "Row above";
      }
      return `${number} Rows above`;
    },
    sequence: 10,
    action: (env: SpreadsheetEnv) => {
      const activeRows = env.getters.getActiveRows();
      let row = 0;
      let quantity = 0;
      if (activeRows.size) {
        row = Math.min(...activeRows);
        quantity = activeRows.size;
      } else {
        const zone = env.getters.getSelectedZones()[0];
        row = zone.top;
        quantity = zone.bottom - zone.top + 1;
      }
      env.dispatch("ADD_ROWS", {
        sheet: env.getters.getActiveSheet(),
        position: "before",
        row,
        quantity,
      });
    },
  })
  .addChild("insert_row_after", ["insert"], {
    name: (env: SpreadsheetEnv) => {
      const number = getRowsNumber(env);
      if (number === 1) {
        return "Row below";
      }
      return `${number} Rows below`;
    },
    sequence: 20,
    action: (env: SpreadsheetEnv) => {
      const activeRows = env.getters.getActiveRows();
      let row = 0;
      let quantity = 0;
      if (activeRows.size) {
        row = Math.max(...activeRows);
        quantity = activeRows.size;
      } else {
        const zone = env.getters.getSelectedZones()[0];
        row = zone.bottom;
        quantity = zone.bottom - zone.top + 1;
      }
      env.dispatch("ADD_ROWS", {
        sheet: env.getters.getActiveSheet(),
        position: "after",
        row,
        quantity,
      });
    },
    separator: true,
  })
  .addChild("insert_column_before", ["insert"], {
    name: (env: SpreadsheetEnv) => {
      const number = getColumnsNumber(env);
      if (number === 1) {
        return "Column left";
      }
      return `${number} Columns left`;
    },
    sequence: 30,
    action: (env: SpreadsheetEnv) => {
      const activeCols = env.getters.getActiveCols();
      let column = 0;
      let quantity = 0;
      if (activeCols.size) {
        column = Math.min(...activeCols);
        quantity = activeCols.size;
      } else {
        const zone = env.getters.getSelectedZones()[0];
        column = zone.left;
        quantity = zone.right - zone.left + 1;
      }
      env.dispatch("ADD_COLUMNS", {
        sheet: env.getters.getActiveSheet(),
        position: "before",
        column,
        quantity,
      });
    },
  })
  .addChild("insert_column_after", ["insert"], {
    name: (env: SpreadsheetEnv) => {
      const number = getColumnsNumber(env);
      if (number === 1) {
        return "Column right";
      }
      return `${number} Columns right`;
    },
    sequence: 40,
    action: (env: SpreadsheetEnv) => {
      const activeCols = env.getters.getActiveCols();
      let column = 0;
      let quantity = 0;
      if (activeCols.size) {
        column = Math.max(...activeCols);
        quantity = activeCols.size;
      } else {
        const zone = env.getters.getSelectedZones()[0];
        column = zone.right;
        quantity = zone.right - zone.left + 1;
      }
      env.dispatch("ADD_COLUMNS", {
        sheet: env.getters.getActiveSheet(),
        position: "after",
        column,
        quantity,
      });
    },
    separator: true,
  })
  .addChild("insert_sheet", ["insert"], {
    name: "New sheet",
    sequence: 60,
    action: (env: SpreadsheetEnv) => {
      env.dispatch("CREATE_SHEET", { activate: true });
    },
    separator: true,
  })
  .addChild("format_number", ["format"], {
    name: "Numbers",
    sequence: 10,
    separator: true,
  })
  .addChild("format_number_auto", ["format", "format_number"], {
    name: "Automatic",
    sequence: 10,
    separator: true,
    action: (env: SpreadsheetEnv) => setFormatter(env, ""),
  })
  .addChild("format_number_number", ["format", "format_number"], {
    name: "Number (1,000.12)",
    sequence: 20,
    action: (env: SpreadsheetEnv) => setFormatter(env, "#,##0.00"),
  })
  .addChild("format_number_percent", ["format", "format_number"], {
    name: "Percent (10.12%)",
    sequence: 30,
    separator: true,
    action: (env: SpreadsheetEnv) => setFormatter(env, "0.00%"),
  })
  .addChild("format_number_date", ["format", "format_number"], {
    name: "Date (9/26/2008)",
    sequence: 40,
    separator: true,
    action: (env: SpreadsheetEnv) => setFormatter(env, "m/d/yyyy"),
  })
  .addChild("format_bold", ["format"], {
    name: "Bold",
    sequence: 20,
    action: (env: SpreadsheetEnv) => setStyle(env, { bold: !env.getters.getCurrentStyle().bold }),
  })
  .addChild("format_italic", ["format"], {
    name: "Italic",
    sequence: 30,
    action: (env: SpreadsheetEnv) =>
      setStyle(env, { italic: !env.getters.getCurrentStyle().italic }),
  })
  .addChild("format_underline", ["format"], {
    // Underline is not yet implemented
    name: "Underline",
    sequence: 40,
  })
  .addChild("format_strikethrough", ["format"], {
    name: "Strikethrough",
    sequence: 50,
    action: (env: SpreadsheetEnv) =>
      setStyle(env, { strikethrough: !env.getters.getCurrentStyle().strikethrough }),
    separator: true,
  })
  .addChild("format_font_size", ["format"], {
    name: "Font-size",
    sequence: 50,
    separator: true,
  });

// Font-sizes
for (let fs of fontSizes) {
  menuItemRegistry.addChild(`format_font_size_${fs.pt}`, ["format", "format_font_size"], {
    name: fs.pt.toString(),
    sequence: fs.pt,
    action: (env: SpreadsheetEnv) => setStyle(env, { fontSize: fs.pt }),
  });
}
