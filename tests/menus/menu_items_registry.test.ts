import { toUnboundedZone, toZone, zoneToXc } from "../../src/helpers";
import { DEFAULT_LOCALES, UID } from "../../src/types";
import {
  copy,
  createDynamicTable,
  createTable,
  createTableWithFilter,
  cut,
  foldHeaderGroup,
  freezeColumns,
  freezeRows,
  groupColumns,
  groupHeaders,
  groupRows,
  hideColumns,
  hideRows,
  selectAll,
  selectCell,
  selectColumn,
  selectRow,
  setAnchorCorner,
  setCellContent,
  setFormat,
  setFormatting,
  setGridLinesVisibility,
  setSelection,
  updateLocale,
  updateTableConfig,
} from "../test_helpers/commands_helpers";
import {
  getCell,
  getCellContent,
  getEvaluatedCell,
  getStyle,
} from "../test_helpers/getters_helpers";
import {
  addToRegistry,
  clearFunctions,
  createModel,
  doAction,
  getDataValidationRules,
  getName,
  getNode,
  makeTestEnv,
  spyModelDispatch,
  target,
} from "../test_helpers/helpers";
import {
  addPivot,
  createModelWithPivot,
  createModelWithTestPivotDataset,
} from "../test_helpers/pivot_helpers";

import { Currency, Model } from "../../src";

import { FONT_SIZES } from "@odoo/o-spreadsheet-engine/constants";
import { functionRegistry } from "@odoo/o-spreadsheet-engine/functions/function_registry";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { ActionSpec, createAction, createActions } from "../../src/actions/action";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { interactivePaste } from "../../src/helpers/ui/paste_interactive";
import { MenuItemRegistry } from "../../src/registries/menu_items_registry";
import {
  cellMenuRegistry,
  colMenuRegistry,
  rowMenuRegistry,
  topbarMenuRegistry,
} from "../../src/registries/menus";
import { FR_LOCALE } from "../test_helpers/constants";

const TEST_CURRENCY: Partial<Currency> = {
  symbol: "€",
  decimalPlaces: 3,
  position: "before",
};

describe("Top Bar MenuPopover Item Registry", () => {
  let registry: MenuItemRegistry;

  beforeEach(() => (registry = new MenuItemRegistry()));

  test("Menu registry items have unique ActionSpec path", () => {
    addToRegistry(registry, "root", { name: "rootNode" });
    registry.addChild("child", ["root"], { id: "unique", name: "child" });
    expect(() =>
      registry.addChild("child", ["root"], { id: "unique", name: "child" })
    ).toThrowError('A child with the id "unique" already exists.');
  });
  test("Menu registry entries can be overriden explicitely", () => {
    addToRegistry(registry, "root", { name: "rootNode" });
    registry.addChild("child", ["root"], { id: "unique", name: "child" });
    expect(() =>
      registry.replaceChild("child", ["root"], { id: "unique", name: "child" })
    ).not.toThrowError();
  });
  test("Menu items can have the same id with different parent nodes", () => {
    addToRegistry(registry, "root1", { name: "rootNode1" });
    addToRegistry(registry, "root2", { name: "rootNode2" });
    registry.addChild("child", ["root1"], { id: "unique", name: "child" });
    expect(() =>
      registry.addChild("child", ["root2"], { id: "unique", name: "child" })
    ).not.toThrowError();
  });
});

describe("Top Bar MenuPopover Item Registry", () => {
  let menuDefinitions;
  beforeEach(() => {
    menuDefinitions = Object.assign({}, topbarMenuRegistry.content);
  });

  afterEach(() => {
    topbarMenuRegistry.content = menuDefinitions;
  });
  test("Can add children to menu Items", () => {
    addToRegistry(topbarMenuRegistry, "root", { name: "Root", sequence: 1 });
    topbarMenuRegistry.addChild("child1", ["root"], { name: "Child1", sequence: 1 });
    topbarMenuRegistry.addChild("child2", ["root", "child1"], {
      name: "Child2",
      sequence: 1,
      description: "coucou",
    });
    topbarMenuRegistry.addChild("child3", ["root", "child1"], (env) => {
      const menus = ["test1", "test2"];
      return menus.map((name) => ({
        id: name,
        name: name,
        execute: () => {},
        sequence: 1,
      }));
    });
    const env = makeTestEnv();
    const [item] = topbarMenuRegistry.getMenuItems();

    const children = item.children && item.children(env);
    expect(children).toHaveLength(1);
    const child = children[0];
    expect(child.name(env)).toBe("Child1");
    expect(child.id).toBe("child1");
    expect(child.children(env)).toHaveLength(3);
    const subChild = child.children(env)[0];
    expect(subChild.name(env)).toBe("Child2");
    expect(subChild.description(env)).toBe("coucou");
    expect(subChild.id).toBe("child2");

    const allChildren = child.children(env);
    expect(allChildren).toHaveLength(3);
    expect(allChildren[0].name(env)).toBe("Child2");
    expect(allChildren[1].name(env)).toBe("test1");
    expect(allChildren[2].name(env)).toBe("test2");
  });

  test("Adding a child to non-existing item throws", () => {
    expect(() =>
      topbarMenuRegistry.addChild("child", ["non-existing"], { name: "child", sequence: 1 })
    ).toThrow();
    addToRegistry(topbarMenuRegistry, "root", { name: "Root", sequence: 1 });
    expect(() =>
      topbarMenuRegistry.addChild("child1", ["root", "non-existing"], {
        name: "Child1",
        sequence: 1,
      })
    ).toThrow();
  });
});

describe("Menu Item actions", () => {
  let model: Model;
  let sheetId: UID;
  let env: SpreadsheetChildEnv;
  let dispatch: jest.SpyInstance;

  beforeEach(async () => {
    env = makeTestEnv();
    model = env.model;
    dispatch = spyModelDispatch(model);
    sheetId = model.getters.getActiveSheetId();
  });

  test("Edit -> undo", async () => {
    setCellContent(model, "A1", "coucou");
    await doAction(["edit", "undo"], env);
    expect(dispatch).toHaveBeenCalledWith("REQUEST_UNDO");
  });

  test("Edit -> redo", async () => {
    setCellContent(model, "A1", "coucou");
    await doAction(["edit", "redo"], env);
    expect(dispatch).toHaveBeenCalledWith("REQUEST_REDO");
  });

  test("Edit -> copy", async () => {
    const spyWriteClipboard = jest.spyOn(env.clipboard!, "write");
    await doAction(["edit", "copy"], env);
    expect(dispatch).toHaveBeenCalledWith("COPY");
    expect(spyWriteClipboard).toHaveBeenCalledWith(
      await model.getters.getClipboardTextAndImageContent()
    );
  });

  test("Edit -> cut", async () => {
    const spyWriteClipboard = jest.spyOn(env.clipboard!, "write");
    await doAction(["edit", "cut"], env);
    expect(dispatch).toHaveBeenCalledWith("CUT");
    expect(spyWriteClipboard).toHaveBeenCalledWith(
      await model.getters.getClipboardTextAndImageContent()
    );
  });

  test("Edit -> paste from OS clipboard if copied from outside world last", async () => {
    setCellContent(model, "A1", "a1");
    selectCell(model, "A1");
    await doAction(["edit", "copy"], env); // first copy from grid
    await env.clipboard!.writeText("Then copy in OS clipboard");
    selectCell(model, "C3");
    await doAction(["edit", "paste"], env);
    expect(getCellContent(model, "C3")).toEqual("Then copy in OS clipboard");
  });

  test("Edit -> paste if copied from grid last", async () => {
    await env.clipboard!.writeText("First copy in OS clipboard");
    await doAction(["edit", "copy"], env); // then copy from grid
    await doAction(["edit", "paste"], env);
    interactivePaste(env, target("A1"));
    expect(getCellContent(model, "A1")).toEqual("");
  });

  test("'Edit -> paste' if copied from grid and content altered before paste", async () => {
    setCellContent(model, "A1", "a1");
    await doAction(["edit", "copy"], env); // first copy from grid
    setCellContent(model, "A1", "os clipboard");
    selectCell(model, "C3");
    await doAction(["edit", "paste"], env);
    expect(dispatch).toHaveBeenCalledWith("PASTE", {
      target: env.model.getters.getSelectedZones(),
      pasteOption: undefined,
    });
    expect(getCellContent(model, "C3")).toEqual("a1");
  });

  test("Paste only-format from OS clipboard should paste nothing", async () => {
    await env.clipboard!.writeText("Copy in OS clipboard");
    selectCell(model, "A1");
    await doAction(["edit", "paste_special", "paste_special_format"], env);
    expect(dispatch).toHaveBeenCalledWith("PASTE_FROM_OS_CLIPBOARD", {
      clipboardContent: { text: "Copy in OS clipboard" },
      target: target("A1"),
      pasteOption: "onlyFormat",
    });
    expect(getCellContent(model, "A1")).toEqual("");
  });

  test("Internal copy followed by OS copy should not bring paste format from internal copy", async () => {
    setCellContent(model, "C1", "c1");
    setFormatting(model, "C1", { fillColor: "#FA0000" });
    selectCell(model, "C1");
    await doAction(["edit", "copy"], env); // first copy from grid
    await env.clipboard!.writeText("Then copy in OS clipboard");
    selectCell(model, "A1");
    await doAction(["edit", "paste_special", "paste_special_format"], env);
    expect(getStyle(model, "A1").fillColor).toBeUndefined();
    expect(getCellContent(model, "A1")).toEqual("");
  });

  test("Edit -> paste_special should be hidden after a CUT ", () => {
    cut(model);
    expect(getNode(["edit", "paste_special"], env).isVisible(env)).toBeFalsy();
  });

  test("Data -> Pivot groups pivot data sources in a submenu", () => {
    const pivotModel = createModelWithPivot("A1:I22");
    const pivotEnv = makeTestEnv({ model: pivotModel });

    const pivotSubmenu = getNode(["data", "pivot_data_sources"], pivotEnv);
    const pivotIds = pivotModel.getters.getPivotIds();
    const firstPivotId = pivotIds[0];
    const pivotItem = getNode(
      [
        "data",
        "pivot_data_sources",
        `item_pivot_${pivotModel.getters.getPivotFormulaId(firstPivotId)}`,
      ],
      pivotEnv
    );

    expect(getName(["data", "pivot_data_sources"], pivotEnv)).toBe("Pivot");
    expect(pivotSubmenu.isVisible(pivotEnv)).toBeTruthy();
    expect(pivotSubmenu.children(pivotEnv)).toHaveLength(pivotIds.length);
    expect(pivotItem.name(pivotEnv)).toBe(pivotModel.getters.getPivotDisplayName(firstPivotId));
  });

  test("Data -> Pivot submenu shows a warning icon when at least one pivot is unused", () => {
    const pivotModel = createModelWithTestPivotDataset();
    addPivot(pivotModel, "A1:E18", { name: "Unused pivot" }, "2");
    const pivotEnv = makeTestEnv({ model: pivotModel });

    const pivotSubmenu = getNode(["data", "pivot_data_sources"], pivotEnv);
    expect(pivotSubmenu.secondaryIcon(pivotEnv)).toBe("o-spreadsheet-Icon.UNUSED_PIVOT_WARNING");
  });

  test("Edit -> paste_special should not be hidden after a COPY ", () => {
    copy(model, env.model.getters.getSelectedZones().map(zoneToXc).join(","));
    expect(getNode(["edit", "paste_special"], env).isVisible(env)).toBeTruthy();
  });

  test("Edit -> paste_special -> paste_special_value", async () => {
    await doAction(["edit", "copy"], env);
    await doAction(["edit", "paste_special", "paste_special_value"], env);
    expect(dispatch).toHaveBeenCalledWith("PASTE", {
      target: env.model.getters.getSelectedZones(),
      pasteOption: "asValue",
    });
  });

  test("Edit -> paste_special -> paste_special_value from OS clipboard", async () => {
    const text = "in OS clipboard";
    await env.clipboard!.writeText(text);
    await doAction(["edit", "paste_special", "paste_special_value"], env);
    expect(dispatch).toHaveBeenCalledWith("PASTE_FROM_OS_CLIPBOARD", {
      target: target("A1"),
      clipboardContent: { text },
      pasteOption: "asValue",
    });
  });

  test("Edit -> paste_special -> paste_special_format", async () => {
    await doAction(["edit", "copy"], env);
    await doAction(["edit", "paste_special", "paste_special_format"], env);
    expect(dispatch).toHaveBeenCalledWith("PASTE", {
      target: env.model.getters.getSelectedZones(),
      pasteOption: "onlyFormat",
    });
  });

  test("Edit -> paste_special -> paste_special_format from OS clipboard", async () => {
    const text = "in OS clipboard";
    await env.clipboard!.writeText(text);
    await doAction(["edit", "paste_special", "paste_special_format"], env);
    expect(dispatch).toHaveBeenCalledWith("PASTE_FROM_OS_CLIPBOARD", {
      target: target("A1"),
      clipboardContent: { text },
      pasteOption: "onlyFormat",
    });
  });

  test("Edit -> edit_delete_cell_values", async () => {
    await doAction(["edit", "delete", "edit_delete_cell_values"], env);
    expect(dispatch).toHaveBeenCalledWith("DELETE_UNFILTERED_CONTENT", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
    });
  });

  describe("Edit -> edit_delete_row", () => {
    const path = ["edit", "delete", "edit_delete_row"];

    test("A selected row", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getName(path, env)).toBe("Delete row 5");
    });

    test("Multiple selected rows", async () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getName(path, env)).toBe("Delete rows 5 - 6");
      await doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "ROW",
        elements: [4, 5],
      });
    });

    test("Multiple zones of selected rows", async () => {
      selectRow(model, 4, "newAnchor");
      selectRow(model, 5, "updateAnchor");
      expect(getName(path, env)).toBe("Delete rows");
      await doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "ROW",
        elements: [4, 5],
      });
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(path, env)).toBe("Delete row 4");
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(path, env)).toBe("Delete rows 4 - 5");
      await doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "ROW",
        elements: [3, 4],
      });
    });

    test("selecting all non-frozen rows should hide the option for deletion", async () => {
      const sheetId = model.getters.getActiveSheetId();
      const lastRow = model.getters.getNumberRows(sheetId) - 1;

      freezeRows(model, 4, sheetId);
      selectRow(model, 4, "newAnchor");
      selectRow(model, lastRow, "updateAnchor");

      expect(getNode(path, env).isVisible(env)).toBeFalsy();
    });

    test("Delete row option unavailable when selecting all rows with folded row grouping", () => {
      const lastRow = model.getters.getNumberRows(sheetId) - 1;

      groupHeaders(model, "ROW", 0, 2, sheetId);
      foldHeaderGroup(model, "ROW", 0, 2, sheetId);

      selectRow(model, 3, "newAnchor");
      selectRow(model, lastRow, "updateAnchor");
      expect(getNode(path, env).isVisible(env)).toBeFalsy();
    });

    test("Selecting column should hide the option for row deletion", async () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getNode(path, env).isVisible(env)).toBeFalsy();
    });
  });

  describe("Edit -> edit_delete_column", () => {
    const path = ["edit", "delete", "edit_delete_column"];

    test("A selected column", async () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getName(path, env)).toBe("Delete column E");
      await doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "COL",
        elements: [4],
      });
    });

    test("Multiple selected columns", async () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(path, env)).toBe("Delete columns E - F");
      await doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "COL",
        elements: [4, 5],
      });
    });

    test("Multiple zones of selected columns", async () => {
      selectColumn(model, 4, "newAnchor");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(path, env)).toBe("Delete columns");
      await doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "COL",
        elements: [4, 5],
      });
    });

    test("A selected cell", async () => {
      selectCell(model, "D4");
      expect(getName(path, env)).toBe("Delete column D");
      await doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "COL",
        elements: [3],
      });
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(path, env)).toBe("Delete columns D - E");
      await doAction(path, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "COL",
        elements: [3, 4],
      });
    });

    test("selecting all non-frozen columns should hide the option for deletion", async () => {
      const sheetId = model.getters.getActiveSheetId();
      const lastColumn = model.getters.getNumberCols(sheetId) - 1;

      freezeColumns(model, 3, sheetId);
      selectColumn(model, 3, "newAnchor");
      selectColumn(model, lastColumn, "updateAnchor");

      expect(getNode(path, env).isVisible(env)).toBeFalsy();
    });

    test("Selecting row should hide the option for column deletion", async () => {
      selectRow(model, 4, "overrideSelection");
      expect(getNode(path, env).isVisible(env)).toBeFalsy();
    });
  });

  describe("Insert -> Row above", () => {
    const insertRowBeforePath = ["insert", "insert_row", "insert_row_before"];

    test("A selected row", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getName(insertRowBeforePath, env)).toBe("Row above");
      expect(getNode(insertRowBeforePath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple consecutive selected rows", async () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getName(insertRowBeforePath, env)).toBe("2 Rows above");
      await doAction(insertRowBeforePath, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "ROW",
        base: 4,
        quantity: 2,
        position: "before",
      });
      expect(getNode(insertRowBeforePath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple inconsecutive selected rows", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 6, "newAnchor");
      expect(getNode(insertRowBeforePath, env).isVisible(env)).toBeFalsy();
    });

    test("A selected column should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getNode(insertRowBeforePath, env).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(insertRowBeforePath, env)).toBe("Row above");
      expect(getNode(insertRowBeforePath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(insertRowBeforePath, env)).toBe("2 Rows above");
      await doAction(insertRowBeforePath, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "ROW",
        base: 3,
        quantity: 2,
        position: "before",
      });
      expect(getNode(insertRowBeforePath, env).isVisible(env)).toBeTruthy();
    });
  });

  describe("Insert row above via row menu", () => {
    const addRowBeforePath = ["add_row_before"];

    test("A selected row", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getName(addRowBeforePath, env, rowMenuRegistry)).toBe("Insert row above");
      expect(getNode(addRowBeforePath, env, rowMenuRegistry).isVisible(env)).toBeTruthy();
    });

    test("Multiple consecutive selected rows", async () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getName(addRowBeforePath, env, rowMenuRegistry)).toBe("Insert 2 rows above");
      await doAction(addRowBeforePath, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "ROW",
        base: 4,
        quantity: 2,
        position: "before",
      });
      expect(getNode(addRowBeforePath, env, rowMenuRegistry).isVisible(env)).toBeTruthy();
    });

    test("Multiple inconsecutive selected rows", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 6, "newAnchor");
      expect(getNode(addRowBeforePath, env, rowMenuRegistry).isVisible(env)).toBeFalsy();
    });

    test("Full sheet selected", () => {
      selectAll(model);
      expect(getNode(addRowBeforePath, env, rowMenuRegistry).isVisible(env)).toBeTruthy();
    });
  });

  describe("Insert -> Row below", () => {
    const insertRowAfterPath = ["insert", "insert_row", "insert_row_after"];

    test("A selected row", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getName(insertRowAfterPath, env)).toBe("Row below");
      expect(getNode(insertRowAfterPath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple consecutive selected rows", async () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getName(insertRowAfterPath, env)).toBe("2 Rows below");
      await doAction(insertRowAfterPath, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "ROW",
        base: 5,
        quantity: 2,
        position: "after",
      });
      expect(getNode(insertRowAfterPath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple inconsecutive selected rows", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 6, "newAnchor");
      expect(getNode(insertRowAfterPath, env).isVisible(env)).toBeFalsy();
    });

    test("A selected column should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getNode(insertRowAfterPath, env).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(insertRowAfterPath, env)).toBe("Row below");
      expect(getNode(insertRowAfterPath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(insertRowAfterPath, env)).toBe("2 Rows below");
      await doAction(insertRowAfterPath, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "ROW",
        base: 4,
        quantity: 2,
        position: "after",
      });
      expect(getNode(insertRowAfterPath, env).isVisible(env)).toBeTruthy();
    });
  });

  describe("Insert row below via row menu", () => {
    const addRowAfterPath = ["add_row_after"];

    test("A selected row", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getName(addRowAfterPath, env, rowMenuRegistry)).toBe("Insert row below");
      expect(getNode(addRowAfterPath, env, rowMenuRegistry).isVisible(env)).toBeTruthy();
    });

    test("Multiple consecutive selected rows", async () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getName(addRowAfterPath, env, rowMenuRegistry)).toBe("Insert 2 rows below");
      await doAction(addRowAfterPath, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        dimension: "ROW",
        base: 5,
        quantity: 2,
        position: "after",
      });
      expect(getNode(addRowAfterPath, env, rowMenuRegistry).isVisible(env)).toBeTruthy();
    });

    test("Multiple inconsecutive selected rows", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 6, "newAnchor");
      expect(getNode(addRowAfterPath, env, rowMenuRegistry).isVisible(env)).toBeFalsy();
    });

    test("Full sheet selected", () => {
      selectAll(model);
      expect(getNode(addRowAfterPath, env, rowMenuRegistry).isVisible(env)).toBeTruthy();
    });
  });

  describe("Insert -> Column left", () => {
    const insertColBeforePath = ["insert", "insert_column", "insert_column_before"];

    test("A selected column", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getName(insertColBeforePath, env)).toBe("Column left");
      expect(getNode(insertColBeforePath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple consecutive selected columns", async () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(insertColBeforePath, env)).toBe("2 Columns left");
      await doAction(insertColBeforePath, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        base: 4,
        dimension: "COL",
        quantity: 2,
        position: "before",
      });
      expect(getNode(insertColBeforePath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple inconsecutive selected columns", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 6, "newAnchor");
      expect(getNode(insertColBeforePath, env).isVisible(env)).toBeFalsy();
    });

    test("A selected row should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getNode(insertColBeforePath, env).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(insertColBeforePath, env)).toBe("Column left");
      expect(getNode(insertColBeforePath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(insertColBeforePath, env)).toBe("2 Columns left");
      await doAction(insertColBeforePath, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        base: 3,
        dimension: "COL",
        quantity: 2,
        position: "before",
      });
      expect(getNode(insertColBeforePath, env).isVisible(env)).toBeTruthy();
    });
  });

  describe("Insert column left via column Menu", () => {
    const addColBeforePath = ["add_column_before"];

    test("A selected column", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getName(addColBeforePath, env, colMenuRegistry)).toBe("Insert column left");
      expect(getNode(addColBeforePath, env, colMenuRegistry).isVisible(env)).toBeTruthy();
    });

    test("Multiple consecutive selected columns", async () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(addColBeforePath, env, colMenuRegistry)).toBe("Insert 2 columns left");
      await doAction(addColBeforePath, env, colMenuRegistry);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        base: 4,
        dimension: "COL",
        quantity: 2,
        position: "before",
      });
      expect(getNode(addColBeforePath, env, colMenuRegistry).isVisible(env)).toBeTruthy();
    });

    test("Multiple inconsecutive selected columns", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 6, "newAnchor");
      expect(getNode(addColBeforePath, env, colMenuRegistry).isVisible(env)).toBeFalsy();
    });

    test("Full sheet selected", () => {
      selectAll(model);
      expect(getNode(addColBeforePath, env, colMenuRegistry).isVisible(env)).toBeTruthy();
    });
  });

  describe("Insert -> Column right", () => {
    const insertColAfterPath = ["insert", "insert_column", "insert_column_after"];

    test("A selected column", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getName(insertColAfterPath, env)).toBe("Column right");
      expect(getNode(insertColAfterPath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple consecutive selected columns", async () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(insertColAfterPath, env)).toBe("2 Columns right");
      await doAction(insertColAfterPath, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        base: 5,
        dimension: "COL",
        quantity: 2,
        position: "after",
      });
      expect(getNode(insertColAfterPath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple inconsecutive selected columns", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 6, "newAnchor");
      expect(getNode(insertColAfterPath, env).isVisible(env)).toBeFalsy();
    });

    test("A selected row should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getNode(insertColAfterPath, env).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(insertColAfterPath, env)).toBe("Column right");
      expect(getNode(insertColAfterPath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(insertColAfterPath, env)).toBe("2 Columns right");
      await doAction(insertColAfterPath, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        base: 4,
        dimension: "COL",
        quantity: 2,
        position: "after",
      });
      expect(getNode(insertColAfterPath, env).isVisible(env)).toBeTruthy();
    });
  });

  describe("Insert column right via column menu", () => {
    const addColAfterPath = ["add_column_after"];

    test("A selected column", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getName(addColAfterPath, env, colMenuRegistry)).toBe("Insert column right");
      expect(getNode(addColAfterPath, env, colMenuRegistry).isVisible(env)).toBeTruthy();
    });

    test("Multiple consecutive selected columns", async () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(addColAfterPath, env, colMenuRegistry)).toBe("Insert 2 columns right");
      await doAction(addColAfterPath, env, colMenuRegistry);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        sheetName: env.model.getters.getActiveSheetName(),
        base: 5,
        dimension: "COL",
        quantity: 2,
        position: "after",
      });
      expect(getNode(addColAfterPath, env, colMenuRegistry).isVisible(env)).toBeTruthy();
    });

    test("Multiple inconsecutive selected columns", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 6, "newAnchor");
      expect(getNode(addColAfterPath, env, colMenuRegistry).isVisible(env)).toBeFalsy();
    });

    test("Full sheet selected", () => {
      selectAll(model);
      expect(getNode(addColAfterPath, env, colMenuRegistry).isVisible(env)).toBeTruthy();
    });
  });

  describe("Insert -> Insert cells and shift down", () => {
    const insertCellShiftDownPath = ["insert", "insert_cell", "insert_cell_down"];

    test("A selected row should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getNode(insertCellShiftDownPath, env).isVisible(env)).toBeFalsy();
    });

    test("A selected column should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getNode(insertCellShiftDownPath, env).isVisible(env)).toBeFalsy();
    });

    test("Multiple consecutive selected columns should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getNode(insertCellShiftDownPath, env).isVisible(env)).toBeFalsy();
    });

    test("Multiple inconsecutive selected columns should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 6, "newAnchor");
      expect(getNode(insertCellShiftDownPath, env).isVisible(env)).toBeFalsy();
    });

    test("Multiple consecutive selected rows should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getNode(insertCellShiftDownPath, env).isVisible(env)).toBeFalsy();
    });

    test("Multiple inconsecutive selected rows should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 6, "newAnchor");
      expect(getNode(insertCellShiftDownPath, env).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", async () => {
      selectCell(model, "D4");
      expect(getName(insertCellShiftDownPath, env)).toBe("Shift down");
      await doAction(insertCellShiftDownPath, env);
      expect(dispatch).toHaveBeenLastCalledWith("INSERT_CELL", {
        zone: env.model.getters.getSelectedZone(),
        shiftDimension: "ROW",
      });
      expect(getNode(insertCellShiftDownPath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(insertCellShiftDownPath, env)).toBe("Shift down");
      await doAction(insertCellShiftDownPath, env);
      expect(dispatch).toHaveBeenLastCalledWith("INSERT_CELL", {
        zone: env.model.getters.getSelectedZone(),
        shiftDimension: "ROW",
      });
      expect(getNode(insertCellShiftDownPath, env).isVisible(env)).toBeTruthy();
    });
  });

  describe("Insert -> Insert cells and shift right", () => {
    const insertCellShiftRightPath = ["insert", "insert_cell", "insert_cell_right"];

    test("A selected row should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getNode(insertCellShiftRightPath, env).isVisible(env)).toBeFalsy();
    });

    test("A selected column should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getNode(insertCellShiftRightPath, env).isVisible(env)).toBeFalsy();
    });

    test("Multiple consecutive selected columns should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getNode(insertCellShiftRightPath, env).isVisible(env)).toBeFalsy();
    });

    test("Multiple inconsecutive selected columns should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 6, "newAnchor");
      expect(getNode(insertCellShiftRightPath, env).isVisible(env)).toBeFalsy();
    });

    test("Multiple consecutive selected rows should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getNode(insertCellShiftRightPath, env).isVisible(env)).toBeFalsy();
    });

    test("Multiple inconsecutive selected rows should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 6, "newAnchor");
      expect(getNode(insertCellShiftRightPath, env).isVisible(env)).toBeFalsy();
    });

    test("A selected cell", async () => {
      selectCell(model, "D4");
      expect(getName(insertCellShiftRightPath, env)).toBe("Shift right");
      await doAction(insertCellShiftRightPath, env);
      expect(dispatch).toHaveBeenLastCalledWith("INSERT_CELL", {
        zone: env.model.getters.getSelectedZone(),
        shiftDimension: "COL",
      });
      expect(getNode(insertCellShiftRightPath, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(insertCellShiftRightPath, env)).toBe("Shift right");
      await doAction(insertCellShiftRightPath, env);
      expect(dispatch).toHaveBeenLastCalledWith("INSERT_CELL", {
        zone: env.model.getters.getSelectedZone(),
        shiftDimension: "COL",
      });
      expect(getNode(insertCellShiftRightPath, env).isVisible(env)).toBeTruthy();
    });
  });

  test("Insert -> new sheet", async () => {
    const activeSheetId = env.model.getters.getActiveSheetId();
    await doAction(["insert", "insert_sheet"], env);
    const newSheetId = env.model.getters.getSheetIds()[1];
    expect(dispatch).toHaveBeenNthCalledWith(1, "CREATE_SHEET", {
      sheetId: newSheetId,
      name: "Sheet2",
      position: 1,
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, "ACTIVATE_SHEET", {
      sheetIdTo: newSheetId,
      sheetIdFrom: activeSheetId,
    });
  });

  test("Insert -> Function", async () => {
    const spyStartCell = jest.spyOn(env, "startCellEdition");
    await doAction(["insert", "insert_function", "insert_function_sum"], env);
    expect(spyStartCell).toHaveBeenCalled();
  });

  test("Insert -> Function -> All includes new functions", () => {
    addToRegistry(functionRegistry, "TEST.FUNC", {
      args: [],
      compute: () => 42,
      description: "Test function",
    });
    const env = makeTestEnv();
    const allFunctions = getNode(
      ["insert", "insert_function", "categorie_function_all"],
      env
    ).children(env);
    expect(allFunctions.map((f) => f.name(env))).toContain("TEST.FUNC");
  });

  test("Insert -> Checkbox", async () => {
    selectCell(model, "A1");
    await doAction(["insert", "insert_checkbox"], env);
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { criterion: { type: "isBoolean" }, ranges: ["A1"] },
    ]);
    expect(getCellContent(model, "A1")).toEqual("FALSE");
  });

  test("Insert -> Function -> hidden formulas are filtered out", () => {
    clearFunctions();
    addToRegistry(functionRegistry, "HIDDEN.FUNC", {
      args: [],
      compute: () => 42,
      description: "Test function",
      hidden: true,
      category: "hidden",
    });
    const env = makeTestEnv();
    const functionCategories = getNode(["insert", "insert_function"], env).children(env);
    expect(functionCategories.map((f) => f.name(env))).not.toContain("hidden");
    const allFunctions = getNode(
      ["insert", "insert_function", "categorie_function_all"],
      env
    ).children(env);
    expect(allFunctions.map((f) => f.name(env))).not.toContain("HIDDEN.FUNC");
  });

  describe("Format -> numbers", () => {
    test("Automatic", () => {
      const action = getNode(["format", "format_number", "format_number_automatic"], env);
      action.execute?.(env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: "",
      });
      expect(action.isActive?.(env)).toBe(true);
    });

    test("Number", () => {
      const action = getNode(["format", "format_number", "format_number_number"], env);
      expect(action.isActive?.(env)).toBe(false);
      action.execute?.(env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: "#,##0.00",
      });
      expect(action.isActive?.(env)).toBe(true);
    });

    test.each([
      ["format_number_number", "1,000.12"],
      ["format_number_percent", "10.12%"],
      ["format_number_currency", "$1,000.12"],
      ["format_number_currency_rounded", "$1,000"],
      ["format_number_date", "9/26/2023"],
      ["format_number_time", "10:43:00 PM"],
      ["format_number_date_time", "9/26/2023 10:43:00 PM"],
      ["format_number_duration", "27:51:38"],
    ])("number formatting description with default locale", (actionId, expectedDescription) => {
      const action = getNode(["format", "format_number", actionId], env);
      expect(action.description(env)).toBe(expectedDescription);
    });

    test.each([
      ["format_number_number", "1 000,12"],
      ["format_number_percent", "10,12%"],
      ["format_number_currency", "$1 000,12"],
      ["format_number_currency_rounded", "$1 000"],
      ["format_number_date", "26/09/2023"],
      ["format_number_time", "22:43:00"],
      ["format_number_date_time", "26/09/2023 22:43:00"],
      ["format_number_duration", "27:51:38"],
    ])("number formatting description with custom locale", (actionId, expectedDescription) => {
      updateLocale(model, FR_LOCALE);
      const action = getNode(["format", "format_number", actionId], env);
      expect(action.description(env)).toBe(expectedDescription);
    });

    test("Percent", async () => {
      await doAction(["format", "format_number", "format_number_percent"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: "0.00%",
      });
    });

    test("currency format with default currency", () => {
      const action = getNode(["format", "format_number", "format_number_currency"], env);
      expect(action.description(env)).toBe("$1,000.12");
      action.execute?.(env);
      expect(getCell(model, "A1")?.format).toBe("[$$]#,##0.00");
    });

    test("rounded currency format with default currency", () => {
      const action = getNode(["format", "format_number", "format_number_currency_rounded"], env);
      expect(action.description(env)).toBe("$1,000");
      action.execute?.(env);
      expect(getCell(model, "A1")?.format).toBe("[$$]#,##0");
    });

    test("currency format with custom default currency", () => {
      const model = createModel({}, { defaultCurrency: TEST_CURRENCY });
      env = makeTestEnv({ model });
      const action = getNode(["format", "format_number", "format_number_currency"], env);
      expect(action.description(env)).toBe("€1,000.120");
      action.execute?.(env);
      expect(getCell(model, "A1")?.format).toBe("[$€]#,##0.000");
    });

    test("rounded currency format with custom default currency", () => {
      const model = createModel({}, { defaultCurrency: TEST_CURRENCY });
      env = makeTestEnv({ model });
      const action = getNode(["format", "format_number", "format_number_currency_rounded"], env);
      expect(action.description(env)).toBe("€1,000");
      action.execute?.(env);
      expect(getCell(model, "A1")?.format).toBe("[$€]#,##0");
    });

    test("rounded currency format is invisible if the custom default format is already rounded", () => {
      const model = createModel({}, { defaultCurrency: { decimalPlaces: 0 } });
      env = makeTestEnv({ model });
      const action = getNode(["format", "format_number", "format_number_currency_rounded"], env);
      expect(action.isVisible(env)).toBe(false);
    });

    test("currency format description with locale and custom default currency", () => {
      const model = createModel({}, { defaultCurrency: TEST_CURRENCY });
      env = makeTestEnv({ model });
      updateLocale(model, FR_LOCALE);
      const action = getNode(["format", "format_number", "format_number_currency"], env);
      expect(action.description(env)).toBe("€1 000,120");
    });

    test("accounting format menu item", () => {
      const model = createModel({}, { defaultCurrency: { ...TEST_CURRENCY, decimalPlaces: 0 } });
      env = makeTestEnv({ model });
      const action = getNode(["format", "format_number", "format_number_accounting"], env);
      expect(action.isVisible(env)).toBe(true);
      action.execute?.(env);
      expect(getCell(model, "A1")?.format).toBe("[$€]*  #,##0 ;[$€]* (#,##0);[$€]*   -  ");
    });

    test.each(DEFAULT_LOCALES)("Date", async (locale) => {
      env.model.dispatch("UPDATE_LOCALE", { locale });
      await doAction(["format", "format_number", "format_number_date"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: locale.dateFormat,
      });
    });

    test.each(DEFAULT_LOCALES)("Time", async (locale) => {
      env.model.dispatch("UPDATE_LOCALE", { locale });
      await doAction(["format", "format_number", "format_number_time"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: locale.timeFormat,
      });
    });

    test.each(DEFAULT_LOCALES)("Date time", async (locale) => {
      env.model.dispatch("UPDATE_LOCALE", { locale });
      await doAction(["format", "format_number", "format_number_date_time"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: `${locale.dateFormat} ${locale.timeFormat}`,
      });
    });

    test("Duration", async () => {
      await doAction(["format", "format_number", "format_number_duration"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        format: "hhhh:mm:ss",
      });
    });

    test("Custom formats", async () => {
      const spyOpenSidePanel = jest.spyOn(env, "openSidePanel");

      await doAction(["format", "format_number", "format_custom_currency"], env);
      expect(spyOpenSidePanel).toHaveBeenCalledWith("MoreFormats", { category: "currency" });

      await doAction(["format", "format_number", "format_custom_date"], env);
      expect(spyOpenSidePanel).toHaveBeenCalledWith("MoreFormats", { category: "date" });

      await doAction(["format", "format_number", "format_custom_number"], env);
      expect(spyOpenSidePanel).toHaveBeenCalledWith("MoreFormats", { category: "number" });
    });

    test("Automatic format is active when format is computed", () => {
      selectCell(env.model, "A1");
      setCellContent(env.model, "A1", "1");
      const setNumberFormatAction = getNode(
        ["format", "format_number", "format_number_number"],
        env
      );
      const setAutoFormatAction = getNode(
        ["format", "format_number", "format_number_automatic"],
        env
      );
      setNumberFormatAction.execute?.(env);
      expect(getCell(model, "A1")?.format).toBe("#,##0.00");
      setCellContent(env.model, "B1", "=A1");
      expect(getCell(model, "B1")?.format).toBeUndefined();
      expect(getEvaluatedCell(model, "B1")?.format).toBe("#,##0.00");
      selectCell(env.model, "B1");
      expect(setAutoFormatAction.isActive?.(env)).toBe(true);
      expect(setNumberFormatAction.isActive?.(env)).toBe(false);
    });

    test("cancel edition when setting a format", async () => {
      const composerStore = env.getStore(CellComposerStore);
      composerStore.startEdition("hello");
      expect(composerStore.editionMode).toBe("editing");
      await doAction(["format", "format_number", "format_number_percent"], env);
      expect(composerStore.editionMode).toBe("inactive");
      expect(getCellContent(model, "A1")).toBe("");
    });

    describe("Custom number formats", () => {
      function getNumberFormatsInMenu() {
        return getNode(["format", "format_number"], env)
          .children(env)
          .map((node) => node.name(env));
      }

      test("Custom date and currency formats are present in the number format item", () => {
        expect(getNumberFormatsInMenu()).not.toContain("#.##0[$£]");
        setFormat(model, "A1", "#.##0[$£]");
        expect(getNumberFormatsInMenu()).toContain("#.##0[$£]");

        expect(getNumberFormatsInMenu()).not.toContain("dd/mm/yyyy");
        setFormat(model, "A1", "dd/mm/yyyy");
        expect(getNumberFormatsInMenu()).toContain("dd/mm/yyyy");
      });

      test("Custom formats that are nether dates nor currencies are not present", () => {
        setFormat(model, "A1", "#.####0");
        expect(getNumberFormatsInMenu()).not.toContain("#.####0");
      });

      test("Default formats are not re-added in custom formats", () => {
        setFormat(model, "A1", "m/d/yyyy");
        expect(getNumberFormatsInMenu()).not.toContain("m/d/yyyy");
      });
    });
  });

  test("Format -> bold", async () => {
    await doAction(["format", "format_bold"], env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      style: { bold: true },
    });
  });

  test("Format -> italic", async () => {
    await doAction(["format", "format_italic"], env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      style: { italic: true },
    });
  });

  test("Format -> underline", async () => {
    await doAction(["format", "format_underline"], env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      style: { underline: true },
    });
  });

  test("Format -> strikethrough", async () => {
    await doAction(["format", "format_strikethrough"], env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      style: { strikethrough: true },
    });
  });

  test("Format -> font-size", async () => {
    const fontSize = FONT_SIZES[0];
    await doAction(["format", "format_font_size", `font_size_${fontSize}`], env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      style: { fontSize },
    });
  });

  describe("Format -> Alignment", () => {
    test("Left", async () => {
      await doAction(["format", "format_alignment", "format_alignment_left"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        style: { align: "left" },
      });
    });

    test("Center", async () => {
      await doAction(["format", "format_alignment", "format_alignment_center"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        style: { align: "center" },
      });
    });

    test("Right", async () => {
      await doAction(["format", "format_alignment", "format_alignment_right"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        style: { align: "right" },
      });
    });

    test("Top", async () => {
      await doAction(["format", "format_alignment", "format_alignment_top"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        style: { verticalAlign: "top" },
      });
    });

    test("Middle", async () => {
      await doAction(["format", "format_alignment", "format_alignment_middle"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        style: { verticalAlign: "middle" },
      });
    });

    test("Bottom", async () => {
      await doAction(["format", "format_alignment", "format_alignment_bottom"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        style: { verticalAlign: "bottom" },
      });
    });
  });

  describe("Format -> wrapping", () => {
    test("Overflow", async () => {
      await doAction(["format", "format_wrapping", "format_wrapping_overflow"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        style: { wrapping: "overflow" },
      });
    });

    test("Wrap", async () => {
      await doAction(["format", "format_wrapping", "format_wrapping_wrap"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        style: { wrapping: "wrap" },
      });
    });

    test("Clip", async () => {
      await doAction(["format", "format_wrapping", "format_wrapping_clip"], env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.model.getters.getActiveSheetId(),
        target: env.model.getters.getSelectedZones(),
        style: { wrapping: "clip" },
      });
    });
  });

  test("Data -> Split to columns action", async () => {
    const spyOpenSidePanel = jest.spyOn(env, "openSidePanel");
    await doAction(["data", "split_to_columns"], env);
    expect(spyOpenSidePanel).toHaveBeenCalledWith("SplitToColumns", {});
  });

  test("Data -> Split to columns is disabled when multiple cols are selected", () => {
    setSelection(model, ["A1"]);
    expect(getNode(["data", "split_to_columns"], env).isEnabled(env)).toBeTruthy();

    setSelection(model, ["A1:C1"]);
    expect(getNode(["data", "split_to_columns"], env).isEnabled(env)).toBeFalsy();

    setSelection(model, ["A1", "B1"]);
    expect(getNode(["data", "split_to_columns"], env).isEnabled(env)).toBeFalsy();
  });

  test("Data -> Sort ascending", async () => {
    await doAction(["data", "sort_range", "sort_ascending"], env);
    const { anchor, zones } = env.model.getters.getSelection();
    expect(dispatch).toHaveBeenCalledWith("SORT_CELLS", {
      sheetId: env.model.getters.getActiveSheetId(),
      ...anchor.cell,
      zone: zones[0],
      sortDirection: "asc",
    });
  });

  test("Data -> Sort descending", async () => {
    await doAction(["data", "sort_range", "sort_descending"], env);
    const { anchor, zones } = env.model.getters.getSelection();
    expect(dispatch).toHaveBeenCalledWith("SORT_CELLS", {
      sheetId: env.model.getters.getActiveSheetId(),
      ...anchor.cell,
      zone: zones[0],
      sortDirection: "desc",
    });
  });

  describe("Data -> Sort", () => {
    const pathSort = ["data", "sort_range"];

    test("A selected zone", () => {
      setSelection(model, ["A1:A2"]);
      expect(getName(pathSort, env)).toBe("Sort range");
      expect(getNode(pathSort, env).isVisible(env)).toBeTruthy();
    });

    test("Multiple selected zones", () => {
      setSelection(model, ["A1:A2", "B1:B2"]);
      expect(getNode(pathSort, env).isVisible(env)).toBeFalsy();
    });
  });
  describe("Hide/Unhide Columns", () => {
    const hidePath = ["hide_columns"];
    const unhidePath = ["unhide_columns"];
    test("Action on single column selection", async () => {
      selectColumn(model, 1, "overrideSelection");
      expect(getName(hidePath, env, colMenuRegistry)).toBe("Hide column B");
      expect(getNode(hidePath, env, colMenuRegistry).isVisible(env)).toBeTruthy();
      await doAction(hidePath, env, colMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [1],
        dimension: "COL",
      });
    });
    test("Action with at least one active column", async () => {
      setSelection(model, ["B1:B100", "C5"]);
      expect(getName(hidePath, env, colMenuRegistry)).toBe("Hide columns B - C");
      expect(getNode(hidePath, env, colMenuRegistry).isVisible(env)).toBeTruthy();
      await doAction(hidePath, env, colMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [1, 2],
        dimension: "COL",
      });
    });
    test("Action without any active column", async () => {
      setSelection(model, ["B1"]);
      expect(getName(hidePath, env, colMenuRegistry)).toBe("Hide columns");
      expect(getNode(hidePath, env, colMenuRegistry).isVisible(env)).toBeTruthy();
      await doAction(hidePath, env, colMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [],
        dimension: "COL",
      });
    });

    test("Inactive menu item on invalid selection", () => {
      setSelection(model, ["A1:A100", "A4:Z4"]);
      expect(getNode(hidePath, env, colMenuRegistry).isVisible(env)).toBeFalsy();
    });

    test("Unhide cols from Col menu", async () => {
      hideColumns(model, ["C"]);
      setSelection(model, ["B1:E100"]);
      expect(getNode(unhidePath, env, colMenuRegistry).isVisible(env)).toBeTruthy();
      await doAction(unhidePath, env, colMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [1, 2, 3, 4],
        dimension: "COL",
      });
    });
    test("Unhide rows from Col menu without hidden cols", () => {
      setSelection(model, ["B1:E100"]);
      expect(getNode(unhidePath, env, colMenuRegistry).isVisible(env)).toBeFalsy();
    });
    test("Unhide all cols from top menu", async () => {
      // no hidden rows
      expect(getNode(["edit", "edit_unhide_columns"], env).isVisible(env)).toBeFalsy();
      hideColumns(model, ["C"]);
      expect(getNode(["edit", "edit_unhide_columns"], env).isVisible(env)).toBeTruthy();
      await doAction(["edit", "edit_unhide_columns"], env);
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
    test("Action on single row selection", async () => {
      selectRow(model, 1, "overrideSelection");
      expect(getName(hidePath, env, rowMenuRegistry)).toBe("Hide row 2");
      expect(getNode(hidePath, env, rowMenuRegistry).isVisible(env)).toBeTruthy();
      await doAction(hidePath, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [1],
        dimension: "ROW",
      });
    });
    test("Action with at least one active row", async () => {
      setSelection(model, ["A2:Z2", "C3"]);
      expect(getName(hidePath, env, rowMenuRegistry)).toBe("Hide rows 2 - 3");
      expect(getNode(hidePath, env, rowMenuRegistry).isVisible(env)).toBeTruthy();
      await doAction(hidePath, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [1, 2],
        dimension: "ROW",
      });
    });
    test("Action without any active column", async () => {
      setSelection(model, ["B1"]);
      expect(getName(hidePath, env, rowMenuRegistry)).toBe("Hide rows");
      expect(getNode(hidePath, env, rowMenuRegistry).isVisible(env)).toBeTruthy();
      await doAction(hidePath, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [],
        dimension: "ROW",
      });
    });

    test("Inactive menu item on invalid selection", () => {
      setSelection(model, ["A1:A100", "A4:Z4"]);
      expect(getNode(hidePath, env, rowMenuRegistry).isVisible(env)).toBeFalsy();
    });

    test("Unhide rows from Row menu with hidden rows", async () => {
      hideRows(model, [2]);
      setSelection(model, ["A1:Z4"]);
      expect(getNode(unhidePath, env, rowMenuRegistry).isVisible(env)).toBeTruthy();
      await doAction(unhidePath, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
        elements: [0, 1, 2, 3],
        dimension: "ROW",
      });
    });
    test("Unhide rows from Row menu without hidden rows", () => {
      setSelection(model, ["A1:Z4"]);
      expect(getNode(unhidePath, env, rowMenuRegistry).isVisible(env)).toBeFalsy();
    });

    test("Unhide all rows from top menu", async () => {
      // no hidden rows
      expect(getNode(["edit", "edit_unhide_rows"], env).isVisible(env)).toBeFalsy();
      hideRows(model, [2]);
      expect(getNode(["edit", "edit_unhide_rows"], env).isVisible(env)).toBeTruthy();
      await doAction(["edit", "edit_unhide_rows"], env);
      const sheetId = env.model.getters.getActiveSheetId();
      expect(dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
        sheetId,
        elements: Array.from(Array(model.getters.getNumberRows(sheetId)).keys()),
        dimension: "ROW",
      });
    });

    test("Hide row option unavailable when selecting all rows with folded row grouping", () => {
      const lastRow = model.getters.getNumberRows(sheetId) - 1;

      groupHeaders(model, "ROW", 0, 2, sheetId);
      foldHeaderGroup(model, "ROW", 0, 2, sheetId);

      selectRow(model, 3, "newAnchor");
      selectRow(model, lastRow, "updateAnchor");
      expect(getNode(hidePath, env, rowMenuRegistry).isVisible(env)).toBeFalsy();
    });

    describe("Table and filters", () => {
      const filterPath = ["data", "add_remove_data_filter"];
      const insertTablePath = ["insert", "insert_table"];
      const editTablePath = ["edit", "edit_table"];

      test("Insert -> Table", async () => {
        setSelection(model, ["A1:A5"]);
        expect(getName(insertTablePath, env)).toBe("Table");
        await doAction(insertTablePath, env);
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { zone: toZone("A1:A5") },
        });
      });

      test("Insert -> Table on a whole column make it into an unbounded zone", async () => {
        setSelection(model, ["A1:A100"]);
        expect(getName(insertTablePath, env)).toBe("Table");
        await doAction(insertTablePath, env);
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { unboundedZone: toUnboundedZone("A:A") },
        });
      });

      test("Insert -> Table is not visible if there is already a table in the selection, or if the selection is not continuous", () => {
        setSelection(model, ["A1", "B2"]);
        expect(getNode(insertTablePath, env).isVisible(env)).toBeFalsy();

        setSelection(model, ["A1:A5"]);
        expect(getNode(insertTablePath, env).isVisible(env)).toBeTruthy();

        createTable(model, "A1:A5");
        expect(getNode(insertTablePath, env).isVisible(env)).toBeFalsy();
      });

      test("Insert -> Table creates a dynamic table if it's called on a spreading cell", async () => {
        setCellContent(model, "A1", "=MUNIT(5)");
        setSelection(model, ["A1"]);
        await doAction(insertTablePath, env);
        expect(model.getters.getCoreTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { zone: toZone("A1") },
          type: "dynamic",
        });
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { zone: toZone("A1:E5") },
        });
      });

      test("Insert -> select the whole spreading zone and create a dynamic if it is called on a single spreaded cell", async () => {
        setCellContent(model, "A1", "=MUNIT(5)");
        setSelection(model, ["B1"]);
        await doAction(insertTablePath, env);
        expect(model.getters.getSelectedZone()).toEqual(toZone("A1:E5"));
        expect(model.getters.getCoreTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { zone: toZone("A1") },
          type: "dynamic",
        });
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { zone: toZone("A1:E5") },
        });
      });

      test("Insert -> Table creates a dynamic table if it's called on all the spreading cells of a formula", async () => {
        setCellContent(model, "A1", "=MUNIT(5)");
        setSelection(model, ["A1:E5"]);
        await doAction(insertTablePath, env);
        expect(model.getters.getCoreTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { zone: toZone("A1") },
          type: "dynamic",
        });
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { zone: toZone("A1:E5") },
        });
      });

      test("Insert -> Table creates a dynamic table if it's called on a #SPILL! error", async () => {
        setCellContent(model, "A1", "=MUNIT(500)");
        setSelection(model, ["A1"]);
        expect(getEvaluatedCell(model, "A1")?.value).toBe("#SPILL!");
        await doAction(insertTablePath, env);
        expect(model.getters.getCoreTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { zone: toZone("A1") },
          type: "dynamic",
        });
      });

      test("Insert -> Table do not creates a dynamic table if it's called on cell referencing a #SPILL! error", async () => {
        setCellContent(model, "A1", "=A3");
        setCellContent(model, "A3", "=MUNIT(500)");
        expect(getEvaluatedCell(model, "A1")?.value).toBe("#SPILL!");
        setSelection(model, ["A1"]);
        await doAction(insertTablePath, env);
        expect(model.getters.getCoreTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { zone: toZone("A1") },
          type: "static",
        });
      });

      test("Edit -> Table (topbar)", async () => {
        const spyOpenSidePanel = jest.spyOn(env, "openSidePanel");
        createTable(model, "A1:A5");
        expect(getName(editTablePath, env)).toBe("Edit table");
        await doAction(editTablePath, env);
        expect(spyOpenSidePanel).toHaveBeenCalledWith("TableSidePanel", {});
      });

      test("Edit -> Table (topbar) is not visible if there is no table in the selection", () => {
        expect(getNode(editTablePath, env).isVisible(env)).toBeFalsy();
        createTable(model, "A1:A5");
        expect(getNode(editTablePath, env).isVisible(env)).toBeTruthy();
      });

      test("Edit table (cellRegistry)", async () => {
        const spyOpenSidePanel = jest.spyOn(env, "openSidePanel");
        createTable(model, "A1:A5");
        expect(getName(["edit_table"], env, cellMenuRegistry)).toBe("Edit table");
        await doAction(["edit_table"], env, cellMenuRegistry);
        expect(spyOpenSidePanel).toHaveBeenCalledWith("TableSidePanel", {});
      });

      test("Delete table (cellRegistry)", async () => {
        createTable(model, "A1:A5");
        expect(getName(["delete_table"], env, cellMenuRegistry)).toBe("Delete table");
        await doAction(["delete_table"], env, cellMenuRegistry);
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toBeUndefined();
      });

      test("Delete table (cellRegistry) on a dynamic table", async () => {
        setCellContent(model, "A1", "=MUNIT(5)");
        createDynamicTable(model, "A1");
        setSelection(model, ["C3"]);
        await doAction(["delete_table"], env, cellMenuRegistry);
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toBeUndefined();
      });

      test("Edit/delete table (cellRegistry) visible only with a single table in the selection", () => {
        expect(getNode(["edit_table"], env, cellMenuRegistry).isVisible(env)).toBeFalsy();
        expect(getNode(["delete_table"], env, cellMenuRegistry).isVisible(env)).toBeFalsy();

        createTable(model, "A1:A5");
        expect(getNode(["edit_table"], env, cellMenuRegistry).isVisible(env)).toBeTruthy();
        expect(getNode(["delete_table"], env, cellMenuRegistry).isVisible(env)).toBeTruthy();

        setSelection(model, ["A1:B5"]);
        expect(getNode(["edit_table"], env, cellMenuRegistry).isVisible(env)).toBeTruthy();
        expect(getNode(["delete_table"], env, cellMenuRegistry).isVisible(env)).toBeTruthy();

        createTable(model, "B1:B5");
        expect(getNode(["edit_table"], env, cellMenuRegistry).isVisible(env)).toBeFalsy();
        expect(getNode(["delete_table"], env, cellMenuRegistry).isVisible(env)).toBeFalsy();
      });

      test("Filters -> Create filter", async () => {
        setSelection(model, ["A1:A5"]);
        expect(getName(filterPath, env)).toBe("Add filters");
        await doAction(filterPath, env);
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { zone: toZone("A1:A5") },
          config: { hasFilters: true },
        });
      });

      test("Filters -> Add filters on existing table", async () => {
        createTable(model, "A1:A5");
        updateTableConfig(model, "A1:A5", { hasFilters: false });
        await doAction(filterPath, env);
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })?.config.hasFilters).toBe(true);
      });

      test("Filters -> Remove filter", async () => {
        createTableWithFilter(model, "A1:A5");
        setSelection(model, ["A1:A5"]);
        expect(getName(filterPath, env)).toBe("Remove selected filters");
        await doAction(filterPath, env);
        const table = model.getters.getTable({ sheetId, row: 0, col: 0 });
        expect(table?.config.hasFilters).toBe(false);
      });

      test("Filters -> Add/Remove filters with multiple table in the selection works only on first table", async () => {
        createTable(model, "A1:A5");
        createTable(model, "B1:B5");
        updateTableConfig(model, "A1:A5", { hasFilters: false });
        updateTableConfig(model, "B1:B5", { hasFilters: false });

        setSelection(model, ["A1:B5"]);
        await doAction(filterPath, env);
        expect(model.getters.getTables(sheetId)).toMatchObject([
          { range: { zone: toZone("A1:A5") }, config: { hasFilters: true } },
          { range: { zone: toZone("B1:B5") }, config: { hasFilters: false } },
        ]);

        await doAction(filterPath, env);
        expect(model.getters.getTables(sheetId)).toMatchObject([
          { range: { zone: toZone("A1:A5") }, config: { hasFilters: false } },
          { range: { zone: toZone("B1:B5") }, config: { hasFilters: false } },
        ]);
      });

      test("Filters -> Create filter is disabled when the selection is not continuous", () => {
        setSelection(model, ["A1", "B6"]);
        expect(getNode(filterPath, env).isVisible(env)).toBeTruthy();
        expect(getNode(filterPath, env).isEnabled(env)).toBeFalsy();
      });

      test("Filters -> Create filter is enabled for continuous selection of multiple zones", () => {
        setSelection(model, ["A1", "A2:A5", "B1:B5"]);
        expect(getNode(filterPath, env).isVisible(env)).toBeTruthy();
        expect(getNode(filterPath, env).isEnabled(env)).toBeTruthy();
      });

      test("Filters -> Remove filter is displayed instead of add filter when the selection contains a filter", () => {
        setSelection(model, ["A1:A5"]);
        expect(getName(filterPath, env)).toBe("Add filters");

        createTableWithFilter(model, "A1:B5");
        expect(getName(filterPath, env)).toBe("Remove selected filters");

        setSelection(model, ["A1:B9"]);
        expect(getName(filterPath, env)).toBe("Remove selected filters");
      });
    });

    test("Insert -> Carousel", async () => {
      expect(getName(["insert", "insert_carousel"], env)).toBe("Carousel");
      await doAction(["insert", "insert_carousel"], env);
      expect(model.getters.getFigures(model.getters.getActiveSheetId())[0]).toMatchObject({
        tag: "carousel",
      });
    });
  });

  test("View -> Set gridlines visibility", async () => {
    const path_gridlines = ["view", "show", "view_gridlines"];
    const sheetId = model.getters.getActiveSheetId();

    setGridLinesVisibility(model, true);

    expect(getName(path_gridlines, env)).toBe("Gridlines");
    expect(getNode(path_gridlines, env).isVisible(env)).toBeTruthy();
    expect(getNode(path_gridlines, env).isActive?.(env)).toBeTruthy();

    setGridLinesVisibility(model, false);
    expect(getName(path_gridlines, env)).toBe("Gridlines");
    expect(getNode(path_gridlines, env).isVisible(env)).toBeTruthy();
    expect(getNode(path_gridlines, env).isActive?.(env)).toBeFalsy();

    await doAction(path_gridlines, env);
    expect(dispatch).toHaveBeenCalledWith("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: true,
    });
    setGridLinesVisibility(model, true);

    await doAction(path_gridlines, env);
    expect(dispatch).toHaveBeenCalledWith("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: false,
    });
  });

  test("View -> show formulas", async () => {
    const path_formulas = ["view", "show", "view_formulas"];
    expect(model.getters.shouldShowFormulas()).toBe(false);

    expect(getName(path_formulas, env)).toBe("Formulas");
    expect(getNode(path_formulas, env).isVisible(env)).toBeTruthy();
    expect(getNode(path_formulas, env).isActive?.(env)).toBeFalsy();
    await doAction(path_formulas, env);
    expect(model.getters.shouldShowFormulas()).toBe(true);

    expect(getName(path_formulas, env)).toBe("Formulas");
    expect(getNode(path_formulas, env).isVisible(env)).toBeTruthy();
    expect(getNode(path_formulas, env).isActive?.(env)).toBeTruthy();
    await doAction(path_formulas, env);
    expect(model.getters.shouldShowFormulas()).toBe(false);
  });

  describe("View -> group headers", () => {
    const groupColsPath = ["view", "group_headers", "group_columns"];
    const groupRowsPath = ["view", "group_headers", "group_rows"];
    const ungroupColsPath = ["view", "group_headers", "ungroup_columns"];
    const ungroupRowsPath = ["view", "group_headers", "ungroup_rows"];

    test("Can group columns", async () => {
      setSelection(model, ["A1:C3"]);
      expect(getName(groupColsPath, env)).toBe("Group columns A - C");
      await doAction(groupColsPath, env);
      expect(model.getters.getHeaderGroups(sheetId, "COL")[0]).toMatchObject({
        start: 0,
        end: 2,
      });
    });

    test("Cannot group multiple selections", () => {
      setSelection(model, ["A1:B3", "C1:C3"]);
      expect(getNode(groupColsPath, env).isVisible(env)).toBeFalsy();
    });

    test("Cannot re-group same selection of columns", () => {
      setSelection(model, ["A1:B3"]);
      getNode(groupColsPath, env).execute?.(env);
      expect(getNode(groupColsPath, env).isVisible(env)).toBeFalsy();
    });

    test("Can ungroup columns", async () => {
      groupColumns(model, "A", "C");
      setSelection(model, ["A1:C3"]);
      expect(getName(ungroupColsPath, env)).toBe("Ungroup columns A - C");
      await doAction(ungroupColsPath, env);
      expect(model.getters.getHeaderGroups(sheetId, "COL")).toHaveLength(0);
    });

    test("Cannot ungroup columns when there's no group in the selection", () => {
      setSelection(model, ["A1:C3"]);
      expect(getNode(ungroupColsPath, env).isVisible(env)).toBeFalsy();

      groupColumns(model, "A", "C");
      expect(getNode(ungroupColsPath, env).isVisible(env)).toBeTruthy();
    });

    test("Can group rows", async () => {
      setSelection(model, ["A1:C3"]);
      expect(getName(groupRowsPath, env)).toBe("Group rows 1 - 3");
      await doAction(groupRowsPath, env);
      expect(model.getters.getHeaderGroups(sheetId, "ROW")[0]).toMatchObject({
        start: 0,
        end: 2,
      });
    });

    test("Cannot group multiple selections", () => {
      setSelection(model, ["A1:C1", "A2:C2"]);
      expect(getNode(groupRowsPath, env).isVisible(env)).toBeFalsy();
    });

    test("Cannot re-group same selection of rows", () => {
      setSelection(model, ["A1:B3"]);
      getNode(groupRowsPath, env).execute?.(env);
      expect(getNode(groupRowsPath, env).isVisible(env)).toBeFalsy();
    });

    test("Can ungroup rows", async () => {
      groupRows(model, 0, 2);
      setSelection(model, ["A1:C3"]);
      expect(getName(ungroupRowsPath, env)).toBe("Ungroup rows 1 - 3");
      await doAction(ungroupRowsPath, env);
      expect(model.getters.getHeaderGroups(sheetId, "ROW")).toHaveLength(0);
    });

    test("Cannot ungroup rows when there's no group in the selection", () => {
      setSelection(model, ["A1:C3"]);
      expect(getNode(ungroupRowsPath, env).isVisible(env)).toBeFalsy();

      groupRows(model, 0, 2);
      expect(getNode(ungroupRowsPath, env).isVisible(env)).toBeTruthy();
    });
  });

  describe("Freeze rows and columns", () => {
    test("Columns", async () => {
      const sheetId = model.getters.getActiveSheetId();
      await doAction(["view", "freeze_panes", "freeze_first_col"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 1, ySplit: 0 });
      await doAction(["view", "freeze_panes", "freeze_second_col"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 2, ySplit: 0 });
      setSelection(model, ["G5"]);
      await doAction(["view", "freeze_panes", "freeze_current_col"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 7, ySplit: 0 });
      await doAction(["view", "freeze_panes", "unfreeze_columns"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
    });

    test("Rows", async () => {
      const sheetId = model.getters.getActiveSheetId();
      await doAction(["view", "freeze_panes", "freeze_first_row"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 1 });
      await doAction(["view", "freeze_panes", "freeze_second_row"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 2 });
      setSelection(model, ["G5"]);
      await doAction(["view", "freeze_panes", "freeze_current_row"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 5 });
      await doAction(["view", "freeze_panes", "unfreeze_rows"], env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
    });

    test("Unfreeze columns and rows", () => {
      const sheetId = model.getters.getActiveSheetId();
      const view = topbarMenuRegistry.getMenuItems().find((item) => item.id === "view")!;
      const unfreeze_panes = view
        .children({} as SpreadsheetChildEnv)
        .find((item) => item.id === "unfreeze_panes")!;
      expect(unfreeze_panes.isVisible(env)).toBe(false);
      freezeColumns(model, 1);
      expect(unfreeze_panes.isVisible(env)).toBe(true);
      unfreeze_panes.execute?.(env);
      expect(model.getters.getPaneDivisions(sheetId));
      expect(unfreeze_panes.isVisible(env)).toBe(false);
      freezeRows(model, 3);
      expect(unfreeze_panes.isVisible(env)).toBe(true);
      unfreeze_panes.execute?.(env);
      expect(model.getters.getPaneDivisions(sheetId));
      expect(unfreeze_panes.isVisible(env)).toBe(false);
    });

    test("unfreeze actions visibility", () => {
      const unfreezeColAction = getNode(["view", "freeze_panes", "unfreeze_columns"], env);
      const unfreezeRowAction = getNode(["view", "freeze_panes", "unfreeze_rows"], env);
      const unfreezeAllAction = getNode(["view", "unfreeze_panes"], env);

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

  test("calling execute on a disabled action should have no effect", () => {
    const executeMock = jest.fn();
    const ActionSpec: ActionSpec = {
      isEnabled: () => false,
      execute: () => executeMock(),
      name: () => "TestAction",
    };

    const action = createAction(ActionSpec);
    action.execute?.(env);
    expect(executeMock).not.toHaveBeenCalled();
  });
});

test("Menu children are sorted by sequence", async () => {
  const env = makeTestEnv();
  const menuItems = createActions([
    {
      id: "menu_1",
      name: "Menu 1",
      sequence: 20,
      children: [
        {
          id: "secondItem",
          name: "bigger sequence Item",
          sequence: 30,
          execute: () => {},
        },
        {
          id: "firstItem",
          name: "lower sequence Item",
          sequence: 10,
          execute: () => {},
        },
      ],
    },
  ]);

  const children = menuItems[0].children(env);
  expect(children[0].id).toBe("firstItem");
  expect(children[1].id).toBe("secondItem");
});
