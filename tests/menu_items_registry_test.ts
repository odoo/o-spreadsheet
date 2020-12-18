import { Model } from "../src";
import { fontSizes } from "../src/fonts";
import { FullMenuItem, topbarMenuRegistry } from "../src/registries/index";
import { CommandResult, SpreadsheetEnv } from "../src/types";
import { GridParent, makeTestFixture, nextTick, mockUuidV4To } from "./helpers";
jest.mock("../src/helpers/uuid", () => require("./__mocks__/uuid"));

function getNode(_path: string[]): FullMenuItem {
  const path = [..._path];
  const root = path.splice(0, 1)[0];
  let node = topbarMenuRegistry.get(root);
  for (let p of path) {
    if (typeof node.children !== "function") {
      node = node.children.find((child) => child.id === p)!;
    }
  }
  return node;
}

function doAction(path: string[], env: SpreadsheetEnv): void {
  const node = getNode(path);
  node.action(env);
}

function getName(path: string[], env: SpreadsheetEnv): string {
  const node = getNode(path);
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
    env.dispatch = jest.fn(() => ({ status: "SUCCESS" } as CommandResult));
  });

  test("Edit -> undo", () => {
    doAction(["edit", "undo"], env);
    expect(env.dispatch).toHaveBeenCalledWith("UNDO");
  });

  test("Edit -> redo", () => {
    doAction(["edit", "redo"], env);
    expect(env.dispatch).toHaveBeenCalledWith("REDO");
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
      onlyValue: true,
    });
  });

  test("Edit -> paste_special -> paste_special_format", () => {
    doAction(["edit", "paste_special", "paste_special_format"], env);
    expect(env.dispatch).toHaveBeenCalledWith("PASTE", {
      target: env.getters.getSelectedZones(),
      onlyFormat: true,
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
      expect(env.dispatch).toHaveBeenLastCalledWith("REMOVE_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        rows: [4, 5],
      });
    });

    test("A selected cell", () => {
      model.dispatch("SELECT_CELL", { col: 3, row: 3 });
      expect(getName(path, env)).toBe("Delete row 4");
    });

    test("Multiple selected cells", () => {
      model.dispatch("SELECT_CELL", { col: 3, row: 3 });
      model.dispatch("ALTER_SELECTION", { cell: [4, 4] });
      expect(getName(path, env)).toBe("Delete rows 4 - 5");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("REMOVE_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        rows: [3, 4],
      });
    });
  });

  describe("Edit -> edit_delete_column", () => {
    const path = ["edit", "edit_delete_column"];

    test("A selected column", () => {
      model.dispatch("SELECT_COLUMN", { index: 4, createRange: true });
      expect(getName(path, env)).toBe("Delete column E");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS", {
        sheetId: env.getters.getActiveSheetId(),
        columns: [4],
      });
    });

    test("Multiple selected columns", () => {
      model.dispatch("SELECT_COLUMN", { index: 4, createRange: true });
      model.dispatch("SELECT_COLUMN", { index: 5, updateRange: true });
      expect(getName(path, env)).toBe("Delete columns E - F");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS", {
        sheetId: env.getters.getActiveSheetId(),
        columns: [4, 5],
      });
    });

    test("A selected cell", () => {
      model.dispatch("SELECT_CELL", { col: 3, row: 3 });
      expect(getName(path, env)).toBe("Delete column D");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS", {
        sheetId: env.getters.getActiveSheetId(),
        columns: [3],
      });
    });

    test("Multiple selected cells", () => {
      model.dispatch("SELECT_CELL", { col: 3, row: 3 });
      model.dispatch("ALTER_SELECTION", { cell: [4, 4] });
      expect(getName(path, env)).toBe("Delete columns D - E");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS", {
        sheetId: env.getters.getActiveSheetId(),
        columns: [3, 4],
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
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        row: 4,
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
      model.dispatch("SELECT_CELL", { col: 3, row: 3 });
      expect(getName(path, env)).toBe("Row above");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", () => {
      model.dispatch("SELECT_CELL", { col: 3, row: 3 });
      model.dispatch("ALTER_SELECTION", { cell: [4, 4] });
      expect(getName(path, env)).toBe("2 Rows above");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        row: 3,
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
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        row: 5,
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
      model.dispatch("SELECT_CELL", { col: 3, row: 3 });
      expect(getName(path, env)).toBe("Row below");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", () => {
      model.dispatch("SELECT_CELL", { col: 3, row: 3 });
      model.dispatch("ALTER_SELECTION", { cell: [4, 4] });
      expect(getName(path, env)).toBe("2 Rows below");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_ROWS", {
        sheetId: env.getters.getActiveSheetId(),
        row: 4,
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
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS", {
        sheetId: env.getters.getActiveSheetId(),
        column: 4,
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
      model.dispatch("SELECT_CELL", { col: 3, row: 3 });
      expect(getName(path, env)).toBe("Column left");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", () => {
      model.dispatch("SELECT_CELL", { col: 3, row: 3 });
      model.dispatch("ALTER_SELECTION", { cell: [4, 4] });
      expect(getName(path, env)).toBe("2 Columns left");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS", {
        sheetId: env.getters.getActiveSheetId(),
        column: 3,
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
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS", {
        sheetId: env.getters.getActiveSheetId(),
        column: 5,
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
      model.dispatch("SELECT_CELL", { col: 3, row: 3 });
      expect(getName(path, env)).toBe("Column right");
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", () => {
      model.dispatch("SELECT_CELL", { col: 3, row: 3 });
      model.dispatch("ALTER_SELECTION", { cell: [4, 4] });
      expect(getName(path, env)).toBe("2 Columns right");
      doAction(path, env);
      expect(env.dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS", {
        sheetId: env.getters.getActiveSheetId(),
        column: 4,
        quantity: 2,
        position: "after",
      });
      expect(getNode(path).isVisible(env)).toBeTruthy();
    });
  });

  test("Insert -> new sheet", () => {
    mockUuidV4To(42);
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
    test("Automatic", () => {
      doAction(["format", "format_number", "format_number_auto"], env);
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
});
