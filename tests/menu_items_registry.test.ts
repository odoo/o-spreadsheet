import { App } from "@odoo/owl";
import { Model, Spreadsheet } from "../src";
import { fontSizes } from "../src/fonts";
import { zoneToXc } from "../src/helpers";
import { interactivePaste } from "../src/helpers/ui/paste_interactive";
import {
  colMenuRegistry,
  createFullMenuItem,
  FullMenuItem,
  MenuItemRegistry,
  rowMenuRegistry,
  topbarMenuRegistry,
} from "../src/registries/index";
import { getMenuChildren } from "../src/registries/menus/helpers";
import { SpreadsheetChildEnv } from "../src/types";
import {
  BACKGROUND_CHART_COLOR,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_FIGURE_HEIGHT,
  DEFAULT_FIGURE_WIDTH,
} from "./../src/constants";
import {
  addColumns,
  addRows,
  copy,
  freezeColumns,
  freezeRows,
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
    node = node.children
      .filter((item): item is FullMenuItem => typeof item !== "function")
      .find((child) => child.id === p)!;
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
    topbarMenuRegistry.addChild("child3", ["root", "child1"], (env) => {
      const menus = ["test1", "test2"];
      return menus.map((name, i) =>
        createFullMenuItem(name, {
          name: name,
          sequence: i + 5,
          action: () => {},
        })
      );
    });
    const item = topbarMenuRegistry.get("root");
    expect(item.children).toHaveLength(1);
    const child = item.children[0] as FullMenuItem;
    expect(child.name).toBe("Child1");
    expect(child.id).toBe("child1");
    expect(child.children).toHaveLength(2);
    const subChild = child.children[0] as FullMenuItem;
    expect(subChild.name).toBe("Child2");
    expect(subChild.description).toBe("coucou");
    expect(subChild.id).toBe("child2");
    expect(typeof child.children[1]).toEqual("function");

    const allChildren = getMenuChildren(child, {} as SpreadsheetChildEnv);
    expect(allChildren).toHaveLength(3);
    expect(allChildren[0].name).toBe("Child2");
    expect(allChildren[1].name).toBe("test1");
    expect(allChildren[2].name).toBe("test2");
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
    expect(dispatch).toHaveBeenCalledWith("COPY");
    expect(env.clipboard.writeText).toHaveBeenCalledWith(env.model.getters.getClipboardContent());
  });

  test("Edit -> cut", () => {
    env.clipboard.writeText = jest.fn(() => Promise.resolve());
    doAction(["edit", "cut"], env);
    expect(dispatch).toHaveBeenCalledWith("CUT");
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
    copy(model, env.model.getters.getSelectedZones().map(zoneToXc).join(","));
    expect(getNode(["edit", "paste_special"]).isVisible(env)).toBeTruthy();
  });

  test("Edit -> paste_special -> paste_special_value", async () => {
    doAction(["edit", "copy"], env);
    doAction(["edit", "paste_special", "paste_special_value"], env);
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("PASTE", {
      target: env.model.getters.getSelectedZones(),
      pasteOption: "onlyValue",
    });
  });

  test("Edit -> paste_special -> paste_special_value from OS clipboard", async () => {
    const text = "in OS clipboard";
    await env.clipboard.writeText(text);
    doAction(["edit", "paste_special", "paste_special_value"], env);
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("PASTE_FROM_OS_CLIPBOARD", {
      target: target("A1"),
      text,
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
    test("Automatic", () => {
      doAction(["format", "format_number", "format_number_automatic"], env);
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

  describe("Format -> wrapping", () => {
    test("Overflow", () => {
      doAction(["format", "format_wrapping", "format_wrapping_overflow"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        style: { wrapping: "overflow" },
      });
    });

    test("Wrap", () => {
      doAction(["format", "format_wrapping", "format_wrapping_wrap"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        style: { wrapping: "wrap" },
      });
    });

    test("Clip", () => {
      doAction(["format", "format_wrapping", "format_wrapping_clip"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        style: { wrapping: "clip" },
      });
    });
  });

  test("Data -> Sort ascending", () => {
    doAction(["data", "sort_range", "sort_ascending"], env);
    const { anchor, zones } = env.model.getters.getSelection();
    expect(dispatch).toHaveBeenCalledWith("SORT_CELLS", {
      sheetId: env.model.getters.getActiveSheetId(),
      ...anchor.cell,
      zone: zones[0],
      sortDirection: "ascending",
    });
  });

  test("Data -> Sort descending", () => {
    doAction(["data", "sort_range", "sort_descending"], env);
    const { anchor, zones } = env.model.getters.getSelection();
    expect(dispatch).toHaveBeenCalledWith("SORT_CELLS", {
      sheetId: env.model.getters.getActiveSheetId(),
      ...anchor.cell,
      zone: zones[0],
      sortDirection: "descending",
    });
  });

  describe("Data -> Sort", () => {
    const pathSort = ["data", "sort_range"];

    test("A selected zone", () => {
      setSelection(model, ["A1:A2"]);
      expect(getName(pathSort, env)).toBe("Sort range");
      expect(getNode(pathSort).isEnabled(env)).toBeTruthy();
    });

    test("Multiple selected zones", () => {
      setSelection(model, ["A1:A2", "B1:B2"]);
      expect(getNode(pathSort).isEnabled(env)).toBeFalsy();
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

            C1: { content: "" },
            C2: { content: "2" },
            C3: { content: "4" },
            C4: { content: "6" },

            D1: { content: "=sum()" },
            D2: { content: "3" },
            D3: { content: "2" },
            D4: { content: "5" },

            E1: { content: "Title1" },
            E2: { content: "10" },
            E3: { content: "11" },
            E4: { content: "12" },

            F1: { content: "=sum(1,2)" },
            F2: { content: "7" },
            F3: { content: "8" },
            F4: { content: "9" },

            G1: { content: "" },
            G2: { content: "7" },
            G3: { content: "8" },
            G4: { content: "9" },

            H1: { content: "Title2" },
            H2: { content: "7" },
            H3: { content: "8" },
            H4: { content: "9" },
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
        size: expect.any(Object),
        id: expect.any(String),
        sheetId: model.getters.getActiveSheetId(),
        definition: {
          dataSets: ["A1"],
          background: BACKGROUND_CHART_COLOR,
          dataSetsHaveTitle: false,
          labelRange: undefined,
          legendPosition: "none",
          stackedBar: false,
          title: expect.any(String),
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
      const { width, height } = model.getters.getSheetViewDimension();
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2"];
      payload.position = {
        x: (width - DEFAULT_FIGURE_WIDTH) / 2,
        y: (height - DEFAULT_FIGURE_HEIGHT) / 2,
      }; // Position at the center of the viewport
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });

    test("Chart is inserted at correct position inside bottomRight pane for rows freeze", () => {
      const sheetId = model.getters.getActiveSheetId();
      freezeRows(model, 5, sheetId);
      setSelection(model, ["B2"]);
      doAction(["insert", "insert_chart"], env);
      const { width, height } = model.getters.getSheetViewDimension();
      const { y: offsetCorrectionY } = model.getters.getMainViewportCoordinates();
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2"];
      payload.position = {
        x: (width - DEFAULT_FIGURE_WIDTH) / 2,
        y: (height - DEFAULT_FIGURE_HEIGHT + offsetCorrectionY) / 2,
      }; // Position at the center of the viewport
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });

    test("Chart is inserted at correct position inside bottomRight pane for columns freeze", () => {
      const sheetId = model.getters.getActiveSheetId();
      freezeColumns(model, 4, sheetId);
      setSelection(model, ["B2"]);
      doAction(["insert", "insert_chart"], env);
      const { width, height } = model.getters.getSheetViewDimension();
      const { x: offsetCorrectionX } = model.getters.getMainViewportCoordinates();
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2"];
      payload.position = {
        x: (width - DEFAULT_FIGURE_WIDTH + offsetCorrectionX) / 2,
        y: (height - DEFAULT_FIGURE_HEIGHT) / 2,
      }; // Position at the center of the viewport
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });

    test("Chart is inserted at correct position inside bottomRight pane for both freeze", () => {
      const sheetId = model.getters.getActiveSheetId();
      freezeColumns(model, 4, sheetId);
      freezeRows(model, 5, sheetId);
      setSelection(model, ["B2"]);
      doAction(["insert", "insert_chart"], env);
      const { width, height } = model.getters.getSheetViewDimension();
      const { x: offsetCorrectionX, y: offsetCorrectionY } =
        model.getters.getMainViewportCoordinates();
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2"];
      payload.position = {
        x: (width - DEFAULT_FIGURE_WIDTH + offsetCorrectionX) / 2,
        y: (height - DEFAULT_FIGURE_HEIGHT + offsetCorrectionY) / 2,
      }; // Position at the center of the viewport
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });

    test("Chart is inserted at the top left of the viewport when too small", () => {
      setSelection(model, ["B2"]);
      model.dispatch("RESIZE_SHEETVIEW", {
        width: DEFAULT_FIGURE_WIDTH / 2,
        height: DEFAULT_FIGURE_HEIGHT / 2,
        gridOffsetX: 0,
        gridOffsetY: 0,
      });
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2"];
      payload.position = {
        x: 0,
        y: 0,
      }; // Position at the center of the viewport
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });

    test("Chart is inserted at the top left of the viewport when too small in a frozen pane", () => {
      addRows(model, "before", 0, 100);
      setSelection(model, ["B2"]);
      model.dispatch("RESIZE_SHEETVIEW", {
        width: DEFAULT_FIGURE_WIDTH * 1.5,
        height: DEFAULT_FIGURE_HEIGHT * 1.5,
        gridOffsetX: 0,
        gridOffsetY: 0,
      });
      const { bottom, right } = model.getters.getActiveMainViewport();
      freezeColumns(model, Math.floor(right / 2));
      freezeRows(model, Math.floor(bottom / 2));
      const { x: offsetCorrectionX, y: offsetCorrectionY } =
        model.getters.getMainViewportCoordinates();
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2"];

      payload.position = {
        x: offsetCorrectionX,
        y: offsetCorrectionY,
      }; // Position at the top of the bottom pane of the viewport
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });

    test("Chart is inserted at correct position on a scrolled viewport", () => {
      setSelection(model, ["B2"]);
      const { width, height } = env.model.getters.getSheetViewDimension();
      addColumns(model, "after", "D", 100);
      addRows(model, "after", 4, 100);
      env.model.dispatch("SET_VIEWPORT_OFFSET", {
        offsetX: 2 * DEFAULT_CELL_WIDTH,
        offsetY: 4 * DEFAULT_CELL_HEIGHT,
      });
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2"];
      payload.position = {
        x: 2 * DEFAULT_CELL_WIDTH + (width - DEFAULT_FIGURE_WIDTH) / 2,
        y: 4 * DEFAULT_CELL_HEIGHT + (height - DEFAULT_FIGURE_HEIGHT) / 2,
      }; // Position at the center of the viewport
      expect(dispatchSpy).toHaveBeenLastCalledWith("CREATE_CHART", payload);
    });

    test("Chart is inserted at correct position on a scrolled viewport with frozen rows", () => {
      const sheetId = model.getters.getActiveSheetId();
      freezeRows(model, 5, sheetId);
      setSelection(model, ["B2"]);
      const { width, height } = model.getters.getSheetViewDimension();
      const { y: offsetCorrectionY } = model.getters.getMainViewportCoordinates();
      addColumns(model, "after", "D", 100);
      addRows(model, "after", 4, 100);
      env.model.dispatch("SET_VIEWPORT_OFFSET", {
        offsetX: 2 * DEFAULT_CELL_WIDTH,
        offsetY: 4 * DEFAULT_CELL_HEIGHT,
      });
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2"];
      payload.position = {
        x: 2 * DEFAULT_CELL_WIDTH + (width - DEFAULT_FIGURE_WIDTH) / 2,
        y: 4 * DEFAULT_CELL_HEIGHT + (height - DEFAULT_FIGURE_HEIGHT + offsetCorrectionY) / 2,
      }; // Position at the center of the viewport
      expect(dispatchSpy).toHaveBeenLastCalledWith("CREATE_CHART", payload);
    });

    test("Chart is inserted at correct position on a scrolled viewport with columns frozen", () => {
      const sheetId = model.getters.getActiveSheetId();
      freezeColumns(model, 4, sheetId);
      setSelection(model, ["B2"]);
      const { width, height } = model.getters.getSheetViewDimension();
      const { x: offsetCorrectionX } = model.getters.getMainViewportCoordinates();
      addColumns(model, "after", "D", 100);
      addRows(model, "after", 4, 100);
      env.model.dispatch("SET_VIEWPORT_OFFSET", {
        offsetX: 2 * DEFAULT_CELL_WIDTH,
        offsetY: 4 * DEFAULT_CELL_HEIGHT,
      });
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2"];
      payload.position = {
        x: 2 * DEFAULT_CELL_WIDTH + (width - DEFAULT_FIGURE_WIDTH + offsetCorrectionX) / 2,
        y: 4 * DEFAULT_CELL_HEIGHT + (height - DEFAULT_FIGURE_HEIGHT) / 2,
      }; // Position at the center of the viewport
      expect(dispatchSpy).toHaveBeenLastCalledWith("CREATE_CHART", payload);
    });

    test("Chart is inserted at correct position on a scrolled viewport with both directions frozen", () => {
      const sheetId = model.getters.getActiveSheetId();
      freezeColumns(model, 4, sheetId);
      freezeRows(model, 5, sheetId);
      setSelection(model, ["B2"]);
      const { width, height } = model.getters.getSheetViewDimension();
      const { x: offsetCorrectionX, y: offsetCorrectionY } =
        model.getters.getMainViewportCoordinates();
      addColumns(model, "after", "D", 100);
      addRows(model, "after", 4, 100);
      env.model.dispatch("SET_VIEWPORT_OFFSET", {
        offsetX: 2 * DEFAULT_CELL_WIDTH,
        offsetY: 4 * DEFAULT_CELL_HEIGHT,
      });
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2"];
      payload.position = {
        x: 2 * DEFAULT_CELL_WIDTH + (width - DEFAULT_FIGURE_WIDTH + offsetCorrectionX) / 2,
        y: 4 * DEFAULT_CELL_HEIGHT + (height - DEFAULT_FIGURE_HEIGHT + offsetCorrectionY) / 2,
      }; // Position at the center of the viewport
      expect(dispatchSpy).toHaveBeenLastCalledWith("CREATE_CHART", payload);
    });

    test("Chart of single column without title", () => {
      setSelection(model, ["B2:B5"]);
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B2:B5"];
      payload.definition.labelRange = undefined;
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

    test("Chart title should be set by default if dataset have any", () => {
      setSelection(model, ["B1:C4"]);
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["C1:C4"];
      payload.definition.legendPosition = "none";
      payload.definition.title = "";
      payload.definition.dataSetsHaveTitle = false;
      payload.definition.labelRange = "B1:B4";
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });
    test("Chart title should only generate string and numerical values", async () => {
      setSelection(model, ["C1:G4"]);
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["D1:G4"];
      payload.definition.legendPosition = "top";
      payload.definition.title = "Title1 and 3";
      payload.definition.dataSetsHaveTitle = true;
      payload.definition.labelRange = "C2:C4";
      await nextTick();
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });
    test("Chart title should only append and prefix to last title", () => {
      setSelection(model, ["C1:H4"]);
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["D1:H4"];
      payload.definition.legendPosition = "top";
      payload.definition.title = "Title1, 3 and Title2";
      payload.definition.dataSetsHaveTitle = true;
      payload.definition.labelRange = "C2:C4";
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });
    test("[Case 1] Chart is inserted with proper legend position", () => {
      setSelection(model, ["A1:B5"]);
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["B1:B5"];
      payload.definition.labelRange = "A2:A5";
      payload.definition.dataSetsHaveTitle = true;
      payload.definition.legendPosition = "none";
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });
    test("[Case 2] Chart is inserted with proper legend position", () => {
      setSelection(model, ["F1:I5"]);
      doAction(["insert", "insert_chart"], env);
      const payload = { ...defaultPayload };
      payload.definition.dataSets = ["G1:I5"];
      payload.definition.dataSetsHaveTitle = true;
      payload.definition.labelRange = "F2:F5";
      payload.definition.legendPosition = "top";
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    });
  });

  describe("Freeze rows and columns", () => {
    test("Columns", () => {
      const sheetId = model.getters.getActiveSheetId();
      doAction(["view", "freeze_panes", "freeze_first_col"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 1, ySplit: 0 });
      doAction(["view", "freeze_panes", "freeze_second_col"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 2, ySplit: 0 });
      setSelection(model, ["G5"]);
      doAction(["view", "freeze_panes", "freeze_current_col"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 7, ySplit: 0 });
      doAction(["view", "freeze_panes", "unfreeze_columns"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
    });

    test("Rows", () => {
      const sheetId = model.getters.getActiveSheetId();
      doAction(["view", "freeze_panes", "freeze_first_row"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 1 });
      doAction(["view", "freeze_panes", "freeze_second_row"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 2 });
      setSelection(model, ["G5"]);
      doAction(["view", "freeze_panes", "freeze_current_row"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 5 });
      doAction(["view", "freeze_panes", "unfreeze_rows"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
    });

    test("Unfreeze columns and rows", () => {
      const sheetId = model.getters.getActiveSheetId();
      const view = topbarMenuRegistry.getAll().find((item) => item.id === "view")!;
      const unfreeze_panes = (view.children as FullMenuItem[]).find(
        (item) => item.id === "unfreeze_panes"
      )!;
      expect(unfreeze_panes.isVisible(env)).toBe(false);
      freezeColumns(model, 1);
      expect(unfreeze_panes.isVisible(env)).toBe(true);
      unfreeze_panes.action(env);
      expect(model.getters.getPaneDivisions(sheetId));
      expect(unfreeze_panes.isVisible(env)).toBe(false);
      freezeRows(model, 3);
      expect(unfreeze_panes.isVisible(env)).toBe(true);
      unfreeze_panes.action(env);
      expect(model.getters.getPaneDivisions(sheetId));
      expect(unfreeze_panes.isVisible(env)).toBe(false);
    });

    test("unfreeze actions visibility", () => {
      const unfreezeColAction = getNode(["view", "freeze_panes", "unfreeze_columns"]);
      const unfreezeRowAction = getNode(["view", "freeze_panes", "unfreeze_rows"]);
      const unfreezeAllAction = getNode(["view", "unfreeze_panes"]);

      expect(unfreezeColAction.isVisible(env)).toBe(false);
      expect(unfreezeRowAction.isVisible(env)).toBe(false);
      expect(unfreezeAllAction.isVisible(env)).toBe(false);

      freezeColumns(model, 1);
      expect(unfreezeColAction.isVisible(env)).toBe(true);
      expect(unfreezeRowAction.isVisible(env)).toBe(false);
      expect(unfreezeAllAction.isVisible(env)).toBe(true);

      freezeRows(model, 3);
      expect(unfreezeColAction.isVisible(env)).toBe(true);
      expect(unfreezeRowAction.isVisible(env)).toBe(true);
      expect(unfreezeAllAction.isVisible(env)).toBe(true);
    });
  });
});
