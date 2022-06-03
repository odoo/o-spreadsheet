import { App } from "@odoo/owl";
import { Model, Spreadsheet } from "../src";
import { fontSizes } from "../src/fonts";
import { interactivePaste } from "../src/helpers/ui/paste";
import {
  colMenuRegistry,
  FullMenuItem,
  MenuItemRegistry,
  rowMenuRegistry,
  topbarMenuRegistry,
} from "../src/registries/index";
import { SpreadsheetChildEnv } from "../src/types";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "./../src/constants";
import {
  hideColumns,
  hideRows,
  selectCell,
  selectColumn,
  selectRow,
  setAnchorCorner,
  setSelection,
} from "./test_helpers/commands_helpers";
import { getCellContent } from "./test_helpers/getters_helpers";
import {
  makeTestFixture,
  mockChart,
  MockClipboard,
  mockUuidV4To,
  mountSpreadsheet,
  nextTick,
  spyDispatch,
  target,
} from "./test_helpers/helpers";
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
  env: SpreadsheetChildEnv,
  menuRegistry: MenuItemRegistry = topbarMenuRegistry
): void {
  const node = getNode(path, menuRegistry);
  node.action(env);
}

function getName(
  path: string[],
  env: SpreadsheetChildEnv,
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
      description: "coucou",
    });
    const item = topbarMenuRegistry.get("root");
    expect(item.children).toHaveLength(1);
    expect(item.children[0].name).toBe("Child1");
    expect(item.children[0].id).toBe("child1");
    expect(item.children[0].children).toHaveLength(1);
    expect(item.children[0].children[0].name).toBe("Child2");
    expect(item.children[0].children[0].description).toBe("coucou");
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
  let parent: Spreadsheet;
  let app: App;
  let env: SpreadsheetChildEnv;
  let dispatch;

  beforeEach(async () => {
    const clipboard = new MockClipboard();
    Object.defineProperty(navigator, "clipboard", {
      get() {
        return clipboard;
      },
      configurable: true,
    });
    fixture = makeTestFixture();
    ({ app, parent } = await mountSpreadsheet(fixture));
    model = parent.model;
    env = parent.env;
    dispatch = spyDispatch(parent);
  });

  afterEach(() => {
    app.destroy();
  });

  test("Edit -> undo", () => {
    doAction(["edit", "undo"], env);
    expect(dispatch).toHaveBeenCalledWith("REQUEST_UNDO");
  });

  test("Edit -> redo", () => {
    doAction(["edit", "redo"], env);
    expect(dispatch).toHaveBeenCalledWith("REQUEST_REDO");
  });

  test("Edit -> copy", () => {
    const clipboard = new MockClipboard();
    //@ts-ignore
    jest.spyOn(navigator, "clipboard", "get").mockImplementation(() => clipboard);
    env.clipboard.writeText = jest.fn(() => Promise.resolve());
    doAction(["edit", "copy"], env);
    expect(dispatch).toHaveBeenCalledWith("COPY", {
      target: env.model.getters.getSelectedZones(),
    });
    expect(env.clipboard.writeText).toHaveBeenCalledWith(env.model.getters.getClipboardContent());
  });

  test("Edit -> cut", () => {
    env.clipboard.writeText = jest.fn(() => Promise.resolve());
    doAction(["edit", "cut"], env);
    expect(dispatch).toHaveBeenCalledWith("CUT", {
      target: env.model.getters.getSelectedZones(),
    });
    expect(env.clipboard.writeText).toHaveBeenCalledWith(env.model.getters.getClipboardContent());
  });

  test("Edit -> paste from OS clipboard if copied from outside world last", async () => {
    doAction(["edit", "copy"], env); // first copy from grid
    await env.clipboard.writeText("Then copy in OS clipboard");
    doAction(["edit", "paste"], env);
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("PASTE_FROM_OS_CLIPBOARD", {
      text: await env.clipboard.readText(),
      target: [{ bottom: 0, left: 0, right: 0, top: 0 }],
    });
  });

  test("Edit -> paste if copied from grid last", async () => {
    await env.clipboard.writeText("First copy in OS clipboard");
    doAction(["edit", "copy"], env); // then copy from grid
    doAction(["edit", "paste"], env);
    await nextTick();
    interactivePaste(env, target("A1"));
    expect(getCellContent(model, "A1")).toEqual("");
  });

  test("Edit -> paste_special should be hidden after a CUT ", () => {
    model.dispatch("CUT", { target: env.model.getters.getSelectedZones() });
    expect(getNode(["edit", "paste_special"]).isVisible(env)).toBeFalsy();
  });

  test("Edit -> paste_special should not be hidden after a COPY ", () => {
    model.dispatch("COPY", { target: env.model.getters.getSelectedZones() });
    expect(getNode(["edit", "paste_special"]).isVisible(env)).toBeTruthy();
  });

  test("Edit -> paste_special -> paste_special_value", () => {
    doAction(["edit", "paste_special", "paste_special_value"], env);
    expect(dispatch).toHaveBeenCalledWith("PASTE", {
      target: env.model.getters.getSelectedZones(),
      pasteOption: "onlyValue",
    });
  });

  test("Edit -> paste_special -> paste_special_format", () => {
    doAction(["edit", "paste_special", "paste_special_format"], env);
    expect(dispatch).toHaveBeenCalledWith("PASTE", {
      target: env.model.getters.getSelectedZones(),
      pasteOption: "onlyFormat",
    });
  });

  test("Edit -> edit_delete_cell_values", () => {
    doAction(["edit", "edit_delete_cell_values"], env);
    expect(dispatch).toHaveBeenCalledWith("DELETE_CONTENT", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
    });
  });

  describe("Edit -> edit_delete_row", () => {
    const path = ["edit", "edit_delete_row"];

    test("A selected row", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getName(path, env)).toBe("Delete row 5");
    });

    test("Multiple selected rows", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getName(path, env)).toBe("Delete rows 5 - 6");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        dimension: "ROW",
        elements: [4, 5],
      });
    });

    test("Multiple zones of selected rows", () => {
      selectRow(model, 4, "newAnchor");
      selectRow(model, 5, "updateAnchor");
      expect(getName(path, env)).toBe("Delete rows");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
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
      setAnchorCorner(model, "E5");
      expect(getName(path, env)).toBe("Delete rows 4 - 5");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        dimension: "ROW",
        elements: [3, 4],
      });
    });
  });

  describe("Edit -> edit_delete_column", () => {
    const path = ["edit", "edit_delete_column"];

    test("A selected column", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getName(path, env)).toBe("Delete column E");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        dimension: "COL",
        elements: [4],
      });
    });

    test("Multiple selected columns", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(path, env)).toBe("Delete columns E - F");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        dimension: "COL",
        elements: [4, 5],
      });
    });

    test("Multiple zones of selected columns", () => {
      selectColumn(model, 4, "newAnchor");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(path, env)).toBe("Delete columns");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        dimension: "COL",
        elements: [4, 5],
      });
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(path, env)).toBe("Delete column D");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        dimension: "COL",
        elements: [3],
      });
    });

    test("Multiple selected cells", () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(path, env)).toBe("Delete columns D - E");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        dimension: "COL",
        elements: [3, 4],
      });
    });
  });

  describe("Insert -> Row above", () => {
    const path = ["insert", "insert_row_before"];

    test("A selected row", () => {
      selectRow(model, 4, "newAnchor");
      expect(getName(path, env)).toBe("Row above");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected rows", () => {
      selectRow(model, 4, "newAnchor");
      selectRow(model, 5, "updateAnchor");
      expect(getName(path, env)).toBe("2 Rows above");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        dimension: "ROW",
        base: 4,
        quantity: 2,
        position: "before",
      });
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("A selected column should hide the item", () => {
      selectColumn(model, 4, "newAnchor");
      expect(getNode(path).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(path, env)).toBe("Row above");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(path, env)).toBe("2 Rows above");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
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
      selectRow(model, 4, "newAnchor");
      expect(getName(path, env)).toBe("Row below");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected rows", () => {
      selectRow(model, 4, "newAnchor");
      selectRow(model, 5, "updateAnchor");
      expect(getName(path, env)).toBe("2 Rows below");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        dimension: "ROW",
        base: 5,
        quantity: 2,
        position: "after",
      });
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("A selected column should hide the item", () => {
      selectColumn(model, 4, "newAnchor");
      expect(getNode(path).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(path, env)).toBe("Row below");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(path, env)).toBe("2 Rows below");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
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
      selectColumn(model, 4, "newAnchor");
      expect(getName(path, env)).toBe("Column left");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected columns", () => {
      selectColumn(model, 4, "newAnchor");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(path, env)).toBe("2 Columns left");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        base: 4,
        dimension: "COL",
        quantity: 2,
        position: "before",
      });
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("A selected row should hide the item", () => {
      selectRow(model, 4, "newAnchor");
      expect(getNode(path).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(path, env)).toBe("Column left");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(path, env)).toBe("2 Columns left");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
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
      selectColumn(model, 4, "newAnchor");
      expect(getName(path, env)).toBe("Column right");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected columns", () => {
      selectColumn(model, 4, "newAnchor");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(path, env)).toBe("2 Columns right");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        base: 5,
        dimension: "COL",
        quantity: 2,
        position: "after",
      });
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("A selected row should hide the item", () => {
      selectRow(model, 4, "newAnchor");
      expect(getNode(path).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(path, env)).toBe("Column right");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(path, env)).toBe("2 Columns right");
      doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
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
    dispatch = spyDispatch(parent);
    const activeSheetId = env.model.getters.getActiveSheetId();
    doAction(["insert", "insert_sheet"], env);
    expect(dispatch).toHaveBeenNthCalledWith(1, "CREATE_SHEET", {
      sheetId: "42",
      position: 1,
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, "ACTIVATE_SHEET", {
      sheetIdTo: "42",
      sheetIdFrom: activeSheetId,
    });
  });

  describe("Format -> numbers", () => {
    test("General", () => {
      doAction(["format", "format_number", "format_number_general"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: "",
      });
    });

    test("Number", () => {
      doAction(["format", "format_number", "format_number_number"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: "#,##0.00",
      });
    });

    test("Percent", () => {
      doAction(["format", "format_number", "format_number_percent"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: "0.00%",
      });
    });

    test("Currency", () => {
      doAction(["format", "format_number", "format_number_currency"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: "[$$]#,##0.00",
      });
    });

    test("Currency rounded", () => {
      doAction(["format", "format_number", "format_number_currency_rounded"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: "[$$]#,##0",
      });
    });

    test("Date", () => {
      doAction(["format", "format_number", "format_number_date"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: "m/d/yyyy",
      });
    });

    test("Time", () => {
      doAction(["format", "format_number", "format_number_time"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: "hh:mm:ss a",
      });
    });

    test("Date time", () => {
      doAction(["format", "format_number", "format_number_date_time"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: "m/d/yyyy hh:mm:ss",
      });
    });

    test("Duration", () => {
      doAction(["format", "format_number", "format_number_duration"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: "hhhh:mm:ss",
      });
    });

    test("Custom currency", async () => {
      doAction(["format", "format_number", "format_custom_currency"], env);
      await nextTick();
      expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
      expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe(
        "Custom currency format"
      );
    });
  });

  test("Format -> bold", () => {
    doAction(["format", "format_bold"], env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      style: { bold: true },
    });
  });

  test("Format -> italic", () => {
    doAction(["format", "format_italic"], env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      style: { italic: true },
    });
  });

  test("Format -> underline", () => {
    doAction(["format", "format_underline"], env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      style: { underline: true },
    });
  });

  test("Format -> strikethrough", () => {
    doAction(["format", "format_strikethrough"], env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      style: { strikethrough: true },
    });
  });

  test("Format -> font-size", () => {
    const fontSize = fontSizes[0];
    doAction(["format", "format_font_size", `format_font_size_${fontSize.pt}`], env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      style: { fontSize: fontSize.pt },
    });
  });

  test("Edit -> Sort ascending", () => {
    doAction(["edit", "sort_range", "sort_ascending"], env);
    const { anchor, zones } = env.model.getters.getSelection();
    expect(dispatch).toHaveBeenCalledWith("SORT_CELLS", {
      sheetId: env.model.getters.getActiveSheetId(),
      ...anchor.cell,
      zone: zones[0],
      sortDirection: "ascending",
    });
  });

  test("Edit -> Sort descending", () => {
    doAction(["edit", "sort_range", "sort_descending"], env);
    const { anchor, zones } = env.model.getters.getSelection();
    expect(dispatch).toHaveBeenCalledWith("SORT_CELLS", {
      sheetId: env.model.getters.getActiveSheetId(),
      ...anchor.cell,
      zone: zones[0],
      sortDirection: "descending",
    });
  });

  describe("Edit -> Sort", () => {
    const pathSort = ["edit", "sort_range"];

    test("A selected zone", () => {
      setSelection(model, ["A1:A2"]);
      expect(getName(pathSort, env)).toBe("Sort range");
      expect(getNode(pathSort).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected zones", () => {
      setSelection(model, ["A1:A2", "B1:B2"]);
      expect(getNode(pathSort).isVisible(env)).toBeFalsy();
    });
  });
  describe("Hide/Unhide Columns", () => {
    const hidePath = ["hide_columns"];
    const unhidePath = ["unhide_columns"];
    test("Action on single column selection", () => {
      selectColumn(model, 1, "overrideSelection");
      expect(getName(hidePath, env, colMenuRegistry)).toBe("Hide column B");
      expect(getNode(hidePath, colMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(hidePath, env, colMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [1],
        dimension: "COL",
      });
    });
    test("Action with at least one active column", () => {
      setSelection(model, ["B1:B100", "C5"]);
      expect(getName(hidePath, env, colMenuRegistry)).toBe("Hide columns B - C");
      expect(getNode(hidePath, colMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(hidePath, env, colMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [1, 2],
        dimension: "COL",
      });
    });
    test("Action without any active column", () => {
      setSelection(model, ["B1"]);
      expect(getName(hidePath, env, colMenuRegistry)).toBe("Hide columns");
      expect(getNode(hidePath, colMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(hidePath, env, colMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [],
        dimension: "COL",
      });
    });

    test("Inactive menu item on invalid selection", () => {
      setSelection(model, ["A1:A100", "A4:Z4"]);
      expect(getNode(hidePath, colMenuRegistry).isVisible(env)).toBeFalsy();
    });

    test("Unhide cols from Col menu", () => {
      hideColumns(model, ["C"]);
      setSelection(model, ["B1:E100"]);
      expect(getNode(unhidePath, colMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(unhidePath, env, colMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [1, 2, 3, 4],
        dimension: "COL",
      });
    });
    test("Unhide rows from Col menu without hidden cols", () => {
      setSelection(model, ["B1:E100"]);
      expect(getNode(unhidePath, colMenuRegistry).isVisible(env)).toBeFalsy();
    });
    test("Unhide all cols from top menu", () => {
      // no hidden rows
      expect(getNode(["edit", "edit_unhide_columns"]).isVisible(env)).toBeFalsy();
      hideColumns(model, ["C"]);
      expect(getNode(["edit", "edit_unhide_columns"]).isVisible(env)).toBeTruthy();
      doAction(["edit", "edit_unhide_columns"], env);
      const sheetId = env.model.getters.getActiveSheetId();
      expect(dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
        sheetId,
        dimension: "COL",
        elements: Array.from(Array(model.getters.getNumberCols(sheetId)).keys()),
      });
    });
  });
  describe("Hide/Unhide Rows", () => {
    const hidePath = ["hide_rows"];
    const unhidePath = ["unhide_rows"];
    test("Action on single row selection", () => {
      selectRow(model, 1, "overrideSelection");
      expect(getName(hidePath, env, rowMenuRegistry)).toBe("Hide row 2");
      expect(getNode(hidePath, rowMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(hidePath, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [1],
        dimension: "ROW",
      });
    });
    test("Action with at least one active row", () => {
      setSelection(model, ["A2:Z2", "C3"]);
      expect(getName(hidePath, env, rowMenuRegistry)).toBe("Hide rows 2 - 3");
      expect(getNode(hidePath, rowMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(hidePath, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [1, 2],
        dimension: "ROW",
      });
    });
    test("Action without any active column", () => {
      setSelection(model, ["B1"]);
      expect(getName(hidePath, env, rowMenuRegistry)).toBe("Hide rows");
      expect(getNode(hidePath, rowMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(hidePath, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [],
        dimension: "ROW",
      });
    });

    test("Inactive menu item on invalid selection", () => {
      setSelection(model, ["A1:A100", "A4:Z4"]);
      expect(getNode(hidePath, rowMenuRegistry).isVisible(env)).toBeFalsy();
    });

    test("Unhide rows from Row menu with hidden rows", () => {
      hideRows(model, [2]);
      setSelection(model, ["A1:Z4"]);
      expect(getNode(unhidePath, rowMenuRegistry).isVisible(env)).toBeTruthy();
      doAction(unhidePath, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [0, 1, 2, 3],
        dimension: "ROW",
      });
    });
    test("Unhide rows from Row menu without hidden rows", () => {
      setSelection(model, ["A1:Z4"]);
      expect(getNode(unhidePath, rowMenuRegistry).isVisible(env)).toBeFalsy();
    });

    test("Unhide all rows from top menu", () => {
      // no hidden rows
      expect(getNode(["edit", "edit_unhide_rows"]).isVisible(env)).toBeFalsy();
      hideRows(model, [2]);
      expect(getNode(["edit", "edit_unhide_rows"]).isVisible(env)).toBeTruthy();
      doAction(["edit", "edit_unhide_rows"], env);
      const sheetId = env.model.getters.getActiveSheetId();
      expect(dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
        sheetId,
        elements: Array.from(Array(model.getters.getNumberRows(sheetId)).keys()),
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
    expect(dispatch).toHaveBeenCalledWith("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: true,
    });
    model.dispatch("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: true,
    });

    doAction(path_gridlines, env);
    expect(dispatch).toHaveBeenCalledWith("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: false,
    });
  });

  describe("Insert > Chart", () => {
    const data = {
      sheets: [
        {
          name: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
          rows: {},
          cells: {
            A2: { content: "P1" },
            A3: { content: "P2" },
            A4: { content: "P3" },
            A5: { content: "P4" },

            B1: { content: "first column dataset" },
            B2: { content: "10" },
            B3: { content: "11" },
            B4: { content: "12" },
            B5: { content: "13" },
          },
        },
      ],
    };
    let dispatchSpy: jest.SpyInstance;
    let defaultPayload: any;

    beforeEach(async () => {
      fixture = makeTestFixture();
      ({ app, parent } = await mountSpreadsheet(fixture, { model: new Model(data) }));
      model = parent.model;
      env = parent.env;
      mockChart();
      dispatchSpy = spyDispatch(parent);
      defaultPayload = {
        position: expect.any(Object),
        id: expect.any(String),
        sheetId: model.getters.getActiveSheetId(),
        definition: {
          background: "#FFFFFF",
          dataSets: ["A1"],
          dataSetsHaveTitle: false,
          labelRange: undefined,
          legendPosition: "top",
          stackedBar: false,
          title: "",
          type: "bar",
          verticalAxisPosition: "left",
        },
      };
    });

    afterEach(() => {
      app.destroy();
    });

    test("Chart is inserted at correct position", () => {
      setSelection(model, ["B2"]);
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2"];
      payload.position = {
        x: 2 * DEFAULT_CELL_WIDTH, // x is position of dataset cell + 1
        y: DEFAULT_CELL_HEIGHT,
      };
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });

    test("Chart of single column without title", () => {
      setSelection(model, ["B2:B5"]);
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2:B5"];
      payload.definition.labelRange = undefined;
      payload.definition.dataSetsHaveTitle = false;
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });

    test("Chart of single column with title", () => {
      setSelection(model, ["B1:B5"]);
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B1:B5"];
      payload.definition.labelRange = undefined;
      payload.definition.dataSetsHaveTitle = true;
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });

    test("Chart of several columns (ie labels) without title", () => {
      setSelection(model, ["A2:B5"]);
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2:B5"];
      payload.definition.labelRange = "A2:A5";
      payload.definition.dataSetsHaveTitle = false;
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });

    test("Chart of several columns (ie labels) with title", () => {
      setSelection(model, ["A1:B5"]);
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B1:B5"];
      payload.definition.labelRange = "A2:A5";
      payload.definition.dataSetsHaveTitle = true;
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });
  });
});
