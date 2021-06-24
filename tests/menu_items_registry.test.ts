import { Model } from "../src";
import { fontSizes } from "../src/fonts";
import { toZone } from "../src/helpers";
import {
  colMenuRegistry,
  FullMenuItem,
  MenuItemRegistry,
  rowMenuRegistry,
  topbarMenuRegistry,
} from "../src/registries/index";
import { CommandResult, SpreadsheetEnv } from "../src/types";
import { hideColumns, hideRows, selectCell } from "./test_helpers/commands_helpers";
import { GridParent, makeTestFixture, mockUuidV4To, nextTick } from "./test_helpers/helpers";
jest.mock("../src/helpers/uuid", () => require("./__mocks__/uuid"));

function getNode(
  _path: string[],
  menuRegistry: MenuItemRegistry = topbarMenuRegistry
): FullMenuItem {
  const path = [..._path];
  const root = path.splice(0, 1)[0];
  let node = menuRegistry.get(root);
  for (let p of path) {
    if (typeof node.children !== "function") {
      node = node.children.find((child) => child.id === p)!;
    }
  }
  return node;
}

function doAction(
  path: string[],
  env: SpreadsheetEnv,
  menuRegistry: MenuItemRegistry = topbarMenuRegistry
): void {
  const node = getNode(path, menuRegistry);
  node.action(env);
}

function getName(
  path: string[],
  env: SpreadsheetEnv,
  menuRegistry: MenuItemRegistry = topbarMenuRegistry
): string {
  const node = getNode(path, menuRegistry);
  return typeof node.name === "function" ? node.name(env).toString() : node.name.toString();
}

describe("Menu Item Registry", () => {
  let menuDefinitions;
  beforeEach(() => {
    menuDefinitions = Object.assign({}, topbarMenuRegistry.content);
  });

  afterEach(() => {
    topbarMenuRegistry.content = menuDefinitions;
  });
  test("Can add children to menu Items", () => {
    topbarMenuRegistry.add("root", { name: "Root", sequence: 1 });
    topbarMenuRegistry.addChild("child1", ["root"], { name: "Child1", sequence: 1 });
    topbarMenuRegistry.addChild("child2", ["root", "child1"], {
      name: "Child2",
      sequence: 1,
      shortCut: "coucou",
    });
    const item = topbarMenuRegistry.get("root");
    expect(item.children).toHaveLength(1);
    expect(item.children[0].name).toBe("Child1");
    expect(item.children[0].id).toBe("child1");
    expect(item.children[0].children).toHaveLength(1);
    expect(item.children[0].children[0].name).toBe("Child2");
    expect(item.children[0].children[0].shortCut).toBe("coucou");
    expect(item.children[0].children[0].id).toBe("child2");
  });

  test("Adding a child to non-existing item throws", () => {
    expect(() =>
      topbarMenuRegistry.addChild("child", ["non-existing"], { name: "child", sequence: 1 })
    ).toThrow();
    topbarMenuRegistry.add("root", { name: "Root", sequence: 1 });
    expect(() =>
      topbarMenuRegistry.addChild("child1", ["root", "non-existing"], {
        name: "Child1",
        sequence: 1,
      })
    ).toThrow();
  });
});

describe("Menu Item actions", () => {
  let fixture: HTMLElement;
  let model: Model;
  let parent: GridParent;
  let env: SpreadsheetEnv;

  beforeEach(async () => {
    fixture = makeTestFixture();
    model = new Model();
    parent = new GridParent(model);
    env = parent.env;
    await parent.mount(fixture);
    env.dispatch = jest.fn(() => CommandResult.Success as CommandResult);
  });

  test("Edit -> undo", () => {
    doAction(["edit", "undo"], env);
    expect(env.dispatch).toHaveBeenCalledWith("REQUEST_UNDO");
  });

  test("Edit -> redo", () => {
    doAction(["edit", "redo"], env);
    expect(env.dispatch).toHaveBeenCalledWith("REQUEST_REDO");
  });

  test("Edit -> copy", () => {
    env.clipboard.writeText = jest.fn(() => Promise.resolve());
    doAction(["edit", "copy"], env);
    expect(env.dispatch).toHaveBeenCalledWith("COPY", {
      target: env.getters.getSelectedZones(),
    });
    expect(env.clipboard.writeText).toHaveBeenCalledWith(env.getters.getClipboardContent());
  });

  test("Edit -> cut", () => {
    env.clipboard.writeText = jest.fn(() => Promise.resolve());
    doAction(["edit", "cut"], env);
    expect(env.dispatch).toHaveBeenCalledWith("CUT", {
      target: env.getters.getSelectedZones(),
    });
    expect(env.clipboard.writeText).toHaveBeenCalledWith(env.getters.getClipboardContent());
  });

  test("Edit -> paste from OS clipboard if copied from outside world last", async () => {
    doAction(["edit", "copy"], env); // first copy from grid
    await env.clipboard.writeText("Then copy in OS clipboard");
    doAction(["edit", "paste"], env);
    await nextTick();
    expect(env.dispatch).toHaveBeenCalledWith("PASTE_FROM_OS_CLIPBOARD", {
      text: await env.clipboard.readText(),
      target: [{ bottom: 0, left: 0, right: 0, top: 0 }],
    });
  });

  test("Edit -> paste if copied from grid last", async () => {
    await env.clipboard.writeText("First copy in OS clipboard");
    doAction(["edit", "copy"], env); // then copy from grid
    doAction(["edit", "paste"], env);
    await nextTick();
    expect(env.dispatch).toHaveBeenCalledWith("PASTE", {
      interactive: true,
      target: [{ bottom: 0, left: 0, right: 0, top: 0 }],
    });
  });

  test("Edit -> paste_special -> paste_special_value", () => {
    doAction(["edit", "paste_special", "paste_special_value"], env);
    expect(env.dispatch).toHaveBeenCalledWith("PASTE", {
      target: env.getters.getSelectedZones(),
      pasteOption: "onlyValue",
    });
  });

  test("Edit -> paste_special -> paste_special_format", () => {
    doAction(["edit", "paste_special", "paste_special_format"], env);
    expect(env.dispatch).toHaveBeenCalledWith("PASTE", {
      target: env.getters.getSelectedZones(),
      pasteOption: "onlyFormat",
    });
  });

  test("Edit -> edit_delete_cell_values", () => {
    doAction(["edit", "edit_delete_cell_values"], env);
    expect(env.dispatch).toHaveBeenCalledWith("DELETE_CONTENT", {
      sheetId: env.getters.getActiveSheetId(),
      target: env.getters.getSelectedZones(),
    });
  });

  describe("Edit -> edit_delete_row", () => {
    const path = ["edit", "edit_delete_row"];

    test("A selected row", () => {
      model.dispatch("SELECT_ROW", { index: 4, createRange: true });
      expect(getName(path, env)).toBe("Delete row 5");
    });

    test("Multiple selected rows", () => {
      model.dispatch("SELECT_ROW", { index: 4, createRange: true });
      model.dispatch("SELECT_ROW", { index: 5, updateRange: true });
      expect(getName(path, env)).toBe("Delete rows 5 - 6");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        dimension: "ROW",
        elements: [4, 5],
      });
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(path, env)).toBe("Delete row 4");
    });

    test("Multiple selected cells", () => {
      selectCell(model, "D4");
      model.dispatch("ALTER_SELECTION", { cell: [4, 4] });
      expect(getName(path, env)).toBe("Delete rows 4 - 5");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        dimension: "ROW",
        elements: [3, 4],
      });
    });
  });

  describe("Edit -> edit_delete_column", () => {
    const path = ["edit", "edit_delete_column"];

    test("A selected column", () => {
      model.dispatch("SELECT_COLUMN", { index: 4, createRange: true });
      expect(getName(path, env)).toBe("Delete column E");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        dimension: "COL",
        elements: [4],
      });
    });

    test("Multiple selected columns", () => {
      model.dispatch("SELECT_COLUMN", { index: 4, createRange: true });
      model.dispatch("SELECT_COLUMN", { index: 5, updateRange: true });
      expect(getName(path, env)).toBe("Delete columns E - F");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        dimension: "COL",
        elements: [4, 5],
      });
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(path, env)).toBe("Delete column D");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        dimension: "COL",
        elements: [3],
      });
    });

    test("Multiple selected cells", () => {
      selectCell(model, "D4");
      model.dispatch("ALTER_SELECTION", { cell: [4, 4] });
      expect(getName(path, env)).toBe("Delete columns D - E");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        dimension: "COL",
        elements: [3, 4],
      });
    });
  });

  describe("Insert -> Row above", () => {
    const path = ["insert", "insert_row_before"];

    test("A selected row", () => {
      model.dispatch("SELECT_ROW", { index: 4, createRange: true });
      expect(getName(path, env)).toBe("Row above");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected rows", () => {
      model.dispatch("SELECT_ROW", { index: 4, createRange: true });
      model.dispatch("SELECT_ROW", { index: 5, updateRange: true });
      expect(getName(path, env)).toBe("2 Rows above");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        dimension: "ROW",
        base: 4,
        quantity: 2,
        position: "before",
      });
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("A selected column should hide the item", () => {
      model.dispatch("SELECT_COLUMN", { index: 4, createRange: true });
      expect(getNode(path).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(path, env)).toBe("Row above");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", () => {
      selectCell(model, "D4");
      model.dispatch("ALTER_SELECTION", { cell: [4, 4] });
      expect(getName(path, env)).toBe("2 Rows above");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        dimension: "ROW",
        base: 3,
        quantity: 2,
        position: "before",
      });
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });
  });

  describe("Insert -> Row below", () => {
    const path = ["insert", "insert_row_after"];

    test("A selected row", () => {
      model.dispatch("SELECT_ROW", { index: 4, createRange: true });
      expect(getName(path, env)).toBe("Row below");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected rows", () => {
      model.dispatch("SELECT_ROW", { index: 4, createRange: true });
      model.dispatch("SELECT_ROW", { index: 5, updateRange: true });
      expect(getName(path, env)).toBe("2 Rows below");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        dimension: "ROW",
        base: 5,
        quantity: 2,
        position: "after",
      });
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("A selected column should hide the item", () => {
      model.dispatch("SELECT_COLUMN", { index: 4, createRange: true });
      expect(getNode(path).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(path, env)).toBe("Row below");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", () => {
      selectCell(model, "D4");
      model.dispatch("ALTER_SELECTION", { cell: [4, 4] });
      expect(getName(path, env)).toBe("2 Rows below");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        dimension: "ROW",
        base: 4,
        quantity: 2,
        position: "after",
      });
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });
  });

  describe("Insert -> Column left", () => {
    const path = ["insert", "insert_column_before"];

    test("A selected column", () => {
      model.dispatch("SELECT_COLUMN", { index: 4, createRange: true });
      expect(getName(path, env)).toBe("Column left");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected columns", () => {
      model.dispatch("SELECT_COLUMN", { index: 4, createRange: true });
      model.dispatch("SELECT_COLUMN", { index: 5, updateRange: true });
      expect(getName(path, env)).toBe("2 Columns left");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        base: 4,
        dimension: "COL",
        quantity: 2,
        position: "before",
      });
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("A selected row should hide the item", () => {
      model.dispatch("SELECT_ROW", { index: 4, createRange: true });
      expect(getNode(path).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(path, env)).toBe("Column left");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", () => {
      selectCell(model, "D4");
      model.dispatch("ALTER_SELECTION", { cell: [4, 4] });
      expect(getName(path, env)).toBe("2 Columns left");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        base: 3,
        dimension: "COL",
        quantity: 2,
        position: "before",
      });
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });
  });

  describe("Insert -> Column right", () => {
    const path = ["insert", "insert_column_after"];

    test("A selected column", () => {
      model.dispatch("SELECT_COLUMN", { index: 4, createRange: true });
      expect(getName(path, env)).toBe("Column right");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected columns", () => {
      model.dispatch("SELECT_COLUMN", { index: 4, createRange: true });
      model.dispatch("SELECT_COLUMN", { index: 5, updateRange: true });
      expect(getName(path, env)).toBe("2 Columns right");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        base: 5,
        dimension: "COL",
        quantity: 2,
        position: "after",
      });
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("A selected row should hide the item", () => {
      model.dispatch("SELECT_ROW", { index: 4, createRange: true });
      expect(getNode(path).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(path, env)).toBe("Column right");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", () => {
      selectCell(model, "D4");
      model.dispatch("ALTER_SELECTION", { cell: [4, 4] });
      expect(getName(path, env)).toBe("2 Columns right");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        base: 4,
        dimension: "COL",
        quantity: 2,
        position: "after",
      });
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });
  });

  test("Insert -> new sheet", () => {
    mockUuidV4To(model, 42);
    doAction(["insert", "insert_sheet"], env);
    const activeSheetId = env.getters.getActiveSheetId();
    expect(env.dispatch).toHaveBeenNthCalledWith(1, "CREATE_SHEET", {
      sheetId: "42",
      position: 1,
    });
    expect(env.dispatch).toHaveBeenNthCalledWith(2, "ACTIVATE_SHEET", {
      sheetIdTo: "42",
      sheetIdFrom: activeSheetId,
    });
  });

  describe("Format -> numbers", () => {
    test("General", () => {
      doAction(["format", "format_number", "format_number_general"], env);
      expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.getters.getActiveSheetId(),
        target: env.getters.getSelectedZones(),
        format: "",
      });
    });

    test("Number", () => {
      doAction(["format", "format_number", "format_number_number"], env);
      expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.getters.getActiveSheetId(),
        target: env.getters.getSelectedZones(),
        format: "#,##0.00",
      });
    });

    test("Percent", () => {
      doAction(["format", "format_number", "format_number_percent"], env);
      expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.getters.getActiveSheetId(),
        target: env.getters.getSelectedZones(),
        format: "0.00%",
      });
    });

    test("Date", () => {
      doAction(["format", "format_number", "format_number_date"], env);
      expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.getters.getActiveSheetId(),
        target: env.getters.getSelectedZones(),
        format: "m/d/yyyy",
      });
    });

    test("Time", () => {
      doAction(["format", "format_number", "format_number_time"], env);
      expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.getters.getActiveSheetId(),
        target: env.getters.getSelectedZones(),
        format: "hh:mm:ss a",
      });
    });

    test("Date time", () => {
      doAction(["format", "format_number", "format_number_date_time"], env);
      expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.getters.getActiveSheetId(),
        target: env.getters.getSelectedZones(),
        format: "m/d/yyyy hh:mm:ss",
      });
    });

    test("Duration", () => {
      doAction(["format", "format_number", "format_number_duration"], env);
      expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.getters.getActiveSheetId(),
        target: env.getters.getSelectedZones(),
        format: "hhhh:mm:ss",
      });
    });
  });

  test("Format -> bold", () => {
    doAction(["format", "format_bold"], env);
    expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.getters.getActiveSheetId(),
      target: env.getters.getSelectedZones(),
      style: { bold: true },
    });
  });

  test("Format -> italic", () => {
    doAction(["format", "format_italic"], env);
    expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.getters.getActiveSheetId(),
      target: env.getters.getSelectedZones(),
      style: { italic: true },
    });
  });

  test("Format -> strikethrough", () => {
    doAction(["format", "format_strikethrough"], env);
    expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.getters.getActiveSheetId(),
      target: env.getters.getSelectedZones(),
      style: { strikethrough: true },
    });
  });

  test("Format -> font-size", () => {
    const fontSize = fontSizes[0];
    doAction(["format", "format_font_size", `format_font_size_${fontSize.pt}`], env);
    expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.getters.getActiveSheetId(),
      target: env.getters.getSelectedZones(),
      style: { fontSize: fontSize.pt },
    });
  });

  test("Edit -> Sort ascending", () => {
    doAction(["edit", "sort_range", "sort_ascending"], env);
    const { anchor, zones } = env.getters.getSelection();
    expect(env.dispatch).toHaveBeenCalledWith("SORT_CELLS", {
      sheetId: env.getters.getActiveSheetId(),
      anchor: anchor,
      zone: zones[0],
      sortDirection: "ascending",
      interactive: true,
    });
  });

  test("Edit -> Sort descending", () => {
    doAction(["edit", "sort_range", "sort_descending"], env);
    const { anchor, zones } = env.getters.getSelection();
    expect(env.dispatch).toHaveBeenCalledWith("SORT_CELLS", {
      sheetId: env.getters.getActiveSheetId(),
      anchor: anchor,
      zone: zones[0],
      sortDirection: "descending",
      interactive: true,
    });
  });

  describe("Edit -> Sort", () => {
    const pathSort = ["edit", "sort_range"];

    test("A selected zone", () => {
      model.dispatch("SET_SELECTION", { anchor: [0, 0], zones: [toZone("A1:A2")] });
      expect(getName(pathSort, env)).toBe("Sort range");
      expect(getNode(pathSort).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected zones", () => {
      model.dispatch("SET_SELECTION", {
        anchor: [0, 0],
        zones: [toZone("A1:A2"), toZone("B1:B2")],
      });
      expect(getNode(pathSort).isVisible(env)).toBeFalsy();
    });
  });
  describe("Hide/Unhide Columns", () => {
    const hidePath = ["hide_columns"];
    const unhidePath = ["unhide_columns"];
    test("Action on single column selection", () => {
      model.dispatch("SELECT_COLUMN", { index: 1 });
      expect(getName(hidePath, env, colMenuRegistry)).toBe("Hide column B");
      expect(getNode(hidePath, colMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(hidePath, env, colMenuRegistry);
      expect(env.dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        elements: [1],
        dimension: "COL",
      });
    });
    test("Action with at least one active column", () => {
      model.dispatch("SET_SELECTION", {
        anchor: [1, 0],
        zones: [toZone("B1:B100"), toZone("C5")],
      });
      expect(getName(hidePath, env, colMenuRegistry)).toBe("Hide columns B - C");
      expect(getNode(hidePath, colMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(hidePath, env, colMenuRegistry);
      expect(env.dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        elements: [1, 2],
        dimension: "COL",
      });
    });
    test("Action without any active column", () => {
      model.dispatch("SET_SELECTION", {
        anchor: [1, 0],
        zones: [toZone("B1")],
      });
      expect(getName(hidePath, env, colMenuRegistry)).toBe("Hide columns");
      expect(getNode(hidePath, colMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(hidePath, env, colMenuRegistry);
      expect(env.dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        elements: [],
        dimension: "COL",
      });
    });

    test("Inactive menu item on invalid selection", () => {
      model.dispatch("SET_SELECTION", {
        anchor: [0, 0],
        zones: [toZone("A1:A100"), toZone("A4:Z4")],
      });
      expect(getNode(hidePath, colMenuRegistry).isVisible(env)).toBeFalsy();
    });

    test("Unhide cols from Col menu", () => {
      hideColumns(model, ["C"]);
      model.dispatch("SET_SELECTION", {
        anchor: [0, 0],
        zones: [toZone("B1:E100")],
      });
      expect(getNode(unhidePath, colMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(unhidePath, env, colMenuRegistry);
      expect(env.dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        elements: [1, 2, 3, 4],
        dimension: "COL",
      });
    });
    test("Unhide rows from Col menu without hidden cols", () => {
      model.dispatch("SET_SELECTION", {
        anchor: [0, 0],
        zones: [toZone("B1:E100")],
      });
      expect(getNode(unhidePath, colMenuRegistry).isVisible(env)).toBeFalsy();
    });
    test("Unhide all cols from top menu", () => {
      // no hidden rows
      expect(getNode(["edit", "edit_unhide_columns"]).isVisible(env)).toBeFalsy();
      hideColumns(model, ["C"]);
      expect(getNode(["edit", "edit_unhide_columns"]).isVisible(env)).toBeTruthy();
      doAction(["edit", "edit_unhide_columns"], env);
      const sheet = env.getters.getActiveSheet();
      expect(env.dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
        sheetId: sheet.id,
        dimension: "COL",
        elements: Array.from(Array(sheet.cols.length).keys()),
      });
    });
  });
  describe("Hide/Unhide Rows", () => {
    const hidePath = ["hide_rows"];
    const unhidePath = ["unhide_rows"];
    test("Action on single row selection", () => {
      model.dispatch("SELECT_ROW", { index: 1 });
      expect(getName(hidePath, env, rowMenuRegistry)).toBe("Hide row 2");
      expect(getNode(hidePath, rowMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(hidePath, env, rowMenuRegistry);
      expect(env.dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        elements: [1],
        dimension: "ROW",
      });
    });
    test("Action with at least one active row", () => {
      model.dispatch("SET_SELECTION", {
        anchor: [0, 1],
        zones: [toZone("A2:Z2"), toZone("C3")],
      });
      expect(getName(hidePath, env, rowMenuRegistry)).toBe("Hide rows 2 - 3");
      expect(getNode(hidePath, rowMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(hidePath, env, rowMenuRegistry);
      expect(env.dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        elements: [1, 2],
        dimension: "ROW",
      });
    });
    test("Action without any active column", () => {
      model.dispatch("SET_SELECTION", {
        anchor: [1, 0],
        zones: [toZone("B1")],
      });
      expect(getName(hidePath, env, rowMenuRegistry)).toBe("Hide rows");
      expect(getNode(hidePath, rowMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(hidePath, env, rowMenuRegistry);
      expect(env.dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        elements: [],
        dimension: "ROW",
      });
    });

    test("Inactive menu item on invalid selection", () => {
      model.dispatch("SET_SELECTION", {
        anchor: [0, 0],
        zones: [toZone("A1:A100"), toZone("A4:Z4")],
      });
      expect(getNode(hidePath, rowMenuRegistry).isVisible(env)).toBeFalsy();
    });

    test("Unhide rows from Row menu with hidden rows", () => {
      hideRows(model, [2]);
      model.dispatch("SET_SELECTION", {
        anchor: [0, 0],
        zones: [toZone("A1:Z4")],
      });
      expect(getNode(unhidePath, rowMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(unhidePath, env, rowMenuRegistry);
      expect(env.dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        elements: [0, 1, 2, 3],
        dimension: "ROW",
      });
    });
    test("Unhide rows from Row menu without hidden rows", () => {
      model.dispatch("SET_SELECTION", {
        anchor: [0, 0],
        zones: [toZone("A1:Z4")],
      });
      expect(getNode(unhidePath, rowMenuRegistry).isVisible(env)).toBeFalsy();
    });

    test("Unhide all rows from top menu", () => {
      // no hidden rows
      expect(getNode(["edit", "edit_unhide_rows"]).isVisible(env)).toBeFalsy();
      hideRows(model, [2]);
      expect(getNode(["edit", "edit_unhide_rows"]).isVisible(env)).toBeTruthy();
      doAction(["edit", "edit_unhide_rows"], env);
      const sheet = env.getters.getActiveSheet();
      expect(env.dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
        sheetId: sheet.id,
        elements: Array.from(Array(sheet.rows.length).keys()),
        dimension: "ROW",
      });
    });
  });

  test("View -> Set gridlines visibility", () => {
    const path_gridlines = ["view", "view_gridlines"];
    const sheetId = model.getters.getActiveSheetId();

    model.dispatch("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: true,
    });

    expect(getName(path_gridlines, env)).toBe("Hide gridlines");
    expect(getNode(path_gridlines).isVisible(env)).toBeTruthy();

    model.dispatch("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: false,
    });
    expect(getName(path_gridlines, env)).toBe("Show gridlines");
    expect(getNode(path_gridlines).isVisible(env)).toBeTruthy();

    doAction(path_gridlines, env);
    expect(env.dispatch).toHaveBeenCalledWith("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: true,
    });
    model.dispatch("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: true,
    });

    doAction(path_gridlines, env);
    expect(env.dispatch).toHaveBeenCalledWith("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: false,
    });
  });
});
