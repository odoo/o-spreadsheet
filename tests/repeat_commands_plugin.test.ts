import { DEFAULT_CELL_HEIGHT } from "@odoo/o-spreadsheet-engine/constants";
import {
  AddColumnsRowsCommand,
  CreateChartCommand,
  CreateFigureCommand,
  CreateImageOverCommand,
  CreateSheetCommand,
  GroupHeadersCommand,
  HideColumnsRowsCommand,
  RemoveColumnsRowsCommand,
  ResizeColumnsRowsCommand,
  SheetDependentCommand,
  UnGroupHeadersCommand,
} from "@odoo/o-spreadsheet-engine/types/commands";
import { Model } from "../src";
import { toZone } from "../src/helpers";

import {
  repeatCommandTransformRegistry,
  repeatCoreCommand,
  repeatLocalCommandTransformRegistry,
} from "@odoo/o-spreadsheet-engine/registries/repeat_transform_registry";
import { CoreCommand, Dimension, UID } from "../src/types";
import {
  activateSheet,
  addEqualCf,
  autoresizeColumns,
  autoresizeRows,
  copy,
  createSheet,
  createTableWithFilter,
  deleteCells,
  deleteUnfilteredContent,
  insertCells,
  paste,
  redo,
  resizeColumns,
  resizeRows,
  setCellContent,
  setDecimal,
  setFormatting,
  setSelection,
  sort,
  undo,
} from "./test_helpers/commands_helpers";
import { TEST_COMMANDS } from "./test_helpers/constants";
import {
  automaticSum,
  getCellContent,
  getCellRawContent,
  getEvaluatedCell,
  getStyle,
} from "./test_helpers/getters_helpers";
import { createModel, makeTestComposerStore, target, toRangesData } from "./test_helpers/helpers";

let model: Model;
let sheetId: UID;

beforeEach(async () => {
  model = await createModel();
  sheetId = model.getters.getActiveSheetId();
});

describe("Repeat commands basics", () => {
  test("Repeatable core command list", () => {
    const repeatableCommands = [
      "UPDATE_CELL",
      "CLEAR_CELL",
      "CLEAR_CELLS",
      "DELETE_CONTENT",
      "ADD_MERGE",
      "REMOVE_MERGE",
      "SET_FORMATTING",
      "CLEAR_FORMATTING",
      "SET_BORDER",
      "CREATE_TABLE",
      "REMOVE_TABLE",
      "ADD_COLUMNS_ROWS",
      "REMOVE_COLUMNS_ROWS",
      "HIDE_COLUMNS_ROWS",
      "CREATE_SHEET",
      "CREATE_FIGURE",
      "CREATE_CHART",
      "CREATE_IMAGE",
      "HIDE_SHEET",
      "RESIZE_COLUMNS_ROWS",
      "GROUP_HEADERS",
      "UNGROUP_HEADERS",
      "UNFOLD_HEADER_GROUPS_IN_ZONE",
      "FOLD_HEADER_GROUPS_IN_ZONE",
    ].sort();
    const registryKeys = repeatCommandTransformRegistry.getKeys().sort();
    expect(repeatableCommands).toEqual(registryKeys);
  });

  test("Repeatable local command list", () => {
    const repeatableCommands = [
      "PASTE",
      "INSERT_CELL",
      "DELETE_CELL",
      "AUTORESIZE_COLUMNS",
      "AUTORESIZE_ROWS",
      "SORT_CELLS",
      "SUM_SELECTION",
      "SET_DECIMAL",
      "DELETE_UNFILTERED_CONTENT",
    ].sort();
    const registryKeys = repeatLocalCommandTransformRegistry.getKeys().sort();
    expect(repeatableCommands).toEqual(registryKeys);
  });

  test("Can repeat a command", async () => {
    await setCellContent(model, "A1", "hello");
    await setSelection(model, ["B2"]);
    await redo(model);
    expect(getCellContent(model, "B2")).toBe("hello");
  });

  test("Can undo repeated command", async () => {
    await setCellContent(model, "A1", "hello");
    await setSelection(model, ["B2"]);
    await redo(model);
    expect(getCellContent(model, "B2")).toBe("hello");

    await undo(model);
    expect(getCellContent(model, "B2")).toBe("");
  });

  test("Can undo => redo => repeat command", async () => {
    await setCellContent(model, "A1", "hello");
    await undo(model);
    expect(getCellContent(model, "A1")).toBe("");

    await redo(model);
    expect(getCellContent(model, "A1")).toBe("hello");

    await setSelection(model, ["B2"]);
    await redo(model);
    expect(getCellContent(model, "B2")).toBe("hello");
  });
});

describe("Repeat command transform generics", () => {
  test.each([
    TEST_COMMANDS.UPDATE_CELL,
    TEST_COMMANDS.CLEAR_CELL,
    TEST_COMMANDS.CLEAR_CELLS,
    TEST_COMMANDS.DELETE_CONTENT,
    TEST_COMMANDS.ADD_MERGE,
    TEST_COMMANDS.REMOVE_MERGE,
    TEST_COMMANDS.SET_FORMATTING,
    TEST_COMMANDS.CLEAR_FORMATTING,
    TEST_COMMANDS.SET_BORDER,
    TEST_COMMANDS.CREATE_TABLE,
    TEST_COMMANDS.REMOVE_TABLE,
    TEST_COMMANDS.HIDE_SHEET,
  ])("Sheet dependant command are adapted to current sheet %s", async (command: CoreCommand) => {
    await createSheet(model, { sheetId: "42" });
    await activateSheet(model, "42");
    const transformed = repeatCoreCommand(model.getters, command);
    expect((transformed as SheetDependentCommand)?.sheetId).toEqual("42");
  });

  test.each([TEST_COMMANDS.UPDATE_CELL, TEST_COMMANDS.CLEAR_CELL, TEST_COMMANDS.SET_BORDER])(
    "Position dependant commands are adapted to current selection %s",
    async (cmd: CoreCommand) => {
      await setSelection(model, ["B2:C4"]);
      const transformed = repeatCoreCommand(model.getters, cmd);
      expect(transformed).toMatchObject({ col: 1, row: 1 });
    }
  );

  test.each([
    TEST_COMMANDS.ADD_MERGE,
    TEST_COMMANDS.REMOVE_MERGE,
    TEST_COMMANDS.REMOVE_TABLE,
    TEST_COMMANDS.SET_FORMATTING,
    TEST_COMMANDS.CLEAR_FORMATTING,
    TEST_COMMANDS.CLEAR_CELLS,
  ])(
    "Target dependant commands have target equal to current current selection",
    async (command: CoreCommand) => {
      await setSelection(model, ["B2:C4"]);
      const transformed = repeatCoreCommand(model.getters, command);
      expect(transformed).toMatchObject({ target: target("B2:C4") });
    }
  );

  test.each([TEST_COMMANDS.FOLD_HEADER_GROUPS_IN_ZONE, TEST_COMMANDS.UNFOLD_HEADER_GROUPS_IN_ZONE])(
    "Zone dependant commands have zone equal to current current selection",
    async (command: CoreCommand) => {
      await setSelection(model, ["B2:C4"]);
      const transformed = repeatCoreCommand(model.getters, command);
      expect(transformed).toMatchObject({ zone: toZone("B2:C4") });
    }
  );

  test("Repeat create table", async () => {
    const toRepeat = TEST_COMMANDS.CREATE_TABLE;
    await createSheet(model, { sheetId: "42" });
    await activateSheet(model, "42");
    await setSelection(model, ["B2:C4"]);
    const transformed = repeatCoreCommand(model.getters, toRepeat);
    expect(transformed).toMatchObject({
      ...TEST_COMMANDS.CREATE_TABLE,
      sheetId: "42",
      ranges: toRangesData("42", "B2:C4"),
    });
  });

  test("Commands not in repeatCommandRegistry aren't repeated", () => {
    const command = { type: "RANDOM_COMMAND", col: 0, row: 0, sheetId } as unknown as CoreCommand;
    const transformed = repeatCoreCommand(model.getters, command);
    expect(transformed).toBeUndefined();
  });
});

describe("Repeat command transform specifics", () => {
  test("Create Chart transform", async () => {
    const command: CreateChartCommand = {
      ...TEST_COMMANDS.CREATE_CHART,
      type: "CREATE_CHART",
      figureId: "figureId",
      chartId: "chartId",
      sheetId,
    };
    await createSheet(model, { sheetId: "42" });
    await activateSheet(model, "42");
    const transformed = repeatCoreCommand(model.getters, command);
    expect(transformed).toEqual({
      ...command,
      figureId: expect.not.stringMatching("figureId"),
      chartId: expect.not.stringMatching("chartId"),
      sheetId: "42",
    });
  });

  test("Create image transform", async () => {
    const command: CreateImageOverCommand = {
      ...TEST_COMMANDS.CREATE_IMAGE,
      sheetId,
      figureId: "figureId",
    };
    await createSheet(model, { sheetId: "42" });
    await activateSheet(model, "42");
    const transformed = repeatCoreCommand(model.getters, command);
    expect(transformed).toEqual({
      ...command,
      figureId: expect.not.stringMatching("figureId"),
      sheetId: "42",
    });
  });

  test("Create figure transform", async () => {
    const command: CreateFigureCommand = {
      ...TEST_COMMANDS.CREATE_FIGURE,
      sheetId,
    };
    await createSheet(model, { sheetId: "42" });
    await activateSheet(model, "42");
    const transformed = repeatCoreCommand(model.getters, command);

    expect(transformed).toEqual({
      ...command,
      sheetId: "42",
      figureId: expect.not.stringMatching(command.figureId),
    });
  });

  test("Create sheet transform", async () => {
    await createSheet(model, { sheetId: "sheetId", name: "sheetName" });
    const command: CreateSheetCommand = {
      ...TEST_COMMANDS.CREATE_SHEET,
      sheetId: "sheetId",
      name: "sheetName",
    };
    const repeated = repeatCoreCommand(model.getters, command) as CreateSheetCommand;
    expect(repeated).toEqual({
      ...command,
      sheetId: expect.not.stringMatching("sheetId"),
      name: "sheetName1",
    });
    await createSheet(model, { ...repeated });

    expect(repeatCoreCommand(model.getters, repeated)).toEqual({
      ...command,
      sheetId: expect.not.stringMatching("sheetId"),
      name: "sheetName2",
    });
  });

  test.each([
    { dim: "COL", selection: "C1:D4", newBase: 2 },
    { dim: "ROW", selection: "A5", newBase: 4 },
  ])("Repeat add col/row command %s", async (args) => {
    await createSheet(model, { sheetId: "42" });
    const command: AddColumnsRowsCommand = {
      ...TEST_COMMANDS.ADD_COLUMNS_ROWS,
      dimension: args.dim as Dimension,
      sheetId,
      base: 0,
    };
    await activateSheet(model, "42");
    await setSelection(model, [args.selection]);
    const transformed = repeatCoreCommand(model.getters, command);
    expect(transformed).toEqual({
      ...command,
      base: args.newBase,
      sheetId: "42",
    });
  });

  test.each([
    { cmd: "REMOVE_COLUMNS_ROWS" as const, dim: "COL", selection: "C1:D4", expected: [2, 3] },
    { cmd: "REMOVE_COLUMNS_ROWS" as const, dim: "ROW", selection: "A5", expected: [4] },
    { cmd: "HIDE_COLUMNS_ROWS" as const, dim: "COL", selection: "A5", expected: [0] },
    { cmd: "HIDE_COLUMNS_ROWS" as const, dim: "ROW", selection: "C1:D3", expected: [0, 1, 2] },
  ])("Repeat delete/hide col/row command %s", async (args) => {
    await createSheet(model, { sheetId: "42" });
    const command: RemoveColumnsRowsCommand | HideColumnsRowsCommand = {
      type: args.cmd,
      dimension: args.dim as Dimension,
      sheetId,
      elements: [0, 1],
      sheetName: "42",
    };
    await activateSheet(model, "42");
    await setSelection(model, [args.selection]);
    const transformed = repeatCoreCommand(model.getters, command);
    expect(transformed).toEqual({
      ...command,
      elements: args.expected,
      sheetId: "42",
    });
  });

  test.each([
    { dim: "COL", selection: "C1:D4", affectedHeader: [2, 3] },
    { dim: "ROW", selection: "A5", affectedHeader: [4] },
  ])("Repeat resize col/row command %s", async (args) => {
    await createSheet(model, { sheetId: "42" });
    const command: ResizeColumnsRowsCommand = {
      ...TEST_COMMANDS.RESIZE_COLUMNS_ROWS,
      dimension: args.dim as Dimension,
      sheetId,
    };
    await activateSheet(model, "42");
    await setSelection(model, [args.selection]);
    const transformed = repeatCoreCommand(model.getters, command);
    expect(transformed).toEqual({
      ...command,
      elements: args.affectedHeader,
      sheetId: "42",
    });
  });

  test.each(["COL", "ROW"] as const)("Repeat group headers command %s", async (dimension) => {
    await createSheet(model, { sheetId: "42" });
    const command: GroupHeadersCommand = {
      ...TEST_COMMANDS.GROUP_HEADERS,
      dimension: dimension,
      sheetId,
    };
    await activateSheet(model, "42");
    await setSelection(model, ["A1:D4"]);
    const transformed = repeatCoreCommand(model.getters, command);
    expect(transformed).toEqual({
      ...command,
      sheetId: "42",
      start: 0,
      end: 3,
    });
  });

  test.each(["COL", "ROW"] as const)("Repeat ungroup headers command %s", async (dimension) => {
    await createSheet(model, { sheetId: "42" });
    const command: UnGroupHeadersCommand = {
      ...TEST_COMMANDS.UNGROUP_HEADERS,
      dimension: dimension,
      sheetId,
    };
    await activateSheet(model, "42");
    await setSelection(model, ["A1:D4"]);
    const transformed = repeatCoreCommand(model.getters, command);
    expect(transformed).toEqual({
      ...command,
      sheetId: "42",
      start: 0,
      end: 3,
    });
  });
});

describe("Repeat local commands", () => {
  test("Repeat Paste", async () => {
    await setCellContent(model, "A1", "A1");
    await setCellContent(model, "A2", "A2");
    await setFormatting(model, "A2", { fillColor: "red" });

    await addEqualCf(model, "A1:A2", { fillColor: "#FF0000" }, "1");
    await createTableWithFilter(model, "A1:A2");

    await setSelection(model, ["A1:A2"]);
    await copy(model);
    await paste(model, "B1");

    await setSelection(model, ["C1"]);
    await redo(model);
    expect(getCellContent(model, "C1")).toEqual("A1");
    expect(getCellContent(model, "C2")).toEqual("A2");
    expect(getStyle(model, "C2")).toMatchObject({ fillColor: "red" });
    expect(model.getters.isFilterHeader({ sheetId, col: 2, row: 0 })).toEqual(true);
    expect(model.getters.getRulesByCell(sheetId, 2, 0)).toBeTruthy();
  });

  test("Repeat Paste format only", async () => {
    await setCellContent(model, "A1", "A1");
    await setFormatting(model, "A1", { fillColor: "red" });

    await setSelection(model, ["A1"]);
    await copy(model);
    await paste(model, "B1", "onlyFormat");

    await setSelection(model, ["C1"]);
    await redo(model);
    expect(getCellContent(model, "C1")).toEqual("");
    expect(getStyle(model, "C1")).toEqual({ fillColor: "red" });
  });

  test("Local commands can be repeated multiple times", async () => {
    await setCellContent(model, "A1", "A1");
    await setSelection(model, ["A1"]);
    await copy(model);
    await paste(model, "B1");

    await setSelection(model, ["C1"]);
    await redo(model);
    expect(getCellContent(model, "C1")).toEqual("A1");

    await setSelection(model, ["C3"]);
    await redo(model);
    expect(getCellContent(model, "C3")).toEqual("A1");
  });

  test("Repeat insert cell", async () => {
    await setCellContent(model, "A3", "A3");
    await setCellContent(model, "B3", "B3");
    await setCellContent(model, "C3", "C3");

    await insertCells(model, "A1:A2", "down");

    await setSelection(model, ["B1"]);
    await redo(model);
    expect(getCellContent(model, "B3")).toEqual("");
    expect(getCellContent(model, "B4")).toEqual("B3");

    await setSelection(model, ["C1:C2"]);
    await redo(model);
    expect(getCellContent(model, "C3")).toEqual("");
    expect(getCellContent(model, "C5")).toEqual("C3");
  });

  test("Repeat delete cell", async () => {
    await setCellContent(model, "A3", "A3");
    await setCellContent(model, "B3", "B3");
    await setCellContent(model, "C3", "C3");

    await deleteCells(model, "A1:A2", "up");

    await setSelection(model, ["B1"]);
    await redo(model);
    expect(getCellContent(model, "B3")).toEqual("");
    expect(getCellContent(model, "B2")).toEqual("B3");

    await setSelection(model, ["C1:C2"]);
    await redo(model);
    expect(getCellContent(model, "C3")).toEqual("");
    expect(getCellContent(model, "C1")).toEqual("C3");
  });

  test("Repeat stop edition", async () => {
    const composerStore = makeTestComposerStore(model);
    composerStore.startEdition();
    composerStore.setCurrentContent("kikou");
    composerStore.stopEdition();
    expect(getCellContent(model, "A1")).toEqual("kikou");

    await setSelection(model, ["B1"]);
    await redo(model);
    expect(getCellContent(model, "B1")).toEqual("kikou");
  });

  test("Repeat set decimal", async () => {
    await setSelection(model, ["A1"]);
    await setCellContent(model, "A1", "1");
    await setDecimal(model, "A1", 1, sheetId);
    expect(getEvaluatedCell(model, "A1").formattedValue).toEqual("1.0");

    await redo(model);
    expect(getEvaluatedCell(model, "A1").formattedValue).toEqual("1.00");
  });

  test("Repeat autoresize rows", async () => {
    await resizeRows(model, [0, 2, 3], 100);
    await autoresizeRows(model, [0]);
    expect(model.getters.getRowSize(sheetId, 0)).toEqual(DEFAULT_CELL_HEIGHT);

    await setSelection(model, ["A3:A4"]);
    await redo(model);
    expect(model.getters.getRowSize(sheetId, 2)).toEqual(DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRowSize(sheetId, 3)).toEqual(DEFAULT_CELL_HEIGHT);
  });

  test("Repeat autoresize columns", async () => {
    await setCellContent(model, "A1", "A1");
    await setCellContent(model, "C1", "C1");
    await setCellContent(model, "D1", "D1");
    await resizeColumns(model, ["A", "C", "D"], 50);
    await autoresizeColumns(model, [0]);
    expect(model.getters.getColSize(sheetId, 0)).toEqual(34);

    await setSelection(model, ["C1:D1"]);
    await redo(model);
    expect(model.getters.getColSize(sheetId, 2)).toEqual(34);
    expect(model.getters.getColSize(sheetId, 3)).toEqual(34);
  });

  test("Repeat sort cells", async () => {
    await createSheet(model, { sheetId: "42" });
    await setCellContent(model, "A1", "A1", "42");
    await setCellContent(model, "A2", "A2", "42");
    await setCellContent(model, "A3", "A3", "42");

    await sort(model, {
      sheetId,
      zone: "C2:C3",
      anchor: "C2",
      direction: "desc",
    });

    await activateSheet(model, "42");
    await setSelection(model, ["A1:A3"]);
    await redo(model);
    expect(getCellContent(model, "A1")).toEqual("A3");
    expect(getCellContent(model, "A2")).toEqual("A2");
    expect(getCellContent(model, "A3")).toEqual("A1");
  });

  test("Repeat sum selection", async () => {
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");

    await automaticSum(model, "B1:B2");

    await setSelection(model, ["A1:A2"]);
    await redo(model);
    expect(getCellRawContent(model, "A3")).toEqual("=SUM(A1:A2)");
  });

  test("Repeat delete unfiltered content", async () => {
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");

    await deleteUnfilteredContent(model, "A1");
    expect(getCellContent(model, "A1")).toEqual("");
    expect(getCellContent(model, "A2")).toEqual("2");

    await setSelection(model, ["A2"]);
    await redo(model);
    expect(getCellContent(model, "A2")).toEqual("");
  });
});
