import { DEFAULT_LOCALES, UID } from "../../src";
import { toUnboundedZone, toZone, zoneToXc } from "../../src/helpers/zones";
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

import { ActionSpec, createAction, createActions } from "../../src/actions/action";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { FONT_SIZES } from "../../src/constants";
import { functionRegistry } from "../../src/functions/function_registry";
import { interactivePaste } from "../../src/helpers/ui/paste_interactive";
import { MenuItemRegistry } from "../../src/registries/menu_items_registry";
import { cellMenuRegistry } from "../../src/registries/menus/cell_menu_registry";
import { colMenuRegistry } from "../../src/registries/menus/col_menu_registry";
import { rowMenuRegistry } from "../../src/registries/menus/row_menu_registry";
import { topbarMenuRegistry } from "../../src/registries/menus/topbar_menu_registry";
import { SpreadsheetChildEnv } from "../../src/types/spreadsheet_env";
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
    expect(() => registry.addChild("child", ["root"], { id: "unique", name: "child" })).toThrow(
      'A child with the id "unique" already exists.'
    );
  });
  test("Menu registry entries can be overriden explicitely", () => {
    addToRegistry(registry, "root", { name: "rootNode" });
    registry.addChild("child", ["root"], { id: "unique", name: "child" });
    expect(() =>
      registry.replaceChild("child", ["root"], { id: "unique", name: "child" })
    ).not.toThrow();
  });
  test("Menu items can have the same id with different parent nodes", () => {
    addToRegistry(registry, "root1", { name: "rootNode1" });
    addToRegistry(registry, "root2", { name: "rootNode2" });
    registry.addChild("child", ["root1"], { id: "unique", name: "child" });
    expect(() =>
      registry.addChild("child", ["root2"], { id: "unique", name: "child" })
    ).not.toThrow();
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
    const model = new Model();
    const env = makeTestEnv(model);
    const [item] = topbarMenuRegistry.getMenuItems();

    const children = item.children && item.children(model, env);
    expect(children).toHaveLength(1);
    const child = children[0];
    expect(child.name(model, env)).toBe("Child1");
    expect(child.id).toBe("child1");
    expect(child.children(model, env)).toHaveLength(3);
    const subChild = child.children(model, env)[0];
    expect(subChild.name(model, env)).toBe("Child2");
    expect(subChild.description(model, env)).toBe("coucou");
    expect(subChild.id).toBe("child2");

    const allChildren = child.children(model, env);
    expect(allChildren).toHaveLength(3);
    expect(allChildren[0].name(model, env)).toBe("Child2");
    expect(allChildren[1].name(model, env)).toBe("test1");
    expect(allChildren[2].name(model, env)).toBe("test2");
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
    (model = new Model()), (env = makeTestEnv(model));
    dispatch = spyModelDispatch(model);
    sheetId = model.getters.getActiveSheetId();
  });

  test("Edit -> undo", async () => {
    setCellContent(model, "A1", "coucou");
    await doAction(["edit", "undo"], model, env);
    expect(dispatch).toHaveBeenCalledWith("REQUEST_UNDO");
  });

  test("Edit -> redo", async () => {
    setCellContent(model, "A1", "coucou");
    await doAction(["edit", "redo"], model, env);
    expect(dispatch).toHaveBeenCalledWith("REQUEST_REDO");
  });

  test("Edit -> copy", async () => {
    const spyWriteClipboard = jest.spyOn(env.clipboard!, "write");
    await doAction(["edit", "copy"], model, env);
    expect(dispatch).toHaveBeenCalledWith("COPY");
    expect(spyWriteClipboard).toHaveBeenCalledWith(
      await model.getters.getClipboardTextAndImageContent()
    );
  });

  test("Edit -> cut", async () => {
    const spyWriteClipboard = jest.spyOn(env.clipboard!, "write");
    await doAction(["edit", "cut"], model, env);
    expect(dispatch).toHaveBeenCalledWith("CUT");
    expect(spyWriteClipboard).toHaveBeenCalledWith(
      await model.getters.getClipboardTextAndImageContent()
    );
  });

  test("Edit -> paste from OS clipboard if copied from outside world last", async () => {
    setCellContent(model, "A1", "a1");
    selectCell(model, "A1");
    await doAction(["edit", "copy"], model, env); // first copy from grid
    await env.clipboard!.writeText("Then copy in OS clipboard");
    selectCell(model, "C3");
    await doAction(["edit", "paste"], model, env);
    expect(getCellContent(model, "C3")).toEqual("Then copy in OS clipboard");
  });

  test("Edit -> paste if copied from grid last", async () => {
    await env.clipboard!.writeText("First copy in OS clipboard");
    await doAction(["edit", "copy"], model, env); // then copy from grid
    await doAction(["edit", "paste"], model, env);
    interactivePaste(model, env, target("A1"));
    expect(getCellContent(model, "A1")).toEqual("");
  });

  test("'Edit -> paste' if copied from grid and content altered before paste", async () => {
    setCellContent(model, "A1", "a1");
    await doAction(["edit", "copy"], model, env); // first copy from grid
    setCellContent(model, "A1", "os clipboard");
    selectCell(model, "C3");
    await doAction(["edit", "paste"], model, env);
    expect(dispatch).toHaveBeenCalledWith("PASTE", {
      target: model.getters.getSelectedZones(),
      pasteOption: undefined,
    });
    expect(getCellContent(model, "C3")).toEqual("a1");
  });

  test("Paste only-format from OS clipboard should paste nothing", async () => {
    await env.clipboard!.writeText("Copy in OS clipboard");
    selectCell(model, "A1");
    await doAction(["edit", "paste_special", "paste_special_format"], model, env);
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
    await doAction(["edit", "copy"], model, env); // first copy from grid
    await env.clipboard!.writeText("Then copy in OS clipboard");
    selectCell(model, "A1");
    await doAction(["edit", "paste_special", "paste_special_format"], model, env);
    expect(getStyle(model, "A1").fillColor).toBeUndefined();
    expect(getCellContent(model, "A1")).toEqual("");
  });

  test("Edit -> paste_special should be hidden after a CUT ", () => {
    cut(model);
    expect(getNode(["edit", "paste_special"], model, env).isVisible(model, env)).toBeFalsy();
  });

  test("Data -> Pivot groups pivot data sources in a submenu", () => {
    const pivotModel = createModelWithPivot("A1:I22");
    const pivotEnv = makeTestEnv(pivotModel);

    const pivotSubmenu = getNode(["data", "pivot_data_sources"], model, pivotEnv);
    const pivotIds = pivotModel.getters.getPivotIds();
    const firstPivotId = pivotIds[0];
    const pivotItem = getNode(
      [
        "data",
        "pivot_data_sources",
        `item_pivot_${pivotModel.getters.getPivotFormulaId(firstPivotId)}`,
      ],
      pivotModel,
      pivotEnv
    );

    expect(getName(["data", "pivot_data_sources"], model, pivotEnv)).toBe("Pivot");
    expect(pivotSubmenu.isVisible(pivotModel, pivotEnv)).toBeTruthy();
    expect(pivotSubmenu.children(pivotModel, pivotEnv)).toHaveLength(pivotIds.length);
    expect(pivotItem.name(pivotModel, pivotEnv)).toBe(
      pivotModel.getters.getPivotDisplayName(firstPivotId)
    );
  });

  test("Data -> Pivot submenu shows a warning icon when at least one pivot is unused", () => {
    const pivotModel = createModelWithTestPivotDataset();
    addPivot(pivotModel, "A1:E18", { name: "Unused pivot" }, "2");
    const pivotEnv = makeTestEnv(pivotModel);

    const pivotSubmenu = getNode(["data", "pivot_data_sources"], model, pivotEnv);
    expect(pivotSubmenu.secondaryIcon(pivotModel, pivotEnv)).toBe(
      "o-spreadsheet-Icon.UNUSED_PIVOT_WARNING"
    );
  });

  test("Edit -> paste_special should not be hidden after a COPY ", () => {
    copy(model, model.getters.getSelectedZones().map(zoneToXc).join(","));
    expect(getNode(["edit", "paste_special"], model, env).isVisible(model, env)).toBeTruthy();
  });

  test("Edit -> paste_special -> paste_special_value", async () => {
    await doAction(["edit", "copy"], model, env);
    await doAction(["edit", "paste_special", "paste_special_value"], model, env);
    expect(dispatch).toHaveBeenCalledWith("PASTE", {
      target: model.getters.getSelectedZones(),
      pasteOption: "asValue",
    });
  });

  test("Edit -> paste_special -> paste_special_value from OS clipboard", async () => {
    const text = "in OS clipboard";
    await env.clipboard!.writeText(text);
    await doAction(["edit", "paste_special", "paste_special_value"], model, env);
    expect(dispatch).toHaveBeenCalledWith("PASTE_FROM_OS_CLIPBOARD", {
      target: target("A1"),
      clipboardContent: { text },
      pasteOption: "asValue",
    });
  });

  test("Edit -> paste_special -> paste_special_format", async () => {
    await doAction(["edit", "copy"], model, env);
    await doAction(["edit", "paste_special", "paste_special_format"], model, env);
    expect(dispatch).toHaveBeenCalledWith("PASTE", {
      target: model.getters.getSelectedZones(),
      pasteOption: "onlyFormat",
    });
  });

  test("Edit -> paste_special -> paste_special_format from OS clipboard", async () => {
    const text = "in OS clipboard";
    await env.clipboard!.writeText(text);
    await doAction(["edit", "paste_special", "paste_special_format"], model, env);
    expect(dispatch).toHaveBeenCalledWith("PASTE_FROM_OS_CLIPBOARD", {
      target: target("A1"),
      clipboardContent: { text },
      pasteOption: "onlyFormat",
    });
  });

  test("Edit -> edit_delete_cell_values", async () => {
    await doAction(["edit", "delete", "edit_delete_cell_values"], model, env);
    expect(dispatch).toHaveBeenCalledWith("DELETE_UNFILTERED_CONTENT", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
  });

  describe("Edit -> edit_delete_row", () => {
    const path = ["edit", "delete", "edit_delete_row"];

    test("A selected row", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getName(path, model, env)).toBe("Delete row 5");
    });

    test("Multiple selected rows", async () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getName(path, model, env)).toBe("Delete rows 5 - 6");
      await doAction(path, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        dimension: "ROW",
        elements: [4, 5],
      });
    });

    test("Multiple zones of selected rows", async () => {
      selectRow(model, 4, "newAnchor");
      selectRow(model, 5, "updateAnchor");
      expect(getName(path, model, env)).toBe("Delete rows");
      await doAction(path, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        dimension: "ROW",
        elements: [4, 5],
      });
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(path, model, env)).toBe("Delete row 4");
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(path, model, env)).toBe("Delete rows 4 - 5");
      await doAction(path, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
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

      expect(getNode(path, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Delete row option unavailable when selecting all rows with folded row grouping", () => {
      const lastRow = model.getters.getNumberRows(sheetId) - 1;

      groupHeaders(model, "ROW", 0, 2, sheetId);
      foldHeaderGroup(model, "ROW", 0, 2, sheetId);

      selectRow(model, 3, "newAnchor");
      selectRow(model, lastRow, "updateAnchor");
      expect(getNode(path, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Selecting column should hide the option for row deletion", async () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getNode(path, model, env).isVisible(model, env)).toBeFalsy();
    });
  });

  describe("Edit -> edit_delete_column", () => {
    const path = ["edit", "delete", "edit_delete_column"];

    test("A selected column", async () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getName(path, model, env)).toBe("Delete column E");
      await doAction(path, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        dimension: "COL",
        elements: [4],
      });
    });

    test("Multiple selected columns", async () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(path, model, env)).toBe("Delete columns E - F");
      await doAction(path, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        dimension: "COL",
        elements: [4, 5],
      });
    });

    test("Multiple zones of selected columns", async () => {
      selectColumn(model, 4, "newAnchor");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(path, model, env)).toBe("Delete columns");
      await doAction(path, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        dimension: "COL",
        elements: [4, 5],
      });
    });

    test("A selected cell", async () => {
      selectCell(model, "D4");
      expect(getName(path, model, env)).toBe("Delete column D");
      await doAction(path, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        dimension: "COL",
        elements: [3],
      });
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(path, model, env)).toBe("Delete columns D - E");
      await doAction(path, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("REMOVE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
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

      expect(getNode(path, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Selecting row should hide the option for column deletion", async () => {
      selectRow(model, 4, "overrideSelection");
      expect(getNode(path, model, env).isVisible(model, env)).toBeFalsy();
    });
  });

  describe("Insert -> Row above", () => {
    const insertRowBeforePath = ["insert", "insert_row", "insert_row_before"];

    test("A selected row", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getName(insertRowBeforePath, model, env)).toBe("Row above");
      expect(getNode(insertRowBeforePath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple consecutive selected rows", async () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getName(insertRowBeforePath, model, env)).toBe("2 Rows above");
      await doAction(insertRowBeforePath, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        dimension: "ROW",
        base: 4,
        quantity: 2,
        position: "before",
      });
      expect(getNode(insertRowBeforePath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple inconsecutive selected rows", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 6, "newAnchor");
      expect(getNode(insertRowBeforePath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("A selected column should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getNode(insertRowBeforePath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(insertRowBeforePath, model, env)).toBe("Row above");
      expect(getNode(insertRowBeforePath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(insertRowBeforePath, model, env)).toBe("2 Rows above");
      await doAction(insertRowBeforePath, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        dimension: "ROW",
        base: 3,
        quantity: 2,
        position: "before",
      });
      expect(getNode(insertRowBeforePath, model, env).isVisible(model, env)).toBeTruthy();
    });
  });

  describe("Insert row above via row menu", () => {
    const addRowBeforePath = ["add_row_before"];

    test("A selected row", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getName(addRowBeforePath, model, env, rowMenuRegistry)).toBe("Insert row above");
      expect(
        getNode(addRowBeforePath, model, env, rowMenuRegistry).isVisible(model, env)
      ).toBeTruthy();
    });

    test("Multiple consecutive selected rows", async () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getName(addRowBeforePath, model, env, rowMenuRegistry)).toBe("Insert 2 rows above");
      await doAction(addRowBeforePath, model, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        dimension: "ROW",
        base: 4,
        quantity: 2,
        position: "before",
      });
      expect(
        getNode(addRowBeforePath, model, env, rowMenuRegistry).isVisible(model, env)
      ).toBeTruthy();
    });

    test("Multiple inconsecutive selected rows", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 6, "newAnchor");
      expect(
        getNode(addRowBeforePath, model, env, rowMenuRegistry).isVisible(model, env)
      ).toBeFalsy();
    });

    test("Full sheet selected", () => {
      selectAll(model);
      expect(
        getNode(addRowBeforePath, model, env, rowMenuRegistry).isVisible(model, env)
      ).toBeTruthy();
    });
  });

  describe("Insert -> Row below", () => {
    const insertRowAfterPath = ["insert", "insert_row", "insert_row_after"];

    test("A selected row", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getName(insertRowAfterPath, model, env)).toBe("Row below");
      expect(getNode(insertRowAfterPath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple consecutive selected rows", async () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getName(insertRowAfterPath, model, env)).toBe("2 Rows below");
      await doAction(insertRowAfterPath, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        dimension: "ROW",
        base: 5,
        quantity: 2,
        position: "after",
      });
      expect(getNode(insertRowAfterPath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple inconsecutive selected rows", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 6, "newAnchor");
      expect(getNode(insertRowAfterPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("A selected column should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getNode(insertRowAfterPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(insertRowAfterPath, model, env)).toBe("Row below");
      expect(getNode(insertRowAfterPath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(insertRowAfterPath, model, env)).toBe("2 Rows below");
      await doAction(insertRowAfterPath, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        dimension: "ROW",
        base: 4,
        quantity: 2,
        position: "after",
      });
      expect(getNode(insertRowAfterPath, model, env).isVisible(model, env)).toBeTruthy();
    });
  });

  describe("Insert row below via row menu", () => {
    const addRowAfterPath = ["add_row_after"];

    test("A selected row", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getName(addRowAfterPath, model, env, rowMenuRegistry)).toBe("Insert row below");
      expect(
        getNode(addRowAfterPath, model, env, rowMenuRegistry).isVisible(model, env)
      ).toBeTruthy();
    });

    test("Multiple consecutive selected rows", async () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getName(addRowAfterPath, model, env, rowMenuRegistry)).toBe("Insert 2 rows below");
      await doAction(addRowAfterPath, model, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        dimension: "ROW",
        base: 5,
        quantity: 2,
        position: "after",
      });
      expect(
        getNode(addRowAfterPath, model, env, rowMenuRegistry).isVisible(model, env)
      ).toBeTruthy();
    });

    test("Multiple inconsecutive selected rows", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 6, "newAnchor");
      expect(
        getNode(addRowAfterPath, model, env, rowMenuRegistry).isVisible(model, env)
      ).toBeFalsy();
    });

    test("Full sheet selected", () => {
      selectAll(model);
      expect(
        getNode(addRowAfterPath, model, env, rowMenuRegistry).isVisible(model, env)
      ).toBeTruthy();
    });
  });

  describe("Insert -> Column left", () => {
    const insertColBeforePath = ["insert", "insert_column", "insert_column_before"];

    test("A selected column", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getName(insertColBeforePath, model, env)).toBe("Column left");
      expect(getNode(insertColBeforePath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple consecutive selected columns", async () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(insertColBeforePath, model, env)).toBe("2 Columns left");
      await doAction(insertColBeforePath, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        base: 4,
        dimension: "COL",
        quantity: 2,
        position: "before",
      });
      expect(getNode(insertColBeforePath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple inconsecutive selected columns", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 6, "newAnchor");
      expect(getNode(insertColBeforePath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("A selected row should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getNode(insertColBeforePath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(insertColBeforePath, model, env)).toBe("Column left");
      expect(getNode(insertColBeforePath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(insertColBeforePath, model, env)).toBe("2 Columns left");
      await doAction(insertColBeforePath, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        base: 3,
        dimension: "COL",
        quantity: 2,
        position: "before",
      });
      expect(getNode(insertColBeforePath, model, env).isVisible(model, env)).toBeTruthy();
    });
  });

  describe("Insert column left via column Menu", () => {
    const addColBeforePath = ["add_column_before"];

    test("A selected column", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getName(addColBeforePath, model, env, colMenuRegistry)).toBe("Insert column left");
      expect(
        getNode(addColBeforePath, model, env, colMenuRegistry).isVisible(model, env)
      ).toBeTruthy();
    });

    test("Multiple consecutive selected columns", async () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(addColBeforePath, model, env, colMenuRegistry)).toBe("Insert 2 columns left");
      await doAction(addColBeforePath, model, env, colMenuRegistry);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        base: 4,
        dimension: "COL",
        quantity: 2,
        position: "before",
      });
      expect(
        getNode(addColBeforePath, model, env, colMenuRegistry).isVisible(model, env)
      ).toBeTruthy();
    });

    test("Multiple inconsecutive selected columns", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 6, "newAnchor");
      expect(
        getNode(addColBeforePath, model, env, colMenuRegistry).isVisible(model, env)
      ).toBeFalsy();
    });

    test("Full sheet selected", () => {
      selectAll(model);
      expect(
        getNode(addColBeforePath, model, env, colMenuRegistry).isVisible(model, env)
      ).toBeTruthy();
    });
  });

  describe("Insert -> Column right", () => {
    const insertColAfterPath = ["insert", "insert_column", "insert_column_after"];

    test("A selected column", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getName(insertColAfterPath, model, env)).toBe("Column right");
      expect(getNode(insertColAfterPath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple consecutive selected columns", async () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(insertColAfterPath, model, env)).toBe("2 Columns right");
      await doAction(insertColAfterPath, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        base: 5,
        dimension: "COL",
        quantity: 2,
        position: "after",
      });
      expect(getNode(insertColAfterPath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple inconsecutive selected columns", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 6, "newAnchor");
      expect(getNode(insertColAfterPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("A selected row should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getNode(insertColAfterPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("A selected cell", () => {
      selectCell(model, "D4");
      expect(getName(insertColAfterPath, model, env)).toBe("Column right");
      expect(getNode(insertColAfterPath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(insertColAfterPath, model, env)).toBe("2 Columns right");
      await doAction(insertColAfterPath, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        base: 4,
        dimension: "COL",
        quantity: 2,
        position: "after",
      });
      expect(getNode(insertColAfterPath, model, env).isVisible(model, env)).toBeTruthy();
    });
  });

  describe("Insert column right via column menu", () => {
    const addColAfterPath = ["add_column_after"];

    test("A selected column", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getName(addColAfterPath, model, env, colMenuRegistry)).toBe("Insert column right");
      expect(
        getNode(addColAfterPath, model, env, colMenuRegistry).isVisible(model, env)
      ).toBeTruthy();
    });

    test("Multiple consecutive selected columns", async () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getName(addColAfterPath, model, env, colMenuRegistry)).toBe("Insert 2 columns right");
      await doAction(addColAfterPath, model, env, colMenuRegistry);
      expect(dispatch).toHaveBeenLastCalledWith("ADD_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
        base: 5,
        dimension: "COL",
        quantity: 2,
        position: "after",
      });
      expect(
        getNode(addColAfterPath, model, env, colMenuRegistry).isVisible(model, env)
      ).toBeTruthy();
    });

    test("Multiple inconsecutive selected columns", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 6, "newAnchor");
      expect(
        getNode(addColAfterPath, model, env, colMenuRegistry).isVisible(model, env)
      ).toBeFalsy();
    });

    test("Full sheet selected", () => {
      selectAll(model);
      expect(
        getNode(addColAfterPath, model, env, colMenuRegistry).isVisible(model, env)
      ).toBeTruthy();
    });
  });

  describe("Insert -> Insert cells and shift down", () => {
    const insertCellShiftDownPath = ["insert", "insert_cell", "insert_cell_down"];

    test("A selected row should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getNode(insertCellShiftDownPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("A selected column should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getNode(insertCellShiftDownPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Multiple consecutive selected columns should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getNode(insertCellShiftDownPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Multiple inconsecutive selected columns should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 6, "newAnchor");
      expect(getNode(insertCellShiftDownPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Multiple consecutive selected rows should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getNode(insertCellShiftDownPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Multiple inconsecutive selected rows should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 6, "newAnchor");
      expect(getNode(insertCellShiftDownPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("A selected cell", async () => {
      selectCell(model, "D4");
      expect(getName(insertCellShiftDownPath, model, env)).toBe("Shift down");
      await doAction(insertCellShiftDownPath, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("INSERT_CELL", {
        zone: model.getters.getSelectedZone(),
        shiftDimension: "ROW",
      });
      expect(getNode(insertCellShiftDownPath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(insertCellShiftDownPath, model, env)).toBe("Shift down");
      await doAction(insertCellShiftDownPath, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("INSERT_CELL", {
        zone: model.getters.getSelectedZone(),
        shiftDimension: "ROW",
      });
      expect(getNode(insertCellShiftDownPath, model, env).isVisible(model, env)).toBeTruthy();
    });
  });

  describe("Insert -> Insert cells and shift right", () => {
    const insertCellShiftRightPath = ["insert", "insert_cell", "insert_cell_right"];

    test("A selected row should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      expect(getNode(insertCellShiftRightPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("A selected column should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      expect(getNode(insertCellShiftRightPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Multiple consecutive selected columns should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 5, "updateAnchor");
      expect(getNode(insertCellShiftRightPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Multiple inconsecutive selected columns should hide the item", () => {
      selectColumn(model, 4, "overrideSelection");
      selectColumn(model, 6, "newAnchor");
      expect(getNode(insertCellShiftRightPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Multiple consecutive selected rows should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 5, "updateAnchor");
      expect(getNode(insertCellShiftRightPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Multiple inconsecutive selected rows should hide the item", () => {
      selectRow(model, 4, "overrideSelection");
      selectRow(model, 6, "newAnchor");
      expect(getNode(insertCellShiftRightPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("A selected cell", async () => {
      selectCell(model, "D4");
      expect(getName(insertCellShiftRightPath, model, env)).toBe("Shift right");
      await doAction(insertCellShiftRightPath, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("INSERT_CELL", {
        zone: model.getters.getSelectedZone(),
        shiftDimension: "COL",
      });
      expect(getNode(insertCellShiftRightPath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple selected cells", async () => {
      selectCell(model, "D4");
      setAnchorCorner(model, "E5");
      expect(getName(insertCellShiftRightPath, model, env)).toBe("Shift right");
      await doAction(insertCellShiftRightPath, model, env);
      expect(dispatch).toHaveBeenLastCalledWith("INSERT_CELL", {
        zone: model.getters.getSelectedZone(),
        shiftDimension: "COL",
      });
      expect(getNode(insertCellShiftRightPath, model, env).isVisible(model, env)).toBeTruthy();
    });
  });

  test("Insert -> new sheet", async () => {
    const activeSheetId = model.getters.getActiveSheetId();
    await doAction(["insert", "insert_sheet"], model, env);
    const newSheetId = model.getters.getSheetIds()[1];
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
    await doAction(["insert", "insert_function", "insert_function_sum"], model, env);
    expect(spyStartCell).toHaveBeenCalled();
  });

  test("Insert -> Function -> All includes new functions", () => {
    addToRegistry(functionRegistry, "TEST.FUNC", {
      args: [],
      compute: () => 42,
      description: "Test function",
    });
    const model = new Model();
    const env = makeTestEnv(model);
    const allFunctions = getNode(
      ["insert", "insert_function", "categorie_function_all"],
      model,
      env
    ).children(model, env);
    expect(allFunctions.map((f) => f.name(model, env))).toContain("TEST.FUNC");
  });

  test("Insert -> Checkbox", async () => {
    selectCell(model, "A1");
    await doAction(["insert", "insert_checkbox"], model, env);
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
    const model = new Model();
    const env = makeTestEnv(model);
    const functionCategories = getNode(["insert", "insert_function"], model, env).children(
      model,
      env
    );
    expect(functionCategories.map((f) => f.name(model, env))).not.toContain("hidden");
    const allFunctions = getNode(
      ["insert", "insert_function", "categorie_function_all"],
      model,
      env
    ).children(model, env);
    expect(allFunctions.map((f) => f.name(model, env))).not.toContain("HIDDEN.FUNC");
  });

  describe("Format -> numbers", () => {
    test("Automatic", () => {
      const action = getNode(["format", "format_number", "format_number_automatic"], model, env);
      action.execute?.(model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        format: "",
      });
      expect(action.isActive?.(model, env)).toBe(true);
    });

    test("Number", () => {
      const action = getNode(["format", "format_number", "format_number_number"], model, env);
      expect(action.isActive?.(model, env)).toBe(false);
      action.execute?.(model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        format: "#,##0.00",
      });
      expect(action.isActive?.(model, env)).toBe(true);
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
      const action = getNode(["format", "format_number", actionId], model, env);
      expect(action.description(model, env)).toBe(expectedDescription);
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
      const action = getNode(["format", "format_number", actionId], model, env);
      expect(action.description(model, env)).toBe(expectedDescription);
    });

    test("Percent", async () => {
      await doAction(["format", "format_number", "format_number_percent"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        format: "0.00%",
      });
    });

    test("currency format with default currency", () => {
      const action = getNode(["format", "format_number", "format_number_currency"], model, env);
      expect(action.description(model, env)).toBe("$1,000.12");
      action.execute?.(model, env);
      expect(getCell(model, "A1")?.format).toBe("[$$]#,##0.00");
    });

    test("rounded currency format with default currency", () => {
      const action = getNode(
        ["format", "format_number", "format_number_currency_rounded"],
        model,
        env
      );
      expect(action.description(model, env)).toBe("$1,000");
      action.execute?.(model, env);
      expect(getCell(model, "A1")?.format).toBe("[$$]#,##0");
    });

    test("currency format with custom default currency", () => {
      const model = new Model({}, { defaultCurrency: TEST_CURRENCY });
      env = makeTestEnv(model);
      const action = getNode(["format", "format_number", "format_number_currency"], model, env);
      expect(action.description(model, env)).toBe("€1,000.120");
      action.execute?.(model, env);
      expect(getCell(model, "A1")?.format).toBe("[$€]#,##0.000");
    });

    test("rounded currency format with custom default currency", () => {
      const model = new Model({}, { defaultCurrency: TEST_CURRENCY });
      env = makeTestEnv(model);
      const action = getNode(
        ["format", "format_number", "format_number_currency_rounded"],
        model,
        env
      );
      expect(action.description(model, env)).toBe("€1,000");
      action.execute?.(model, env);
      expect(getCell(model, "A1")?.format).toBe("[$€]#,##0");
    });

    test("rounded currency format is invisible if the custom default format is already rounded", () => {
      const model = new Model({}, { defaultCurrency: { decimalPlaces: 0 } });
      env = makeTestEnv(model);
      const action = getNode(
        ["format", "format_number", "format_number_currency_rounded"],
        model,
        env
      );
      expect(action.isVisible(model, env)).toBe(false);
    });

    test("currency format description with locale and custom default currency", () => {
      const model = new Model({}, { defaultCurrency: TEST_CURRENCY });
      env = makeTestEnv(model);
      updateLocale(model, FR_LOCALE);
      const action = getNode(["format", "format_number", "format_number_currency"], model, env);
      expect(action.description(model, env)).toBe("€1 000,120");
    });

    test("accounting format menu item", () => {
      const model = new Model({}, { defaultCurrency: { ...TEST_CURRENCY, decimalPlaces: 0 } });
      env = makeTestEnv(model);
      const action = getNode(["format", "format_number", "format_number_accounting"], model, env);
      expect(action.isVisible(model, env)).toBe(true);
      action.execute?.(model, env);
      expect(getCell(model, "A1")?.format).toBe("[$€]*  #,##0 ;[$€]* (#,##0);[$€]*   -  ");
    });

    test.each(DEFAULT_LOCALES)("Date", async (locale) => {
      model.dispatch("UPDATE_LOCALE", { locale });
      await doAction(["format", "format_number", "format_number_date"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        format: locale.dateFormat,
      });
    });

    test.each(DEFAULT_LOCALES)("Time", async (locale) => {
      model.dispatch("UPDATE_LOCALE", { locale });
      await doAction(["format", "format_number", "format_number_time"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        format: locale.timeFormat,
      });
    });

    test.each(DEFAULT_LOCALES)("Date time", async (locale) => {
      model.dispatch("UPDATE_LOCALE", { locale });
      await doAction(["format", "format_number", "format_number_date_time"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        format: `${locale.dateFormat} ${locale.timeFormat}`,
      });
    });

    test("Duration", async () => {
      await doAction(["format", "format_number", "format_number_duration"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        format: "hhhh:mm:ss",
      });
    });

    test("Custom formats", async () => {
      const spyOpenSidePanel = jest.spyOn(env, "openSidePanel");

      await doAction(["format", "format_number", "format_custom_currency"], model, env);
      expect(spyOpenSidePanel).toHaveBeenCalledWith("MoreFormats", { category: "currency" });

      await doAction(["format", "format_number", "format_custom_date"], model, env);
      expect(spyOpenSidePanel).toHaveBeenCalledWith("MoreFormats", { category: "date" });

      await doAction(["format", "format_number", "format_custom_number"], model, env);
      expect(spyOpenSidePanel).toHaveBeenCalledWith("MoreFormats", { category: "number" });
    });

    test("Automatic format is active when format is computed", () => {
      selectCell(model, "A1");
      setCellContent(model, "A1", "1");
      const setNumberFormatAction = getNode(
        ["format", "format_number", "format_number_number"],
        model,
        env
      );
      const setAutoFormatAction = getNode(
        ["format", "format_number", "format_number_automatic"],
        model,
        env
      );
      setNumberFormatAction.execute?.(model, env);
      expect(getCell(model, "A1")?.format).toBe("#,##0.00");
      setCellContent(model, "B1", "=A1");
      expect(getCell(model, "B1")?.format).toBeUndefined();
      expect(getEvaluatedCell(model, "B1")?.format).toBe("#,##0.00");
      selectCell(model, "B1");
      expect(setAutoFormatAction.isActive?.(model, env)).toBe(true);
      expect(setNumberFormatAction.isActive?.(model, env)).toBe(false);
    });

    test("cancel edition when setting a format", async () => {
      const composerStore = env.getStore(CellComposerStore);
      composerStore.startEdition("hello");
      expect(composerStore.editionMode).toBe("editing");
      await doAction(["format", "format_number", "format_number_percent"], model, env);
      expect(composerStore.editionMode).toBe("inactive");
      expect(getCellContent(model, "A1")).toBe("");
    });

    describe("Custom number formats", () => {
      function getNumberFormatsInMenu() {
        return getNode(["format", "format_number"], model, env)
          .children(model, env)
          .map((node) => node.name(model, env));
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
    await doAction(["format", "format_bold"], model, env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      style: { bold: true },
    });
  });

  test("Format -> italic", async () => {
    await doAction(["format", "format_italic"], model, env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      style: { italic: true },
    });
  });

  test("Format -> underline", async () => {
    await doAction(["format", "format_underline"], model, env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      style: { underline: true },
    });
  });

  test("Format -> strikethrough", async () => {
    await doAction(["format", "format_strikethrough"], model, env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      style: { strikethrough: true },
    });
  });

  test("Format -> font-size", async () => {
    const fontSize = FONT_SIZES[0];
    await doAction(["format", "format_font_size", `font_size_${fontSize}`], model, env);
    expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      style: { fontSize },
    });
  });

  describe("Format -> Alignment", () => {
    test("Left", async () => {
      await doAction(["format", "format_alignment", "format_alignment_left"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        style: { align: "left" },
      });
    });

    test("Center", async () => {
      await doAction(["format", "format_alignment", "format_alignment_center"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        style: { align: "center" },
      });
    });

    test("Right", async () => {
      await doAction(["format", "format_alignment", "format_alignment_right"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        style: { align: "right" },
      });
    });

    test("Top", async () => {
      await doAction(["format", "format_alignment", "format_alignment_top"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        style: { verticalAlign: "top" },
      });
    });

    test("Middle", async () => {
      await doAction(["format", "format_alignment", "format_alignment_middle"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        style: { verticalAlign: "middle" },
      });
    });

    test("Bottom", async () => {
      await doAction(["format", "format_alignment", "format_alignment_bottom"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        style: { verticalAlign: "bottom" },
      });
    });
  });

  describe("Format -> wrapping", () => {
    test("Overflow", async () => {
      await doAction(["format", "format_wrapping", "format_wrapping_overflow"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        style: { wrapping: "overflow" },
      });
    });

    test("Wrap", async () => {
      await doAction(["format", "format_wrapping", "format_wrapping_wrap"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        style: { wrapping: "wrap" },
      });
    });

    test("Clip", async () => {
      await doAction(["format", "format_wrapping", "format_wrapping_clip"], model, env);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
        style: { wrapping: "clip" },
      });
    });
  });

  test("Data -> Split to columns action", async () => {
    const spyOpenSidePanel = jest.spyOn(env, "openSidePanel");
    await doAction(["data", "split_to_columns"], model, env);
    expect(spyOpenSidePanel).toHaveBeenCalledWith("SplitToColumns", {});
  });

  test("Data -> Split to columns is disabled when multiple cols are selected", () => {
    setSelection(model, ["A1"]);
    expect(getNode(["data", "split_to_columns"], model, env).isEnabled(model, env)).toBeTruthy();

    setSelection(model, ["A1:C1"]);
    expect(getNode(["data", "split_to_columns"], model, env).isEnabled(model, env)).toBeFalsy();

    setSelection(model, ["A1", "B1"]);
    expect(getNode(["data", "split_to_columns"], model, env).isEnabled(model, env)).toBeFalsy();
  });

  test("Data -> Sort ascending", async () => {
    await doAction(["data", "sort_range", "sort_ascending"], model, env);
    const { anchor, zones } = model.getters.getSelection();
    expect(dispatch).toHaveBeenCalledWith("SORT_CELLS", {
      sheetId: model.getters.getActiveSheetId(),
      ...anchor.cell,
      zone: zones[0],
      sortDirection: "asc",
    });
  });

  test("Data -> Sort descending", async () => {
    await doAction(["data", "sort_range", "sort_descending"], model, env);
    const { anchor, zones } = model.getters.getSelection();
    expect(dispatch).toHaveBeenCalledWith("SORT_CELLS", {
      sheetId: model.getters.getActiveSheetId(),
      ...anchor.cell,
      zone: zones[0],
      sortDirection: "desc",
    });
  });

  describe("Data -> Sort", () => {
    const pathSort = ["data", "sort_range"];

    test("A selected zone", () => {
      setSelection(model, ["A1:A2"]);
      expect(getName(pathSort, model, env)).toBe("Sort range");
      expect(getNode(pathSort, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Multiple selected zones", () => {
      setSelection(model, ["A1:A2", "B1:B2"]);
      expect(getNode(pathSort, model, env).isVisible(model, env)).toBeFalsy();
    });
  });
  describe("Hide/Unhide Columns", () => {
    const hidePath = ["hide_columns"];
    const unhidePath = ["unhide_columns"];
    test("Action on single column selection", async () => {
      selectColumn(model, 1, "overrideSelection");
      expect(getName(hidePath, model, env, colMenuRegistry)).toBe("Hide column B");
      expect(getNode(hidePath, model, env, colMenuRegistry).isVisible(model, env)).toBeTruthy();
      await doAction(hidePath, model, env, colMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        elements: [1],
        dimension: "COL",
      });
    });
    test("Action with at least one active column", async () => {
      setSelection(model, ["B1:B100", "C5"]);
      expect(getName(hidePath, model, env, colMenuRegistry)).toBe("Hide columns B - C");
      expect(getNode(hidePath, model, env, colMenuRegistry).isVisible(model, env)).toBeTruthy();
      await doAction(hidePath, model, env, colMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        elements: [1, 2],
        dimension: "COL",
      });
    });
    test("Action without any active column", async () => {
      setSelection(model, ["B1"]);
      expect(getName(hidePath, model, env, colMenuRegistry)).toBe("Hide columns");
      expect(getNode(hidePath, model, env, colMenuRegistry).isVisible(model, env)).toBeTruthy();
      await doAction(hidePath, model, env, colMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        elements: [],
        dimension: "COL",
      });
    });

    test("Inactive menu item on invalid selection", () => {
      setSelection(model, ["A1:A100", "A4:Z4"]);
      expect(getNode(hidePath, model, env, colMenuRegistry).isVisible(model, env)).toBeFalsy();
    });

    test("Unhide cols from Col menu", async () => {
      hideColumns(model, ["C"]);
      setSelection(model, ["B1:E100"]);
      expect(getNode(unhidePath, model, env, colMenuRegistry).isVisible(model, env)).toBeTruthy();
      await doAction(unhidePath, model, env, colMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        elements: [1, 2, 3, 4],
        dimension: "COL",
      });
    });
    test("Unhide rows from Col menu without hidden cols", () => {
      setSelection(model, ["B1:E100"]);
      expect(getNode(unhidePath, model, env, colMenuRegistry).isVisible(model, env)).toBeFalsy();
    });
    test("Unhide all cols from top menu", async () => {
      // no hidden rows
      expect(
        getNode(["edit", "edit_unhide_columns"], model, env).isVisible(model, env)
      ).toBeFalsy();
      hideColumns(model, ["C"]);
      expect(
        getNode(["edit", "edit_unhide_columns"], model, env).isVisible(model, env)
      ).toBeTruthy();
      await doAction(["edit", "edit_unhide_columns"], model, env);
      const sheetId = model.getters.getActiveSheetId();
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
      expect(getName(hidePath, model, env, rowMenuRegistry)).toBe("Hide row 2");
      expect(getNode(hidePath, model, env, rowMenuRegistry).isVisible(model, env)).toBeTruthy();
      await doAction(hidePath, model, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        elements: [1],
        dimension: "ROW",
      });
    });
    test("Action with at least one active row", async () => {
      setSelection(model, ["A2:Z2", "C3"]);
      expect(getName(hidePath, model, env, rowMenuRegistry)).toBe("Hide rows 2 - 3");
      expect(getNode(hidePath, model, env, rowMenuRegistry).isVisible(model, env)).toBeTruthy();
      await doAction(hidePath, model, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        elements: [1, 2],
        dimension: "ROW",
      });
    });
    test("Action without any active column", async () => {
      setSelection(model, ["B1"]);
      expect(getName(hidePath, model, env, rowMenuRegistry)).toBe("Hide rows");
      expect(getNode(hidePath, model, env, rowMenuRegistry).isVisible(model, env)).toBeTruthy();
      await doAction(hidePath, model, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        elements: [],
        dimension: "ROW",
      });
    });

    test("Inactive menu item on invalid selection", () => {
      setSelection(model, ["A1:A100", "A4:Z4"]);
      expect(getNode(hidePath, model, env, rowMenuRegistry).isVisible(model, env)).toBeFalsy();
    });

    test("Unhide rows from Row menu with hidden rows", async () => {
      hideRows(model, [2]);
      setSelection(model, ["A1:Z4"]);
      expect(getNode(unhidePath, model, env, rowMenuRegistry).isVisible(model, env)).toBeTruthy();
      await doAction(unhidePath, model, env, rowMenuRegistry);
      expect(dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
        sheetId: model.getters.getActiveSheetId(),
        elements: [0, 1, 2, 3],
        dimension: "ROW",
      });
    });
    test("Unhide rows from Row menu without hidden rows", () => {
      setSelection(model, ["A1:Z4"]);
      expect(getNode(unhidePath, model, env, rowMenuRegistry).isVisible(model, env)).toBeFalsy();
    });

    test("Unhide all rows from top menu", async () => {
      // no hidden rows
      expect(getNode(["edit", "edit_unhide_rows"], model, env).isVisible(model, env)).toBeFalsy();
      hideRows(model, [2]);
      expect(getNode(["edit", "edit_unhide_rows"], model, env).isVisible(model, env)).toBeTruthy();
      await doAction(["edit", "edit_unhide_rows"], model, env);
      const sheetId = model.getters.getActiveSheetId();
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
      expect(getNode(hidePath, model, env, rowMenuRegistry).isVisible(model, env)).toBeFalsy();
    });

    describe("Table and filters", () => {
      const filterPath = ["data", "add_remove_data_filter"];
      const insertTablePath = ["insert", "insert_table"];
      const editTablePath = ["edit", "edit_table"];

      test("Insert -> Table", async () => {
        setSelection(model, ["A1:A5"]);
        expect(getName(insertTablePath, model, env)).toBe("Table");
        await doAction(insertTablePath, model, env);
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { zone: toZone("A1:A5") },
        });
      });

      test("Insert -> Table on a whole column make it into an unbounded zone", async () => {
        setSelection(model, ["A1:A100"]);
        expect(getName(insertTablePath, model, env)).toBe("Table");
        await doAction(insertTablePath, model, env);
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { unboundedZone: toUnboundedZone("A:A") },
        });
      });

      test("Insert -> Table is not visible if there is already a table in the selection, or if the selection is not continuous", () => {
        setSelection(model, ["A1", "B2"]);
        expect(getNode(insertTablePath, model, env).isVisible(model, env)).toBeFalsy();

        setSelection(model, ["A1:A5"]);
        expect(getNode(insertTablePath, model, env).isVisible(model, env)).toBeTruthy();

        createTable(model, "A1:A5");
        expect(getNode(insertTablePath, model, env).isVisible(model, env)).toBeFalsy();
      });

      test("Insert -> Table creates a dynamic table if it's called on a spreading cell", async () => {
        setCellContent(model, "A1", "=MUNIT(5)");
        setSelection(model, ["A1"]);
        await doAction(insertTablePath, model, env);
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
        await doAction(insertTablePath, model, env);
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
        await doAction(insertTablePath, model, env);
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
        await doAction(insertTablePath, model, env);
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
        await doAction(insertTablePath, model, env);
        expect(model.getters.getCoreTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { zone: toZone("A1") },
          type: "static",
        });
      });

      test("Edit -> Table (topbar)", async () => {
        const spyOpenSidePanel = jest.spyOn(env, "openSidePanel");
        createTable(model, "A1:A5");
        expect(getName(editTablePath, model, env)).toBe("Edit table");
        await doAction(editTablePath, model, env);
        expect(spyOpenSidePanel).toHaveBeenCalledWith("TableSidePanel", {});
      });

      test("Edit -> Table (topbar) is not visible if there is no table in the selection", () => {
        expect(getNode(editTablePath, model, env).isVisible(model, env)).toBeFalsy();
        createTable(model, "A1:A5");
        expect(getNode(editTablePath, model, env).isVisible(model, env)).toBeTruthy();
      });

      test("Edit table (cellRegistry)", async () => {
        const spyOpenSidePanel = jest.spyOn(env, "openSidePanel");
        createTable(model, "A1:A5");
        expect(getName(["edit_table"], model, env, cellMenuRegistry)).toBe("Edit table");
        await doAction(["edit_table"], model, env, cellMenuRegistry);
        expect(spyOpenSidePanel).toHaveBeenCalledWith("TableSidePanel", {});
      });

      test("Delete table (cellRegistry)", async () => {
        createTable(model, "A1:A5");
        expect(getName(["delete_table"], model, env, cellMenuRegistry)).toBe("Delete table");
        await doAction(["delete_table"], model, env, cellMenuRegistry);
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toBeUndefined();
      });

      test("Delete table (cellRegistry) works with a table in the selection but not on the active cell", async () => {
        createTable(model, "A2:A5");
        expect(model.getters.getTable({ sheetId, row: 1, col: 0 })).toBeDefined();

        setSelection(model, ["A1:A2"], { anchor: "A1" });
        await doAction(["delete_table"], model, env, cellMenuRegistry);
        expect(model.getters.getTable({ sheetId, row: 1, col: 0 })).toBeUndefined();
      });

      test("Delete table (cellRegistry) on a dynamic table", async () => {
        setCellContent(model, "A1", "=MUNIT(5)");
        createDynamicTable(model, "A1");
        setSelection(model, ["C3"]);
        await doAction(["delete_table"], model, env, cellMenuRegistry);
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toBeUndefined();
      });

      test("Edit/delete table (cellRegistry) visible only with a single table in the selection", () => {
        expect(
          getNode(["edit_table"], model, env, cellMenuRegistry).isVisible(model, env)
        ).toBeFalsy();
        expect(
          getNode(["delete_table"], model, env, cellMenuRegistry).isVisible(model, env)
        ).toBeFalsy();

        createTable(model, "A1:A5");
        expect(
          getNode(["edit_table"], model, env, cellMenuRegistry).isVisible(model, env)
        ).toBeTruthy();
        expect(
          getNode(["delete_table"], model, env, cellMenuRegistry).isVisible(model, env)
        ).toBeTruthy();

        setSelection(model, ["A1:B5"]);
        expect(
          getNode(["edit_table"], model, env, cellMenuRegistry).isVisible(model, env)
        ).toBeTruthy();
        expect(
          getNode(["delete_table"], model, env, cellMenuRegistry).isVisible(model, env)
        ).toBeTruthy();

        createTable(model, "B1:B5");
        expect(
          getNode(["edit_table"], model, env, cellMenuRegistry).isVisible(model, env)
        ).toBeFalsy();
        expect(
          getNode(["delete_table"], model, env, cellMenuRegistry).isVisible(model, env)
        ).toBeFalsy();
      });

      test("Filters -> Create filter", async () => {
        setSelection(model, ["A1:A5"]);
        expect(getName(filterPath, model, env)).toBe("Add filters");
        await doAction(filterPath, model, env);
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toMatchObject({
          range: { zone: toZone("A1:A5") },
          config: { hasFilters: true },
        });
      });

      test("Filters -> Add filters on existing table", async () => {
        createTable(model, "A1:A5");
        updateTableConfig(model, "A1:A5", { hasFilters: false });
        await doAction(filterPath, model, env);
        expect(model.getters.getTable({ sheetId, row: 0, col: 0 })?.config.hasFilters).toBe(true);
      });

      test("Filters -> Remove filter", async () => {
        createTableWithFilter(model, "A1:A5");
        setSelection(model, ["A1:A5"]);
        expect(getName(filterPath, model, env)).toBe("Remove selected filters");
        await doAction(filterPath, model, env);
        const table = model.getters.getTable({ sheetId, row: 0, col: 0 });
        expect(table?.config.hasFilters).toBe(false);
      });

      test("Filters -> Add/Remove filters with multiple table in the selection works only on first table", async () => {
        createTable(model, "A1:A5");
        createTable(model, "B1:B5");
        updateTableConfig(model, "A1:A5", { hasFilters: false });
        updateTableConfig(model, "B1:B5", { hasFilters: false });

        setSelection(model, ["A1:B5"]);
        await doAction(filterPath, model, env);
        expect(model.getters.getTables(sheetId)).toMatchObject([
          { range: { zone: toZone("A1:A5") }, config: { hasFilters: true } },
          { range: { zone: toZone("B1:B5") }, config: { hasFilters: false } },
        ]);

        await doAction(filterPath, model, env);
        expect(model.getters.getTables(sheetId)).toMatchObject([
          { range: { zone: toZone("A1:A5") }, config: { hasFilters: false } },
          { range: { zone: toZone("B1:B5") }, config: { hasFilters: false } },
        ]);
      });

      test("Filters -> Create filter is disabled when the selection is not continuous", () => {
        setSelection(model, ["A1", "B6"]);
        expect(getNode(filterPath, model, env).isVisible(model, env)).toBeTruthy();
        expect(getNode(filterPath, model, env).isEnabled(model, env)).toBeFalsy();
      });

      test("Filters -> Create filter is enabled for continuous selection of multiple zones", () => {
        setSelection(model, ["A1", "A2:A5", "B1:B5"]);
        expect(getNode(filterPath, model, env).isVisible(model, env)).toBeTruthy();
        expect(getNode(filterPath, model, env).isEnabled(model, env)).toBeTruthy();
      });

      test("Filters -> Remove filter is displayed instead of add filter when the selection contains a filter", () => {
        setSelection(model, ["A1:A5"]);
        expect(getName(filterPath, model, env)).toBe("Add filters");

        createTableWithFilter(model, "A1:B5");
        expect(getName(filterPath, model, env)).toBe("Remove selected filters");

        setSelection(model, ["A1:B9"]);
        expect(getName(filterPath, model, env)).toBe("Remove selected filters");
      });
    });

    test("Insert -> Carousel", async () => {
      expect(getName(["insert", "insert_carousel"], model, env)).toBe("Carousel");
      await doAction(["insert", "insert_carousel"], model, env);
      expect(model.getters.getFigures(model.getters.getActiveSheetId())[0]).toMatchObject({
        tag: "carousel",
      });
    });
  });

  test("View -> Set gridlines visibility", async () => {
    const path_gridlines = ["view", "show", "view_gridlines"];
    const sheetId = model.getters.getActiveSheetId();

    setGridLinesVisibility(model, true);

    expect(getName(path_gridlines, model, env)).toBe("Gridlines");
    expect(getNode(path_gridlines, model, env).isVisible(model, env)).toBeTruthy();
    expect(getNode(path_gridlines, model, env).isActive?.(model, env)).toBeTruthy();

    setGridLinesVisibility(model, false);
    expect(getName(path_gridlines, model, env)).toBe("Gridlines");
    expect(getNode(path_gridlines, model, env).isVisible(model, env)).toBeTruthy();
    expect(getNode(path_gridlines, model, env).isActive?.(model, env)).toBeFalsy();

    await doAction(path_gridlines, model, env);
    expect(dispatch).toHaveBeenCalledWith("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: true,
    });
    setGridLinesVisibility(model, true);

    await doAction(path_gridlines, model, env);
    expect(dispatch).toHaveBeenCalledWith("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: false,
    });
  });

  test("View -> show formulas", async () => {
    const path_formulas = ["view", "show", "view_formulas"];
    expect(model.getters.shouldShowFormulas()).toBe(false);

    expect(getName(path_formulas, model, env)).toBe("Formulas");
    expect(getNode(path_formulas, model, env).isVisible(model, env)).toBeTruthy();
    expect(getNode(path_formulas, model, env).isActive?.(model, env)).toBeFalsy();
    await doAction(path_formulas, model, env);
    expect(model.getters.shouldShowFormulas()).toBe(true);

    expect(getName(path_formulas, model, env)).toBe("Formulas");
    expect(getNode(path_formulas, model, env).isVisible(model, env)).toBeTruthy();
    expect(getNode(path_formulas, model, env).isActive?.(model, env)).toBeTruthy();
    await doAction(path_formulas, model, env);
    expect(model.getters.shouldShowFormulas()).toBe(false);
  });

  describe("View -> group headers", () => {
    const groupColsPath = ["view", "group_headers", "group_columns"];
    const groupRowsPath = ["view", "group_headers", "group_rows"];
    const ungroupColsPath = ["view", "group_headers", "ungroup_columns"];
    const ungroupRowsPath = ["view", "group_headers", "ungroup_rows"];

    test("Can group columns", async () => {
      setSelection(model, ["A1:C3"]);
      expect(getName(groupColsPath, model, env)).toBe("Group columns A - C");
      await doAction(groupColsPath, model, env);
      expect(model.getters.getHeaderGroups(sheetId, "COL")[0]).toMatchObject({
        start: 0,
        end: 2,
      });
    });

    test("Cannot group multiple selections", () => {
      setSelection(model, ["A1:B3", "C1:C3"]);
      expect(getNode(groupColsPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Cannot re-group same selection of columns", () => {
      setSelection(model, ["A1:B3"]);
      getNode(groupColsPath, model, env).execute?.(model, env);
      expect(getNode(groupColsPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Can ungroup columns", async () => {
      groupColumns(model, "A", "C");
      setSelection(model, ["A1:C3"]);
      expect(getName(ungroupColsPath, model, env)).toBe("Ungroup columns A - C");
      await doAction(ungroupColsPath, model, env);
      expect(model.getters.getHeaderGroups(sheetId, "COL")).toHaveLength(0);
    });

    test("Cannot ungroup columns when there's no group in the selection", () => {
      setSelection(model, ["A1:C3"]);
      expect(getNode(ungroupColsPath, model, env).isVisible(model, env)).toBeFalsy();

      groupColumns(model, "A", "C");
      expect(getNode(ungroupColsPath, model, env).isVisible(model, env)).toBeTruthy();
    });

    test("Can group rows", async () => {
      setSelection(model, ["A1:C3"]);
      expect(getName(groupRowsPath, model, env)).toBe("Group rows 1 - 3");
      await doAction(groupRowsPath, model, env);
      expect(model.getters.getHeaderGroups(sheetId, "ROW")[0]).toMatchObject({
        start: 0,
        end: 2,
      });
    });

    test("Cannot group multiple selections", () => {
      setSelection(model, ["A1:C1", "A2:C2"]);
      expect(getNode(groupRowsPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Cannot re-group same selection of rows", () => {
      setSelection(model, ["A1:B3"]);
      getNode(groupRowsPath, model, env).execute?.(model, env);
      expect(getNode(groupRowsPath, model, env).isVisible(model, env)).toBeFalsy();
    });

    test("Can ungroup rows", async () => {
      groupRows(model, 0, 2);
      setSelection(model, ["A1:C3"]);
      expect(getName(ungroupRowsPath, model, env)).toBe("Ungroup rows 1 - 3");
      await doAction(ungroupRowsPath, model, env);
      expect(model.getters.getHeaderGroups(sheetId, "ROW")).toHaveLength(0);
    });

    test("Cannot ungroup rows when there's no group in the selection", () => {
      setSelection(model, ["A1:C3"]);
      expect(getNode(ungroupRowsPath, model, env).isVisible(model, env)).toBeFalsy();

      groupRows(model, 0, 2);
      expect(getNode(ungroupRowsPath, model, env).isVisible(model, env)).toBeTruthy();
    });
  });

  describe("Freeze rows and columns", () => {
    test("Columns", async () => {
      const sheetId = model.getters.getActiveSheetId();
      await doAction(["view", "freeze_panes", "freeze_first_col"], model, env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 1, ySplit: 0 });
      await doAction(["view", "freeze_panes", "freeze_second_col"], model, env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 2, ySplit: 0 });
      setSelection(model, ["G5"]);
      await doAction(["view", "freeze_panes", "freeze_current_col"], model, env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 7, ySplit: 0 });
      await doAction(["view", "freeze_panes", "unfreeze_columns"], model, env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
    });

    test("Rows", async () => {
      const sheetId = model.getters.getActiveSheetId();
      await doAction(["view", "freeze_panes", "freeze_first_row"], model, env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 1 });
      await doAction(["view", "freeze_panes", "freeze_second_row"], model, env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 2 });
      setSelection(model, ["G5"]);
      await doAction(["view", "freeze_panes", "freeze_current_row"], model, env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 5 });
      await doAction(["view", "freeze_panes", "unfreeze_rows"], model, env);
      expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
    });

    test("Unfreeze columns and rows", () => {
      const sheetId = model.getters.getActiveSheetId();
      const view = topbarMenuRegistry.getMenuItems().find((item) => item.id === "view")!;
      const unfreeze_panes = view
        .children(model, {} as SpreadsheetChildEnv)
        .find((item) => item.id === "unfreeze_panes")!;
      expect(unfreeze_panes.isVisible(model, env)).toBe(false);
      freezeColumns(model, 1);
      expect(unfreeze_panes.isVisible(model, env)).toBe(true);
      unfreeze_panes.execute?.(model, env);
      expect(model.getters.getPaneDivisions(sheetId));
      expect(unfreeze_panes.isVisible(model, env)).toBe(false);
      freezeRows(model, 3);
      expect(unfreeze_panes.isVisible(model, env)).toBe(true);
      unfreeze_panes.execute?.(model, env);
      expect(model.getters.getPaneDivisions(sheetId));
      expect(unfreeze_panes.isVisible(model, env)).toBe(false);
    });

    test("unfreeze actions visibility", () => {
      const unfreezeColAction = getNode(["view", "freeze_panes", "unfreeze_columns"], model, env);
      const unfreezeRowAction = getNode(["view", "freeze_panes", "unfreeze_rows"], model, env);
      const unfreezeAllAction = getNode(["view", "unfreeze_panes"], model, env);

      expect(unfreezeColAction.isVisible(model, env)).toBe(false);
      expect(unfreezeRowAction.isVisible(model, env)).toBe(false);
      expect(unfreezeAllAction.isVisible(model, env)).toBe(false);

      freezeColumns(model, 1);
      expect(unfreezeColAction.isVisible(model, env)).toBe(true);
      expect(unfreezeRowAction.isVisible(model, env)).toBe(false);
      expect(unfreezeAllAction.isVisible(model, env)).toBe(true);

      freezeRows(model, 3);
      expect(unfreezeColAction.isVisible(model, env)).toBe(true);
      expect(unfreezeRowAction.isVisible(model, env)).toBe(true);
      expect(unfreezeAllAction.isVisible(model, env)).toBe(true);
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
    action.execute?.(model, env);
    expect(executeMock).not.toHaveBeenCalled();
  });
});

test("Menu children are sorted by sequence", async () => {
  const model = new Model();
  const env = makeTestEnv(model);
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

  const children = menuItems[0].children(model, env);
  expect(children[0].id).toBe("firstItem");
  expect(children[1].id).toBe("secondItem");
});
