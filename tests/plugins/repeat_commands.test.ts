import { Model } from "../../src";
import {
  repeatCommandTransformRegistry,
  repeatCoreCommand,
  repeatLocalCommandTransformRegistry,
} from "../../src/registries/repeat_commands_registry";
import { CoreCommand, Dimension, UID } from "../../src/types";
import {
  AddColumnsRowsCommand,
  CreateChartCommand,
  CreateFigureCommand,
  CreateImageOverCommand,
  CreateSheetCommand,
  HideColumnsRowsCommand,
  RemoveColumnsRowsCommand,
  ResizeColumnsRowsCommand,
  SheetDependentCommand,
} from "../../src/types/commands";
import {
  activateSheet,
  copy,
  createFilter,
  createSheet,
  deleteCells,
  insertCells,
  paste,
  redo,
  resizeColumns,
  resizeRows,
  setCellContent,
  setSelection,
  setStyle,
  sort,
  undo,
} from "../test_helpers/commands_helpers";
import {
  getCell,
  getCellContent,
  getEvaluatedCell,
  getStyle,
} from "../test_helpers/getters_helpers";
import { target, toRangesData } from "../test_helpers/helpers";
import { DEFAULT_CELL_HEIGHT } from "./../../src/constants";
import { TEST_COMMANDS } from "./../test_helpers/constants";

let model: Model;
let sheetId: UID;

beforeEach(() => {
  model = new Model();
  sheetId = model.getters.getActiveSheetId();
});

describe("Repeat commands basics", () => {
  test("Repeatable core command list", () => {
    const repeatableCommands = [
      "UPDATE_CELL",
      "CLEAR_CELL",
      "DELETE_CONTENT",
      "ADD_MERGE",
      "REMOVE_MERGE",
      "SET_FORMATTING",
      "CLEAR_FORMATTING",
      "SET_BORDER",
      "CREATE_FILTER_TABLE",
      "REMOVE_FILTER_TABLE",
      "ADD_COLUMNS_ROWS",
      "REMOVE_COLUMNS_ROWS",
      "HIDE_COLUMNS_ROWS",
      "CREATE_SHEET",
      "CREATE_FIGURE",
      "CREATE_CHART",
      "CREATE_IMAGE",
      "HIDE_SHEET",
      "RESIZE_COLUMNS_ROWS",
    ].sort();
    const registryKeys = repeatCommandTransformRegistry.getKeys().sort();
    expect(repeatableCommands).toEqual(registryKeys);
  });

  test("Repeatable local command list", () => {
    const repeatableCommands = [
      "STOP_EDITION",
      "PASTE",
      "INSERT_CELL",
      "DELETE_CELL",
      "AUTORESIZE_COLUMNS",
      "AUTORESIZE_ROWS",
      "SORT_CELLS",
      "SUM_SELECTION",
      "SET_DECIMAL",
    ].sort();
    const registryKeys = repeatLocalCommandTransformRegistry.getKeys().sort();
    expect(repeatableCommands).toEqual(registryKeys);
  });

  test("Can repeat a command", () => {
    setCellContent(model, "A1", "hello");
    setSelection(model, ["B2"]);
    redo(model);
    expect(getCellContent(model, "B2")).toBe("hello");
  });

  test("Can undo repeated command", () => {
    setCellContent(model, "A1", "hello");
    setSelection(model, ["B2"]);
    redo(model);
    expect(getCellContent(model, "B2")).toBe("hello");

    undo(model);
    expect(getCellContent(model, "B2")).toBe("");
  });

  test("Can undo => redo => repeat command", () => {
    setCellContent(model, "A1", "hello");
    undo(model);
    expect(getCellContent(model, "A1")).toBe("");

    redo(model);
    expect(getCellContent(model, "A1")).toBe("hello");

    setSelection(model, ["B2"]);
    redo(model);
    expect(getCellContent(model, "B2")).toBe("hello");
  });
});

describe("Repeat command transform generics", () => {
  test.each([
    TEST_COMMANDS.UPDATE_CELL,
    TEST_COMMANDS.CLEAR_CELL,
    TEST_COMMANDS.DELETE_CONTENT,
    TEST_COMMANDS.ADD_MERGE,
    TEST_COMMANDS.REMOVE_MERGE,
    TEST_COMMANDS.SET_FORMATTING,
    TEST_COMMANDS.CLEAR_FORMATTING,
    TEST_COMMANDS.SET_BORDER,
    TEST_COMMANDS.CREATE_FILTER_TABLE,
    TEST_COMMANDS.REMOVE_FILTER_TABLE,
    TEST_COMMANDS.HIDE_SHEET,
  ])("Sheet dependant command are adapted to current sheet %s", (command: CoreCommand) => {
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    const transformed = repeatCoreCommand(model.getters, command);
    expect((transformed as SheetDependentCommand)?.sheetId).toEqual("42");
  });

  test.each([TEST_COMMANDS.UPDATE_CELL, TEST_COMMANDS.CLEAR_CELL, TEST_COMMANDS.SET_BORDER])(
    "Position dependant commands are adapted to current selection %s",
    (cmd: CoreCommand) => {
      setSelection(model, ["B2:C4"]);
      const transformed = repeatCoreCommand(model.getters, cmd);
      expect(transformed).toMatchObject({ col: 1, row: 1 });
    }
  );

  test.each([
    TEST_COMMANDS.ADD_MERGE,
    TEST_COMMANDS.REMOVE_MERGE,
    TEST_COMMANDS.CREATE_FILTER_TABLE,
    TEST_COMMANDS.REMOVE_FILTER_TABLE,
    TEST_COMMANDS.SET_FORMATTING,
    TEST_COMMANDS.CLEAR_FORMATTING,
  ])(
    "Target dependant commands have target equal to current current selection",
    (command: CoreCommand) => {
      setSelection(model, ["B2:C4"]);
      const transformed = repeatCoreCommand(model.getters, command);
      expect(transformed).toMatchObject({ target: target("B2:C4") });
    }
  );

  test("Commands not in repeatCommandRegistry aren't repeated", () => {
    const command = { type: "RANDOM_COMMAND", col: 0, row: 0, sheetId } as unknown as CoreCommand;
    const transformed = repeatCoreCommand(model.getters, command);
    expect(transformed).toBeUndefined();
  });
});

describe("Repeat command transform specifics", () => {
  test("Create Chart transform", () => {
    const command: CreateChartCommand = {
      ...TEST_COMMANDS.CREATE_CHART,
      type: "CREATE_CHART",
      id: "chartId",
      sheetId,
    };
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    const transformed = repeatCoreCommand(model.getters, command);
    expect(transformed).toEqual({
      ...command,
      id: expect.not.stringMatching("chartId"),
      sheetId: "42",
    });
  });

  test("Create image transform", () => {
    const command: CreateImageOverCommand = {
      ...TEST_COMMANDS.CREATE_IMAGE,
      sheetId,
      figureId: "figureId",
    };
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    const transformed = repeatCoreCommand(model.getters, command);
    expect(transformed).toEqual({
      ...command,
      figureId: expect.not.stringMatching("figureId"),
      sheetId: "42",
    });
  });

  test("Create figure transform", () => {
    const command: CreateFigureCommand = {
      ...TEST_COMMANDS.CREATE_FIGURE,
      sheetId,
    };
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    const transformed = repeatCoreCommand(model.getters, command);

    expect(transformed).toEqual({
      ...command,
      sheetId: "42",
      figure: {
        ...command.figure,
        id: expect.not.stringMatching(command.figure.id),
      },
    });
  });

  test("Create sheet transform", () => {
    createSheet(model, { sheetId: "sheetId", name: "sheetName" });
    let command: CreateSheetCommand = {
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
    model.dispatch("CREATE_SHEET", { ...repeated });

    expect(repeatCoreCommand(model.getters, repeated)).toEqual({
      ...command,
      sheetId: expect.not.stringMatching("sheetId"),
      name: "sheetName2",
    });
  });

  test.each([
    { dim: "COL", selection: "C1:D4", newBase: 2 },
    { dim: "ROW", selection: "A5", newBase: 4 },
  ])("Repeat add col/row command %s", (args) => {
    createSheet(model, { sheetId: "42" });
    const command: AddColumnsRowsCommand = {
      ...TEST_COMMANDS.ADD_COLUMNS_ROWS,
      dimension: args.dim as Dimension,
      sheetId,
      base: 0,
    };
    activateSheet(model, "42");
    setSelection(model, [args.selection]);
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
  ])("Repeat delete/hide col/row command %s", (args) => {
    createSheet(model, { sheetId: "42" });
    const command: RemoveColumnsRowsCommand | HideColumnsRowsCommand = {
      type: args.cmd,
      dimension: args.dim as Dimension,
      sheetId,
      elements: [0, 1],
    };
    activateSheet(model, "42");
    setSelection(model, [args.selection]);
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
  ])("Repeat resize col/row command %s", (args) => {
    createSheet(model, { sheetId: "42" });
    const command: ResizeColumnsRowsCommand = {
      ...TEST_COMMANDS.RESIZE_COLUMNS_ROWS,
      dimension: args.dim as Dimension,
      sheetId,
    };
    activateSheet(model, "42");
    setSelection(model, [args.selection]);
    const transformed = repeatCoreCommand(model.getters, command);
    expect(transformed).toEqual({
      ...command,
      elements: args.affectedHeader,
      sheetId: "42",
    });
  });
});

describe("Repeat local commands", () => {
  test("Repeat Paste", () => {
    setCellContent(model, "A1", "A1");
    setCellContent(model, "A2", "A2");
    setStyle(model, "A2", { fillColor: "red" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      ...TEST_COMMANDS.ADD_CONDITIONAL_FORMAT,
      ranges: toRangesData(sheetId, "A1:A2"),
    });
    createFilter(model, "A1:A2");

    setSelection(model, ["A1:A2"]);
    copy(model);
    paste(model, "B1");

    setSelection(model, ["C1"]);
    redo(model);
    expect(getCellContent(model, "C1")).toEqual("A1");
    expect(getCellContent(model, "C2")).toEqual("A2");
    expect(getStyle(model, "C2")).toEqual({ fillColor: "red" });
    expect(model.getters.isFilterHeader({ sheetId, col: 2, row: 0 })).toEqual(true);
    expect(model.getters.getRulesByCell(sheetId, 2, 0)).toBeTruthy();
  });

  test("Repeat Paste format only", () => {
    setCellContent(model, "A1", "A1");
    setStyle(model, "A1", { fillColor: "red" });

    setSelection(model, ["A1"]);
    copy(model);
    paste(model, "B1", "onlyFormat");

    setSelection(model, ["C1"]);
    redo(model);
    expect(getCellContent(model, "C1")).toEqual("");
    expect(getStyle(model, "C1")).toEqual({ fillColor: "red" });
  });

  test("Local commands can be repeated multiple times", () => {
    setCellContent(model, "A1", "A1");
    setSelection(model, ["A1"]);
    copy(model);
    paste(model, "B1");

    setSelection(model, ["C1"]);
    redo(model);
    expect(getCellContent(model, "C1")).toEqual("A1");

    setSelection(model, ["C3"]);
    redo(model);
    expect(getCellContent(model, "C3")).toEqual("A1");
  });

  test("Repeat insert cell", () => {
    setCellContent(model, "A3", "A3");
    setCellContent(model, "B3", "B3");
    setCellContent(model, "C3", "C3");

    insertCells(model, "A1:A2", "down");

    setSelection(model, ["B1"]);
    redo(model);
    expect(getCellContent(model, "B3")).toEqual("");
    expect(getCellContent(model, "B4")).toEqual("B3");

    setSelection(model, ["C1:C2"]);
    redo(model);
    expect(getCellContent(model, "C3")).toEqual("");
    expect(getCellContent(model, "C5")).toEqual("C3");
  });

  test("Repeat delete cell", () => {
    setCellContent(model, "A3", "A3");
    setCellContent(model, "B3", "B3");
    setCellContent(model, "C3", "C3");

    deleteCells(model, "A1:A2", "up");

    setSelection(model, ["B1"]);
    redo(model);
    expect(getCellContent(model, "B3")).toEqual("");
    expect(getCellContent(model, "B2")).toEqual("B3");

    setSelection(model, ["C1:C2"]);
    redo(model);
    expect(getCellContent(model, "C3")).toEqual("");
    expect(getCellContent(model, "C1")).toEqual("C3");
  });

  test("Repeat stop edition", () => {
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", { content: "kikou" });
    model.dispatch("STOP_EDITION");
    expect(getCellContent(model, "A1")).toEqual("kikou");

    setSelection(model, ["B1"]);
    redo(model);
    expect(getCellContent(model, "B1")).toEqual("kikou");
  });

  test("Repeat set decimal", () => {
    setSelection(model, ["A1"]);
    setCellContent(model, "A1", "1");
    model.dispatch("SET_DECIMAL", { target: target("A1"), step: 1, sheetId });
    expect(getEvaluatedCell(model, "A1").formattedValue).toEqual("1.0");

    redo(model);
    expect(getEvaluatedCell(model, "A1").formattedValue).toEqual("1.00");
  });

  test("Repeat autoresize rows", () => {
    resizeRows(model, [0, 2, 3], 100);
    model.dispatch("AUTORESIZE_ROWS", {
      sheetId,
      rows: [0],
    });
    expect(model.getters.getRowSize(sheetId, 0)).toEqual(DEFAULT_CELL_HEIGHT);

    setSelection(model, ["A3:A4"]);
    redo(model);
    expect(model.getters.getRowSize(sheetId, 2)).toEqual(DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRowSize(sheetId, 3)).toEqual(DEFAULT_CELL_HEIGHT);
  });

  test("Repeat autoresize columns", () => {
    setCellContent(model, "A1", "A1");
    setCellContent(model, "C1", "C1");
    setCellContent(model, "D1", "D1");
    resizeColumns(model, ["A", "C", "D"], 50);
    model.dispatch("AUTORESIZE_COLUMNS", {
      sheetId,
      cols: [0],
    });
    expect(model.getters.getColSize(sheetId, 0)).toEqual(34);

    setSelection(model, ["C1:D1"]);
    redo(model);
    expect(model.getters.getColSize(sheetId, 2)).toEqual(34);
    expect(model.getters.getColSize(sheetId, 3)).toEqual(34);
  });

  test("Repeat sort cells", () => {
    createSheet(model, { sheetId: "42" });
    setCellContent(model, "A1", "A1", "42");
    setCellContent(model, "A2", "A2", "42");
    setCellContent(model, "A3", "A3", "42");

    sort(model, {
      sheetId,
      zone: "C2:C3",
      anchor: "C2",
      direction: "descending",
    });

    activateSheet(model, "42");
    setSelection(model, ["A1:A3"]);
    redo(model);
    expect(getCellContent(model, "A1")).toEqual("A3");
    expect(getCellContent(model, "A2")).toEqual("A2");
    expect(getCellContent(model, "A3")).toEqual("A1");
  });

  test("Repeat sum selection", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");

    setSelection(model, ["B1:B2"]);
    model.dispatch("SUM_SELECTION");

    setSelection(model, ["A1:A2"]);
    redo(model);
    expect(getCell(model, "A3")?.content).toEqual("=SUM(A1:A2)");
  });
});
