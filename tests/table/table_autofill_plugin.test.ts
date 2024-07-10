import { Model, UID } from "../../src";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { DEFAULT_TABLE_CONFIG } from "../../src/helpers/table_presets";
import {
  copy,
  createTable,
  cut,
  paste,
  redo,
  selectCell,
  setCellContent,
  undo,
} from "../test_helpers/commands_helpers";
import { getCell } from "../test_helpers/getters_helpers";
import { makeStore } from "../test_helpers/stores";

const TABLE_CONFIG_NO_HEADERS = { ...DEFAULT_TABLE_CONFIG, numberOfHeaders: 0, hasFilters: false };

let model: Model;
let sheetId: UID;

describe("Table formula autofill ", () => {
  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  test("Can autofill a formula on a table column", () => {
    createTable(model, "C3:D5", TABLE_CONFIG_NO_HEADERS);
    setCellContent(model, "C3", "=A1");
    model.dispatch("AUTOFILL_TABLE_COLUMN", { col: 2, row: 2, sheetId });
    expect(getCell(model, "C3")?.content).toEqual("=A1");
    expect(getCell(model, "C4")?.content).toEqual("=A2");
    expect(getCell(model, "C5")?.content).toEqual("=A3");
  });

  test("Autofill is not active with the automaticAutofill table option set to false", () => {
    createTable(model, "A1:B3", { ...TABLE_CONFIG_NO_HEADERS, automaticAutofill: false });
    setCellContent(model, "A1", "=C1");
    model.dispatch("AUTOFILL_TABLE_COLUMN", { col: 0, row: 0, sheetId });
    expect(getCell(model, "A1")?.content).toEqual("=C1");
    expect(getCell(model, "A2")?.content).toEqual(undefined);
  });

  test("Table headers are not auto-filled ", () => {
    createTable(model, "A1:B3", { ...DEFAULT_TABLE_CONFIG, numberOfHeaders: 1 });
    setCellContent(model, "A1", "=C1");
    model.dispatch("AUTOFILL_TABLE_COLUMN", { col: 0, row: 0, sheetId });
    expect(getCell(model, "A1")?.content).toEqual("=C1");
    expect(getCell(model, "A2")?.content).toEqual(undefined);
    expect(getCell(model, "A3")?.content).toEqual(undefined);

    setCellContent(model, "B2", "=C2");
    model.dispatch("AUTOFILL_TABLE_COLUMN", { col: 1, row: 1, sheetId });
    expect(getCell(model, "B1")?.content).toEqual(undefined);
    expect(getCell(model, "B2")?.content).toEqual("=C2");
    expect(getCell(model, "B3")?.content).toEqual("=C3");
  });

  test("Autofill on something else than a formula does not autofill the column", () => {
    createTable(model, "A1:B3", TABLE_CONFIG_NO_HEADERS);
    setCellContent(model, "A1", "hello");
    model.dispatch("AUTOFILL_TABLE_COLUMN", { col: 0, row: 0, sheetId });
    expect(getCell(model, "A1")?.content).toEqual("hello");
    expect(getCell(model, "A2")?.content).toEqual(undefined);
  });

  test("Autofill works both above and below the inputted formula", () => {
    createTable(model, "A1:B3", TABLE_CONFIG_NO_HEADERS);
    setCellContent(model, "A2", "=C2");
    model.dispatch("AUTOFILL_TABLE_COLUMN", { col: 0, row: 1, sheetId });
    expect(getCell(model, "A1")?.content).toEqual("=C1");
    expect(getCell(model, "A2")?.content).toEqual("=C2");
    expect(getCell(model, "A3")?.content).toEqual("=C3");
  });

  test("Do not autofill non-empty columns", () => {
    createTable(model, "A1:B3", TABLE_CONFIG_NO_HEADERS);
    setCellContent(model, "A3", "hello");
    setCellContent(model, "A1", "=C1");
    model.dispatch("AUTOFILL_TABLE_COLUMN", { col: 0, row: 0, sheetId });
    expect(getCell(model, "A1")?.content).toEqual("=C1");
    expect(getCell(model, "A2")?.content).toEqual(undefined);
    expect(getCell(model, "A3")?.content).toEqual("hello");
  });
});

describe("Table autofill with composer", () => {
  let composerStore: CellComposerStore;

  function editCell(model: Model, xc: string, content: string) {
    selectCell(model, xc);
    composerStore.startEdition(content);
    composerStore.stopEdition();
  }

  beforeEach(() => {
    ({ model, store: composerStore } = makeStore(CellComposerStore));
  });

  test("Editing a cell autofill the table column", () => {
    createTable(model, "A1:B3", TABLE_CONFIG_NO_HEADERS);
    editCell(model, "A1", "=C1");
    expect(getCell(model, "A1")?.content).toEqual("=C1");
    expect(getCell(model, "A2")?.content).toEqual("=C2");
    expect(getCell(model, "A3")?.content).toEqual("=C3");
  });

  test("Undo/redo table formula autofill with composer", () => {
    createTable(model, "A1:B3", TABLE_CONFIG_NO_HEADERS);
    editCell(model, "A1", "=C1");
    expect(getCell(model, "A1")?.content).toEqual("=C1");
    expect(getCell(model, "A2")?.content).toEqual("=C2");

    // Unfortunately, we cannot do the editCell + the autofill in a single history step
    undo(model);
    expect(getCell(model, "A1")?.content).toEqual("=C1");
    expect(getCell(model, "A2")?.content).toEqual(undefined);

    undo(model);
    expect(getCell(model, "A1")?.content).toEqual(undefined);
    expect(getCell(model, "A2")?.content).toEqual(undefined);

    redo(model);
    expect(getCell(model, "A1")?.content).toEqual("=C1");
    expect(getCell(model, "A2")?.content).toEqual(undefined);

    redo(model);
    expect(getCell(model, "A1")?.content).toEqual("=C1");
    expect(getCell(model, "A2")?.content).toEqual("=C2");
  });
});

describe("Table autofill with copy/paste", () => {
  beforeEach(() => {
    model = new Model();
  });

  test("Copy paste a formula autofill the table column", () => {
    createTable(model, "C3:C5", TABLE_CONFIG_NO_HEADERS);
    setCellContent(model, "A1", "=B1");
    copy(model, "A1");
    paste(model, "C3");

    expect(getCell(model, "C3")?.content).toEqual("=D3");
    expect(getCell(model, "C4")?.content).toEqual("=D4");
    expect(getCell(model, "C5")?.content).toEqual("=D5");
  });

  test("Cut/paste a formula autofill the table column", () => {
    createTable(model, "C3:C5", TABLE_CONFIG_NO_HEADERS);
    setCellContent(model, "A1", "=B1");
    cut(model, "A1");
    paste(model, "C3");

    expect(getCell(model, "A1")).toEqual(undefined);
    expect(getCell(model, "C3")?.content).toEqual("=B1");
    expect(getCell(model, "C4")?.content).toEqual("=B2");
    expect(getCell(model, "C5")?.content).toEqual("=B3");
  });

  test("Copy/paste multiple columns autofill each column", () => {
    createTable(model, "C3:D4", TABLE_CONFIG_NO_HEADERS);
    setCellContent(model, "C1", "=D1");
    setCellContent(model, "D1", "=E1");

    copy(model, "C1:D1");
    paste(model, "C3");

    expect(getCell(model, "C3")?.content).toEqual("=D3");
    expect(getCell(model, "C4")?.content).toEqual("=D4");
    expect(getCell(model, "D3")?.content).toEqual("=E3");
    expect(getCell(model, "D4")?.content).toEqual("=E4");
  });

  test("Copy/paste multiple rows does not autofill the table column", () => {
    createTable(model, "A1:A3", TABLE_CONFIG_NO_HEADERS);
    setCellContent(model, "B1", "=C1");
    setCellContent(model, "B2", "=C2");

    copy(model, "B1:B2");
    paste(model, "A1");

    expect(getCell(model, "A1")?.content).toEqual("=B1");
    expect(getCell(model, "A2")?.content).toEqual("=B2");
    expect(getCell(model, "A3")?.content).toEqual(undefined);
  });

  test("Can undo/redo table autofill on paste", () => {
    createTable(model, "A1:A2", TABLE_CONFIG_NO_HEADERS);
    setCellContent(model, "B1", "=C1");

    copy(model, "B1");
    paste(model, "A1");
    expect(getCell(model, "A1")?.content).toEqual("=B1");
    expect(getCell(model, "A2")?.content).toEqual("=B2");

    undo(model);
    expect(getCell(model, "A1")?.content).toEqual(undefined);
    expect(getCell(model, "A2")?.content).toEqual(undefined);

    redo(model);
    expect(getCell(model, "A1")?.content).toEqual("=B1");
    expect(getCell(model, "A2")?.content).toEqual("=B2");
  });
});
