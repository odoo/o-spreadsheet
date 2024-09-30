import { CommandResult, Model } from "../../src";
import { DEFAULT_BORDER_DESC } from "../../src/constants";
import { toUnboundedZone, toZone, zoneToXc } from "../../src/helpers";
import { TABLE_PRESETS } from "../../src/helpers/table_presets";
import { UID } from "../../src/types";
import {
  addColumns,
  addRows,
  copy,
  createSheet,
  createTable,
  cut,
  deleteColumns,
  deleteContent,
  deleteRows,
  deleteTable,
  insertCells,
  merge,
  paste,
  redo,
  setCellContent,
  setStyle,
  undo,
  updateFilter,
  updateTableConfig,
  updateTableZone,
} from "../test_helpers/commands_helpers";
import {
  getBorder,
  getCell,
  getCellContent,
  getFilter,
  getTable,
} from "../test_helpers/getters_helpers";
import { getFilterHiddenValues, toRangeData } from "../test_helpers/helpers";
import { DEFAULT_TABLE_CONFIG } from "./../../src/helpers/table_presets";

const oldTablePresets = { ...TABLE_PRESETS };
beforeEach(() => {
  TABLE_PRESETS.TestStyleAllRed = {
    category: "dark",
    colorName: "Red",
    wholeTable: { style: { fillColor: "#FF0000" }, border: { top: DEFAULT_BORDER_DESC } },
  };
});

afterEach(() => {
  Object.keys(TABLE_PRESETS).forEach((key) => delete TABLE_PRESETS[key]);
  Object.assign(TABLE_PRESETS, oldTablePresets);
});

describe("Table plugin", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  describe("Dispatch results", () => {
    test("Create table is correctly rejected if given invalid zone", () => {
      expect(
        model.dispatch("CREATE_TABLE", {
          sheetId: model.getters.getActiveSheetId(),
          ranges: [{ _sheetId: sheetId, _zone: { top: -1, bottom: 0, right: 5, left: 9 } }],
        })
      ).toBeCancelledBecause(CommandResult.InvalidRange);
    });

    test("Create table is correctly rejected for target out of sheet", () => {
      expect(createTable(model, "A1:A1000")).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
    });

    test.each(["A1,B3", "A1:B2,A3", "A1,B1:B2"])(
      "For multiple targets, create table is correctly rejected for non-continuous target",
      (target) => {
        expect(createTable(model, target)).toBeCancelledBecause(CommandResult.NonContinuousTargets);
      }
    );

    test.each(["A1", "B1:B10,A1:A10"])(
      "Create table is correctly rejected for target overlapping another table",
      (target) => {
        createTable(model, "A1:A10");
        expect(createTable(model, target)).toBeCancelledBecause(CommandResult.TableOverlap);
      }
    );

    test("Create table is correctly rejected for invalid config", () => {
      expect(
        createTable(model, "A1:A3", { ...DEFAULT_TABLE_CONFIG, styleId: "NotARealTableStyle" })
      ).toBeCancelledBecause(CommandResult.InvalidTableConfig);
    });

    describe("merges", () => {
      test("Creating a table removes the merges in its zone", () => {
        merge(model, "A1:B1");
        createTable(model, "A1:A5");
        expect(model.getters.getTables(sheetId)).toHaveLength(1);
        expect(model.getters.getMerges(sheetId)).toHaveLength(0);
      });

      test("Updating a table zone removes the merges in its zone", () => {
        createTable(model, "A1:A3");
        merge(model, "B1:B2");
        updateTableZone(model, "A1", "A1:B3");
        expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toBe("A1:B3");
        expect(model.getters.getMerges(sheetId)).toHaveLength(0);
      });

      test("Add Merge is correctly rejected when the merge is partially inside a table", () => {
        createTable(model, "A1:A5");
        expect(merge(model, "A1:B1")).toBeCancelledBecause(CommandResult.MergeInTable);
      });

      test("Add Merge is correctly rejected when creating a merge inside a table", () => {
        createTable(model, "A1:A5");
        expect(merge(model, "A1:A2")).toBeCancelledBecause(CommandResult.MergeInTable);
      });
    });

    test("Cannot update a non-existing table", () => {
      expect(
        model.dispatch("UPDATE_TABLE", {
          sheetId,
          zone: toZone("A1:A5"),
          config: { bandedColumns: true },
        })
      ).toBeCancelledBecause(CommandResult.TableNotFound);
    });

    test("Cannot update a table zone to a wrong zone", () => {
      createTable(model, "A1:A5");

      expect(updateTableZone(model, "A1", "A1:A600")).toBeCancelledBecause(
        CommandResult.TargetOutOfSheet
      );

      createTable(model, "B1:B5");
      expect(updateTableZone(model, "A1", "A1:B5")).toBeCancelledBecause(
        CommandResult.TableOverlap
      );
    });

    test("Cannot update a table with a wrong config", () => {
      createTable(model, "A1:A5");
      createTable(model, "B1:B5");
      expect(updateTableConfig(model, "A1", { numberOfHeaders: -5 })).toBeCancelledBecause(
        CommandResult.InvalidTableConfig
      );

      expect(updateTableConfig(model, "A1", { styleId: "notARealStyleId" })).toBeCancelledBecause(
        CommandResult.InvalidTableConfig
      );

      let configUpdate = { numberOfHeaders: 0, hasFilters: true };
      expect(updateTableConfig(model, "A1", configUpdate)).toBeCancelledBecause(
        CommandResult.InvalidTableConfig
      );
    });
  });

  describe("Creating and updating a table", () => {
    test("Can create a table", () => {
      createTable(model, "A1:A5", { ...DEFAULT_TABLE_CONFIG, bandedColumns: true });
      expect(getTable(model, "A1")).toMatchObject({
        range: { zone: toZone("A1:A5") },
        config: { ...DEFAULT_TABLE_CONFIG, bandedColumns: true },
      });

      expect(getFilter(model, "A1")).toMatchObject({
        rangeWithHeaders: { zone: toZone("A1:A5") },
        filteredRange: { zone: toZone("A2:A5") },
        col: 0,
        id: expect.any(String),
      });
    });

    test("Can create a table on multiple target if they are continuous", () => {
      createTable(model, "A1:A5,B1:B5");
      expect(getTable(model, "A1")?.range.zone).toEqual(toZone("A1:B5"));
    });

    test("Can create a table on unbounded zone", () => {
      createTable(model, "A:A,B:B");
      expect(getTable(model, "A1")?.range).toMatchObject({ unboundedZone: toUnboundedZone("A:B") });
    });

    test("Create a table with multiple target create a single table of the union of the targets", () => {
      createTable(model, "A1:A5, B1:B5");
      expect(getTable(model, "A1")?.range.zone).toEqual(toZone("A1:B5"));
    });

    test("Create new table on sheet duplication", () => {
      createTable(model, "A1:A3");
      updateFilter(model, "A1", ["C"]);

      const sheet2Id = "42";
      model.dispatch("DUPLICATE_SHEET", {
        sheetId: sheetId,
        sheetIdTo: sheet2Id,
      });
      expect(getFilterHiddenValues(model, sheet2Id)).toMatchObject([
        { zone: "A1:A3", value: ["C"] },
      ]);
      updateFilter(model, "A1", ["D"], sheet2Id);

      expect(getFilterHiddenValues(model, sheetId)).toMatchObject([
        { zone: "A1:A3", value: ["C"] },
      ]);
      expect(getFilterHiddenValues(model, sheet2Id)).toMatchObject([
        { zone: "A1:A3", value: ["D"] },
      ]);
    });

    test("Can update a table zone", () => {
      createTable(model, "A1:A5");
      updateTableZone(model, "A1", "A1:A6");
      expect(getTable(model, "A1")?.range.zone).toEqual(toZone("A1:A6"));
    });

    test("Can update a table config", () => {
      createTable(model, "A1:A5");
      updateTableConfig(model, "A1", { bandedColumns: true });
      expect(getTable(model, "A1")!.config).toMatchObject({ bandedColumns: true });
    });

    test("Updated table config is sanitized", () => {
      createTable(model, "A1:A5");
      expect(getTable(model, "A1")!.config).toMatchObject({
        numberOfHeaders: 1,
        hasFilters: true,
      });

      // Disabling the header rows should disable the filters
      updateTableConfig(model, "A1", { numberOfHeaders: 0 });
      expect(getTable(model, "A1")!.config).toMatchObject({
        numberOfHeaders: 0,
        hasFilters: false,
      });

      // Enabling the filters should enable the header row
      updateTableConfig(model, "A1", { hasFilters: true });
      expect(getTable(model, "A1")!.config).toMatchObject({
        numberOfHeaders: 1,
        hasFilters: true,
      });
    });

    test("Filtered zone is updated when the number of headers change", () => {
      createTable(model, "A1:A5");
      expect(getFilter(model, "A1")?.filteredRange?.zone).toEqual(toZone("A2:A5"));
      updateTableConfig(model, "A1", { numberOfHeaders: 3 });
      expect(getFilter(model, "A1")?.filteredRange?.zone).toEqual(toZone("A4:A5"));
    });

    test("Table is deleted on a DELETE_CONTENT on a zone containing the table", () => {
      createTable(model, "A1:A5");

      deleteContent(model, ["A1:A2"]);
      expect(getTable(model, "A1")).toBeTruthy();

      deleteContent(model, ["A1:A5"]);
      expect(getTable(model, "A1")).toBeFalsy();
    });
  });

  describe("Table Zone Expansion", () => {
    test("Table zone is expanded when creating a new cell just below the table", () => {
      createTable(model, "A1:B3");
      updateFilter(model, "A1", ["C"]);
      setCellContent(model, "A4", "Something");
      setCellContent(model, "B5", "Something Else");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:B5");
      expect(getFilterHiddenValues(model)).toEqual([
        { zone: "A1:A5", value: ["C"] },
        { zone: "B1:B5", value: [] },
      ]);
    });

    test("Table zone is expanded when creating cells right of the table", () => {
      createTable(model, "B1:B3");
      updateFilter(model, "B1", ["C"]);
      setCellContent(model, "A1", "Something");
      setCellContent(model, "C3", "Something Else");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("B1:C3");
      expect(getFilterHiddenValues(model)).toEqual([
        { zone: "B1:B3", value: ["C"] },
        { zone: "C1:C3", value: [] },
      ]);
    });

    test("Table zone is not expended at creation", () => {
      setCellContent(model, "A4", "Something");
      createTable(model, "A1:A3");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:A3");
      expect(getFilterHiddenValues(model)).toEqual([{ zone: "A1:A3", value: [] }]);
    });

    test("Table zone is not expanded when modifying existing cell", () => {
      setCellContent(model, "A4", "Something");
      createTable(model, "A1:A3");
      setCellContent(model, "A4", "Something Else");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:A3");
      expect(getFilterHiddenValues(model)).toEqual([{ zone: "A1:A3", value: [] }]);
    });

    test("Table zone is not expanded when another cell below the table had a content", () => {
      setCellContent(model, "B4", "Something");
      createTable(model, "A1:B3");
      setCellContent(model, "A4", "Something Else");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:B3");
    });

    test("Table zone is expanded when another cell below the table had a a style but no content", () => {
      setStyle(model, "B4", { fillColor: "#000000" });
      createTable(model, "A1:B3");
      setCellContent(model, "A4", "Something");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:B4");
    });

    test("Table zone is expanded when a cell on the row below the table but not below the table had a content", () => {
      setCellContent(model, "B4", "Something");
      createTable(model, "A1:A3");
      setCellContent(model, "A4", "Something Else");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:A4");
    });

    test("Table zone is not expanded when there was another table table below it", () => {
      createTable(model, "A1:B3");
      createTable(model, "B4:B6");
      setCellContent(model, "A4", "Something");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:B3");
    });

    test("Table zone is not expanded when there was a merge below it", () => {
      createTable(model, "A1:B3");
      merge(model, "B4:B6");
      setCellContent(model, "A4", "Something");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:B3");
    });
  });

  describe("Grid manipulation", () => {
    let model: Model;
    let sheetId: UID;
    beforeEach(() => {
      model = new Model();
      createTable(model, "C3:F6");
      updateFilter(model, "C3", ["C"]);
      updateFilter(model, "D3", ["D"]);
      updateFilter(model, "E3", ["E"]);
      updateFilter(model, "F3", ["F"]);
      sheetId = model.getters.getActiveSheetId();
    });

    describe("Add columns", () => {
      test("Before the zone", () => {
        addColumns(model, "before", "A", 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("D3:G6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "D3:D6", value: ["C"] },
          { zone: "E3:E6", value: ["D"] },
          { zone: "F3:F6", value: ["E"] },
          { zone: "G3:G6", value: ["F"] },
        ]);
      });

      test("On the left part of the zone, add a column before", () => {
        addColumns(model, "before", "C", 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("D3:G6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "D3:D6", value: ["C"] },
          { zone: "E3:E6", value: ["D"] },
          { zone: "F3:F6", value: ["E"] },
          { zone: "G3:G6", value: ["F"] },
        ]);
      });

      test("On the left part of the zone, add a column after", () => {
        addColumns(model, "after", "C", 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:G6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: [] },
          { zone: "E3:E6", value: ["D"] },
          { zone: "F3:F6", value: ["E"] },
          { zone: "G3:G6", value: ["F"] },
        ]);
      });

      test("On the right part of the zone, add a column before", () => {
        addColumns(model, "before", "F", 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:G6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: [] },
          { zone: "G3:G6", value: ["F"] },
        ]);
      });

      test("On the right part of the zone, add a column after", () => {
        addColumns(model, "after", "F", 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });

      test("After the zone", () => {
        addColumns(model, "after", "H", 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });
    });

    describe("Delete columns", () => {
      test("Before the zone", () => {
        deleteColumns(model, ["A"]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("B3:E6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "B3:B6", value: ["C"] },
          { zone: "C3:C6", value: ["D"] },
          { zone: "D3:D6", value: ["E"] },
          { zone: "E3:E6", value: ["F"] },
        ]);
      });

      test("On the left part of the zone", () => {
        deleteColumns(model, ["C"]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:E6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["D"] },
          { zone: "D3:D6", value: ["E"] },
          { zone: "E3:E6", value: ["F"] },
        ]);
      });

      test("Inside the zone", () => {
        deleteColumns(model, ["D"]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:E6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["E"] },
          { zone: "E3:E6", value: ["F"] },
        ]);
      });

      test("On the right part of the zone", () => {
        deleteColumns(model, ["F"]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:E6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
        ]);
      });

      test("After the zone", () => {
        deleteColumns(model, ["H"]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });

      test("Delete all the cols of the table ", () => {
        deleteColumns(model, ["C", "D", "E", "F"]);
        expect(model.getters.getTables(sheetId).length).toBe(0);
      });
    });

    describe("Add rows", () => {
      test("Before the zone", () => {
        addRows(model, "before", 0, 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C4:F7"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C4:C7", value: ["C"] },
          { zone: "D4:D7", value: ["D"] },
          { zone: "E4:E7", value: ["E"] },
          { zone: "F4:F7", value: ["F"] },
        ]);
      });

      test("On the top part of the zone, add a row before", () => {
        addRows(model, "before", 2, 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C4:F7"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C4:C7", value: ["C"] },
          { zone: "D4:D7", value: ["D"] },
          { zone: "E4:E7", value: ["E"] },
          { zone: "F4:F7", value: ["F"] },
        ]);
      });

      test("On the top part of the zone, add a row after", () => {
        addRows(model, "after", 2, 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F7"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C7", value: ["C"] },
          { zone: "D3:D7", value: ["D"] },
          { zone: "E3:E7", value: ["E"] },
          { zone: "F3:F7", value: ["F"] },
        ]);
      });

      test("On the bottom part of the zone, add a row before", () => {
        addRows(model, "before", 5, 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F7"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C7", value: ["C"] },
          { zone: "D3:D7", value: ["D"] },
          { zone: "E3:E7", value: ["E"] },
          { zone: "F3:F7", value: ["F"] },
        ]);
      });

      test("On the bottom part of the zone, add a row after", () => {
        addRows(model, "after", 5, 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });

      test("After the zone", () => {
        addRows(model, "after", 7, 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });
    });

    describe("Delete rows", () => {
      test("Before the zone", () => {
        deleteRows(model, [0]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C2:F5"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C2:C5", value: ["C"] },
          { zone: "D2:D5", value: ["D"] },
          { zone: "E2:E5", value: ["E"] },
          { zone: "F2:F5", value: ["F"] },
        ]);
      });

      test("Inside the zone", () => {
        deleteRows(model, [3]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F5"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C5", value: ["C"] },
          { zone: "D3:D5", value: ["D"] },
          { zone: "E3:E5", value: ["E"] },
          { zone: "F3:F5", value: ["F"] },
        ]);
      });

      test("On the right part of the zone", () => {
        deleteRows(model, [5]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F5"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C5", value: ["C"] },
          { zone: "D3:D5", value: ["D"] },
          { zone: "E3:E5", value: ["E"] },
          { zone: "F3:F5", value: ["F"] },
        ]);
      });

      test("After the zone", () => {
        deleteRows(model, [7]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });

      test("Delete all the rows of the table", () => {
        deleteRows(model, [2, 3, 4, 5]);
        expect(model.getters.getTables(sheetId).length).toBe(0);
      });
    });

    test("Inserting cell above a table do not shift down the filters columns", () => {
      insertCells(model, "C1", "down");
      expect(getTable(model, "C3")).toMatchObject({
        range: { zone: toZone("C3:F6") },
      });
      expect(getFilter(model, "C3")).toMatchObject({
        rangeWithHeaders: { zone: toZone("C3:C6") },
      });
    });
  });

  describe("Undo/Redo", () => {
    test("Can undo/redo creating a table", () => {
      const model = new Model();
      createTable(model, "C1:C4");
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.getTables(sheetId).length).toBe(1);
      undo(model);
      expect(model.getters.getTables(sheetId).length).toBe(0);
      redo(model);
      expect(model.getters.getTables(sheetId).length).toBe(1);
    });

    test("Can undo/redo deleting a table", () => {
      const model = new Model();
      createTable(model, "A1:A4");
      expect(getFilter(model, "A1")).toBeTruthy();
      deleteTable(model, "A1");
      expect(getFilter(model, "A1")).toBeFalsy();
      undo(model);
      expect(getFilter(model, "A1")).toBeTruthy();
      redo(model);
      expect(getFilter(model, "A1")).toBeFalsy();
    });

    test("Can undo/redo update a table", () => {
      const model = new Model();
      createTable(model, "A1:A4");

      model.dispatch("UPDATE_TABLE", {
        sheetId,
        zone: toZone("A1:A4"),
        newTableRange: toRangeData(sheetId, "A1:B4"),
        config: { bandedColumns: true, styleId: "TableStyleDark2" },
      });
      expect(getTable(model, "A1")!).toMatchObject({
        range: { zone: toZone("A1:B4") },
        config: { bandedColumns: true, styleId: "TableStyleDark2" },
      });

      undo(model);
      expect(getTable(model, "A1")!).toMatchObject({
        range: { zone: toZone("A1:A4") },
        config: DEFAULT_TABLE_CONFIG,
      });
      redo(model);
      expect(getTable(model, "A1")!).toMatchObject({
        range: { zone: toZone("A1:B4") },
        config: { bandedColumns: true, styleId: "TableStyleDark2" },
      });
    });
  });

  describe("Copy/Cut/Paste tables", () => {
    test("Can copy and paste a whole table", () => {
      createTable(model, "A1:B4");
      updateTableConfig(model, "A1", { bandedColumns: true, styleId: "TableStyleDark2" });
      updateFilter(model, "A1", ["thisIsAValue"]);

      copy(model, "A1:B4");
      paste(model, "A5");
      expect(getTable(model, "A1")).toBeTruthy();
      const copiedTable = getTable(model, "A5");
      expect(copiedTable).toBeTruthy();
      expect(copiedTable!.config).toMatchObject({
        ...DEFAULT_TABLE_CONFIG,
        bandedColumns: true,
        styleId: "TableStyleDark2",
      });
      expect(
        model.getters.getFilterHiddenValues({
          sheetId,
          col: copiedTable!.range.zone.left,
          row: copiedTable!.range.zone.top,
        })
      ).toEqual(["thisIsAValue"]);
    });

    test("Can cut and paste a whole table", () => {
      createTable(model, "A1:B4");
      updateFilter(model, "A1", ["thisIsAValue"]);

      cut(model, "A1:B4");
      paste(model, "A5");
      expect(getTable(model, "A1")).toBeFalsy();
      const copiedTable = getTable(model, "A5");
      expect(copiedTable).toBeTruthy();
      expect(
        model.getters.getFilterHiddenValues({
          sheetId,
          col: copiedTable!.range.zone.left,
          row: copiedTable!.range.zone.top,
        })
      ).toEqual(["thisIsAValue"]);
    });

    test("Can cut and paste multiple tables", () => {
      createTable(model, "A1:B4");
      updateFilter(model, "A1", ["thisIsAValue"]);
      createTable(model, "D5:D7");

      cut(model, "A1:D7");
      paste(model, "A5");
      expect(getTable(model, "A1")).toBeFalsy();
      expect(getTable(model, "D5")).toBeFalsy();

      const copiedTable = getTable(model, "A5");
      expect(copiedTable).toBeTruthy();
      expect(
        model.getters.getFilterHiddenValues({
          sheetId,
          col: copiedTable!.range.zone.left,
          row: copiedTable!.range.zone.top,
        })
      ).toEqual(["thisIsAValue"]);
      expect(getTable(model, "D9")).toBeTruthy();
    });

    test("Can cut and paste a whole table in another sheet", () => {
      createTable(model, "A1:B4");

      cut(model, "A1:B4");
      createSheet(model, { sheetId: "42", activate: true });
      paste(model, "A5");
      expect(model.getters.getTable({ sheetId, col: 0, row: 0 })).toBeFalsy();
      expect(model.getters.getTable({ sheetId: "42", col: 0, row: 4 })).toBeTruthy();
    });

    test("Copy tables that are in a bigger selection", () => {
      createTable(model, "A1:B4");
      updateFilter(model, "A1", ["thisIsAValue"]);

      cut(model, "A1:C5");
      paste(model, "A5");
      expect(getTable(model, "A1")).toBeFalsy();
      expect(getTable(model, "A5")).toBeTruthy();
    });

    test("If the pasted table overlap with another table, don't paste it", () => {
      setCellContent(model, "A1", "Hey");
      createTable(model, "A1:A4");
      createTable(model, "C1:D2");
      copy(model, "A1:A4");
      paste(model, "C1");
      expect(getCellContent(model, "C1")).toEqual("Hey");
      expect(getTable(model, "A1")).toBeTruthy();
      expect(getTable(model, "A3")).toBeTruthy();
      expect(getTable(model, "D3")).toBeFalsy();
    });

    test("Copy table style as a cell style if the table is not entirely in the selection", () => {
      createTable(model, "B2:B3");
      updateTableConfig(model, "B2", { styleId: "TestStyleAllRed", numberOfHeaders: 1 });
      copy(model, "A1:B2");
      paste(model, "C1");
      expect(getTable(model, "D2")).toBeFalsy();
      expect(getCell(model, "D2")?.style).toEqual({ fillColor: "#FF0000", bold: true });
      expect(getBorder(model, "D2")?.top).toEqual(DEFAULT_BORDER_DESC);
    });

    test("Copy table style as a cell style if the selection is inside the table but smaller", () => {
      createTable(model, "A1:A4");
      updateTableConfig(model, "A1", { styleId: "TestStyleAllRed", numberOfHeaders: 1 });
      copy(model, "A1:A2");
      paste(model, "B1");
      expect(getTable(model, "B1")).toBeFalsy();
      expect(getCell(model, "B1")?.style).toEqual({ fillColor: "#FF0000", bold: true });
      expect(getBorder(model, "B1")?.top).toEqual(DEFAULT_BORDER_DESC);
      expect(getCell(model, "B2")?.style).toEqual({ fillColor: "#FF0000" });
    });

    test("Cutting partially the table paste the style but do not remove the table", () => {
      createTable(model, "A1:A4");
      updateTableConfig(model, "A1", { styleId: "TestStyleAllRed", numberOfHeaders: 1 });
      cut(model, "A1");
      paste(model, "B1");
      expect(getTable(model, "A1")).toBeTruthy();
      expect(getTable(model, "B1")).toBeFalsy();
      expect(getCell(model, "B1")?.style).toEqual({ fillColor: "#FF0000", bold: true });
    });

    test("Do not paste table style inside another table", () => {
      createTable(model, "A1:A4");
      updateTableConfig(model, "A1", { styleId: "TestStyleAllRed", numberOfHeaders: 1 });
      createTable(model, "B1:B4");
      copy(model, "A1");
      paste(model, "B1");
      expect(getCell(model, "B1")?.style?.fillColor).not.toEqual("#FF0000");
    });

    test("Paste as value do not copy the table", () => {
      createTable(model, "A1:B4", { styleId: "TestStyleAllRed" });

      copy(model, "A1:B4");
      paste(model, "A5", "asValue");
      expect(getTable(model, "A5")).toBeFalsy();
      expect(getCell(model, "A5")?.style).toBeUndefined();
    });

    test("Can copy/paste the whole table formatting", () => {
      createTable(model, "A1:A2", { styleId: "TestStyleAllRed" });

      copy(model, "A1:A2");
      paste(model, "A5", "onlyFormat");
      expect(getTable(model, "A5")).toBeFalsy();
      expect(getCell(model, "A5")?.style).toEqual({ fillColor: "#FF0000", bold: true });
      expect(getBorder(model, "A5")).toEqual({ top: DEFAULT_BORDER_DESC });
      expect(getCell(model, "A6")?.style).toEqual({ fillColor: "#FF0000" });
    });

    test("Pasting onlyFormat with a partial table copied paste the table style, not asValue", () => {
      createTable(model, "A1:B4");
      updateTableConfig(model, "A1", { styleId: "TestStyleAllRed" });
      copy(model, "A1");

      paste(model, "A5", "onlyFormat");
      expect(getCell(model, "A5")?.style).toEqual({ fillColor: "#FF0000", bold: true });

      paste(model, "A6", "asValue");
      expect(getCell(model, "A6")?.style).toEqual(undefined);
    });

    test("Copied table style do not overwrite cell style", () => {
      createTable(model, "A1:A2");
      updateTableConfig(model, "A1", { styleId: "TestStyleAllRed", numberOfHeaders: 1 });
      setStyle(model, "A1", { fillColor: "#000000", italic: true });
      copy(model, "A1");
      paste(model, "B2");
      expect(getCell(model, "B2")?.style).toEqual({
        fillColor: "#000000",
        italic: true,
        bold: true,
      });
    });
  });

  describe("Import/Export", () => {
    test("Import/Export tables", () => {
      createTable(model, "A1:B5");
      updateTableConfig(model, "A1", { bandedColumns: true, styleId: "TableStyleDark2" });
      createTable(model, "C5:C9");
      setCellContent(model, "A2", "5");
      updateFilter(model, "A1", ["5"]);
      setCellContent(model, "B3", "8");
      setCellContent(model, "B4", "hey");
      updateFilter(model, "B1", ["8", "hey"]);

      const exported = model.exportData();
      expect(exported.sheets[0].tables).toMatchObject([
        {
          range: "A1:B5",
          config: { ...DEFAULT_TABLE_CONFIG, bandedColumns: true, styleId: "TableStyleDark2" },
        },
        { range: "C5:C9" }, // default config is not exported
      ]);

      const imported = new Model(exported);
      expect(imported.getters.getTables(sheetId)).toMatchObject([
        {
          range: { zone: toZone("A1:B5") },
          config: { ...DEFAULT_TABLE_CONFIG, bandedColumns: true, styleId: "TableStyleDark2" },
        },
        { range: { zone: toZone("C5:C9") }, config: DEFAULT_TABLE_CONFIG },
      ]);
    });
  });
});
