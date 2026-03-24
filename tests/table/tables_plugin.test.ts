import { CommandResult, Model } from "../../src";
import { toUnboundedZone, toZone, zoneToXc } from "../../src/helpers";
import { UID } from "../../src/types";
import {
  activateSheet,
  addColumns,
  addRows,
  copy,
  createSheet,
  createTable,
  createTableWithFilter,
  cut,
  deleteColumns,
  deleteContent,
  deleteRows,
  deleteTable,
  duplicateSheet,
  insertCells,
  merge,
  paste,
  redo,
  setCellContent,
  setFormatting,
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
  getStyle,
  getTable,
} from "../test_helpers/getters_helpers";
import {
  createModel,
  getFilterHiddenValues,
  getPlugin,
  toRangeData,
  toRangesData,
} from "../test_helpers/helpers";

import { DEFAULT_BORDER_DESC } from "@odoo/o-spreadsheet-engine/constants";
import {
  DEFAULT_TABLE_CONFIG,
  TABLE_PRESETS,
} from "@odoo/o-spreadsheet-engine/helpers/table_presets";
import { EvaluationPlugin } from "@odoo/o-spreadsheet-engine/plugins/ui_core_views/cell_evaluation";
import { TABLE_STYLE_ALL_RED } from "../test_helpers/constants";

beforeEach(() => {
  TABLE_PRESETS.TestStyleAllRed = TABLE_STYLE_ALL_RED;
});

afterEach(() => {
  delete TABLE_PRESETS.TestStyleAllRed;
});

describe("Table plugin", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(async () => {
    model = await createModel();
    sheetId = model.getters.getActiveSheetId();
  });

  describe("Dispatch results", () => {
    test("Create table is correctly rejected if given invalid zone", () => {
      expect(
        model.dispatch("CREATE_TABLE", {
          sheetId: model.getters.getActiveSheetId(),
          ranges: [{ _sheetId: sheetId, _zone: { top: -1, bottom: 0, right: 5, left: 9 } }],
          tableType: "static",
          config: DEFAULT_TABLE_CONFIG,
        })
      ).toBeCancelledBecause(CommandResult.InvalidRange);
    });

    test("Create table is correctly rejected for target out of sheet", async () => {
      expect(await createTable(model, "A1:A1000")).toBeCancelledBecause(
        CommandResult.TargetOutOfSheet
      );
    });

    test.each(["A1,B3", "A1:B2,A3", "A1,B1:B2"])(
      "For multiple targets, create table is correctly rejected for non-continuous target",
      async (target) => {
        expect(await createTable(model, target)).toBeCancelledBecause(
          CommandResult.NonContinuousTargets
        );
      }
    );

    test.each(["A1", "B1:B10,A1:A10"])(
      "Create table is correctly rejected for target overlapping another table",
      async (target) => {
        await createTable(model, "A1:A10");
        expect(await createTable(model, target)).toBeCancelledBecause(CommandResult.TableOverlap);
      }
    );

    test("Create table is correctly rejected for invalid config", async () => {
      expect(
        await createTable(model, "A1:A3", {
          ...DEFAULT_TABLE_CONFIG,
          styleId: "NotARealTableStyle",
        })
      ).toBeCancelledBecause(CommandResult.InvalidTableConfig);
    });

    describe("merges", () => {
      test("Creating a table removes the merges in its zone", async () => {
        await merge(model, "A1:B1");
        await createTable(model, "A1:A5");
        expect(model.getters.getTables(sheetId)).toHaveLength(1);
        expect(model.getters.getMerges(sheetId)).toHaveLength(0);
      });

      test("Updating a table zone removes the merges in its zone", async () => {
        await createTable(model, "A1:A3");
        await merge(model, "B1:B2");
        await updateTableZone(model, "A1", "A1:B3");
        expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toBe("A1:B3");
        expect(model.getters.getMerges(sheetId)).toHaveLength(0);
      });

      test("Add Merge is correctly rejected when the merge is partially inside a table", async () => {
        await createTable(model, "A1:A5");
        expect(await merge(model, "A1:B1")).toBeCancelledBecause(CommandResult.MergeInTable);
      });

      test("Add Merge is correctly rejected when creating a merge inside a table", async () => {
        await createTable(model, "A1:A5");
        expect(await merge(model, "A1:A2")).toBeCancelledBecause(CommandResult.MergeInTable);
      });

      test("Inserting a table only invalidates the evaluation if it overlaps a merge", async () => {
        await merge(model, "A1:B1");

        const evaluator = getPlugin(model, EvaluationPlugin)["evaluator"];
        const evaluateSpy = jest.spyOn(evaluator, "evaluateAllCells");

        await createTable(model, "D1:E5");
        expect(evaluateSpy).not.toHaveBeenCalled();

        await createTable(model, "A1:B4");
        expect(evaluateSpy).toHaveBeenCalled();
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

    test("Cannot update a table zone to a wrong zone", async () => {
      await createTable(model, "A1:A5");

      expect(await updateTableZone(model, "A1", "A1:A600")).toBeCancelledBecause(
        CommandResult.TargetOutOfSheet
      );

      await createTable(model, "B1:B5");
      expect(await updateTableZone(model, "A1", "A1:B5")).toBeCancelledBecause(
        CommandResult.TableOverlap
      );
    });

    test("Cannot update a table with a wrong config", async () => {
      await createTableWithFilter(model, "A1:A5");
      await createTableWithFilter(model, "B1:B5");
      expect(await updateTableConfig(model, "A1", { numberOfHeaders: -5 })).toBeCancelledBecause(
        CommandResult.InvalidTableConfig
      );

      expect(
        await updateTableConfig(model, "A1", { styleId: "notARealStyleId" })
      ).toBeCancelledBecause(CommandResult.InvalidTableConfig);

      const configUpdate = { numberOfHeaders: 0, hasFilters: true };
      expect(await updateTableConfig(model, "A1", configUpdate)).toBeCancelledBecause(
        CommandResult.InvalidTableConfig
      );
    });

    test("reject with an unbounded range on an invalid sheet", async () => {
      const result = await createTable(model, "B1,A1:A", {}, "static", "not-a-valid-sheet-id");
      expect(result).toBeCancelledBecause(CommandResult.InvalidSheetId);
    });

    test("reject data range targeting a different sheet", async () => {
      const firstSheetId = model.getters.getActiveSheetId();
      await createSheet(model, { sheetId: "sheet2" });
      const result = model.dispatch("CREATE_TABLE", {
        ranges: toRangesData(firstSheetId, "A1"),
        sheetId: "sheet2",
        tableType: "static",
        config: DEFAULT_TABLE_CONFIG,
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidSheetId);
    });
  });

  describe("Creating and updating a table", () => {
    test("Can create a table", async () => {
      await createTableWithFilter(model, "A1:A5", { bandedColumns: true });
      expect(getTable(model, "A1")).toMatchObject({
        range: { zone: toZone("A1:A5") },
        config: { ...DEFAULT_TABLE_CONFIG, hasFilters: true, bandedColumns: true },
      });

      expect(getFilter(model, "A1")).toMatchObject({
        rangeWithHeaders: { zone: toZone("A1:A5") },
        filteredRange: { zone: toZone("A2:A5") },
        col: 0,
        id: expect.any(String),
      });
    });

    test("Can create a table on multiple target if they are continuous", async () => {
      await createTable(model, "A1:A5,B1:B5");
      expect(getTable(model, "A1")?.range.zone).toEqual(toZone("A1:B5"));
    });

    test("Can create a table on unbounded zone", async () => {
      await createTable(model, "A:A,B:B");
      expect(getTable(model, "A1")?.range).toMatchObject({ unboundedZone: toUnboundedZone("A:B") });
    });

    test("Create a table with multiple target create a single table of the union of the targets", async () => {
      await createTable(model, "A1:A5, B1:B5");
      expect(getTable(model, "A1")?.range.zone).toEqual(toZone("A1:B5"));
    });

    test("Create new table on sheet duplication", async () => {
      await createTableWithFilter(model, "A1:A3");
      await updateFilter(model, "A1", ["C"]);

      const sheet2Id = "42";
      await duplicateSheet(model, sheetId, sheet2Id);
      expect(getFilterHiddenValues(model, sheet2Id)).toMatchObject([
        { zone: "A1:A3", value: ["C"] },
      ]);
      await updateFilter(model, "A1", ["D"], sheet2Id);

      expect(getFilterHiddenValues(model, sheetId)).toMatchObject([
        { zone: "A1:A3", value: ["C"] },
      ]);
      expect(getFilterHiddenValues(model, sheet2Id)).toMatchObject([
        { zone: "A1:A3", value: ["D"] },
      ]);
    });

    test("Can update a table zone", async () => {
      await createTable(model, "A1:A5");
      await updateTableZone(model, "A1", "A1:A6");
      expect(getTable(model, "A1")?.range.zone).toEqual(toZone("A1:A6"));
    });

    test("Can update a table config", async () => {
      await createTable(model, "A1:A5");
      await updateTableConfig(model, "A1", { bandedColumns: true });
      expect(getTable(model, "A1")!.config).toMatchObject({ bandedColumns: true });
    });

    test("Updated table config is sanitized", async () => {
      await createTableWithFilter(model, "A1:A5");
      expect(getTable(model, "A1")!.config).toMatchObject({
        numberOfHeaders: 1,
        hasFilters: true,
      });

      // Disabling the header rows should disable the filters
      await updateTableConfig(model, "A1", { numberOfHeaders: 0 });
      expect(getTable(model, "A1")!.config).toMatchObject({
        numberOfHeaders: 0,
        hasFilters: false,
      });

      // Enabling the filters should enable the header row
      await updateTableConfig(model, "A1", { hasFilters: true });
      expect(getTable(model, "A1")!.config).toMatchObject({
        numberOfHeaders: 1,
        hasFilters: true,
      });
    });

    test("Filtered zone is updated when the number of headers change", async () => {
      await createTableWithFilter(model, "A1:A5");
      expect(getFilter(model, "A1")?.filteredRange?.zone).toEqual(toZone("A2:A5"));
      await updateTableConfig(model, "A1", { numberOfHeaders: 3 });
      expect(getFilter(model, "A1")?.filteredRange?.zone).toEqual(toZone("A4:A5"));
    });

    test("Table is deleted on a DELETE_CONTENT on a zone containing the table", async () => {
      await createTable(model, "A1:A5");

      await deleteContent(model, ["A1:A2"]);
      expect(getTable(model, "A1")).toBeTruthy();

      await deleteContent(model, ["A1:A5"]);
      expect(getTable(model, "A1")).toBeFalsy();
    });
  });

  describe("Table Zone Expansion", () => {
    test("Table zone is expanded when creating a new cell just below the table", async () => {
      await createTableWithFilter(model, "A1:B3");
      await updateFilter(model, "A1", ["C"]);
      await setCellContent(model, "A4", "Something");
      await setCellContent(model, "B5", "Something Else");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:B5");
      expect(getFilterHiddenValues(model)).toEqual([
        { zone: "A1:A5", value: ["C"] },
        { zone: "B1:B5", value: [] },
      ]);
    });

    test("Table zone is expanded when creating cells right of the table", async () => {
      await createTableWithFilter(model, "B1:B3");
      await updateFilter(model, "B1", ["C"]);
      await setCellContent(model, "A1", "Something");
      await setCellContent(model, "C3", "Something Else");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("B1:C3");
      expect(getFilterHiddenValues(model)).toEqual([
        { zone: "B1:B3", value: ["C"] },
        { zone: "C1:C3", value: [] },
      ]);
    });

    test("Table zone is not expanded when creating a PIVOT formula right of the table", async () => {
      await createTable(model, "B1:B3");
      await setCellContent(model, "C3", "=PIVOT(1)");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("B1:B3");
    });

    test("Table zone is not expended at creation", async () => {
      await setCellContent(model, "A4", "Something");
      await createTableWithFilter(model, "A1:A3");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:A3");
      expect(getFilterHiddenValues(model)).toEqual([{ zone: "A1:A3", value: [] }]);
    });

    test("Table zone is not expanded when modifying existing cell", async () => {
      await setCellContent(model, "A4", "Something");
      await createTableWithFilter(model, "A1:A3");
      await setCellContent(model, "A4", "Something Else");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:A3");
      expect(getFilterHiddenValues(model)).toEqual([{ zone: "A1:A3", value: [] }]);
    });

    test("Table zone is not expanded when another cell below the table had a content", async () => {
      await setCellContent(model, "B4", "Something");
      await createTable(model, "A1:B3");
      await setCellContent(model, "A4", "Something Else");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:B3");
    });

    test("Table zone is expanded when another cell below the table had a a style but no content", async () => {
      await setFormatting(model, "B4", { fillColor: "#000000" });
      await createTable(model, "A1:B3");
      await setCellContent(model, "A4", "Something");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:B4");
    });

    test("Table zone is expanded when a cell on the row below the table but not below the table had a content", async () => {
      await setCellContent(model, "B4", "Something");
      await createTable(model, "A1:A3");
      await setCellContent(model, "A4", "Something Else");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:A4");
    });

    test("Table zone is not expanded when there was another table table below it", async () => {
      await createTable(model, "A1:B3");
      await createTable(model, "B4:B6");
      await setCellContent(model, "A4", "Something");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:B3");
    });

    test("Table zone is not expanded when there was a merge below it", async () => {
      await createTable(model, "A1:B3");
      await merge(model, "B4:B6");
      await setCellContent(model, "A4", "Something");
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:B3");
    });

    test("Table zone is not expanded when inserting a col/row next to it", async () => {
      // Note: this is more a limitation of our current behaviour of `adaptRanges` than a feature
      // In fact, this seems bugged when drag & drop a column of a table to the left of the table,
      // we expect the table to include this column but it does not.
      // But changing this behaviour would either require tables to not use `Range`, or to have a
      // complete overhaul of the way ranges work, which will probably break some spreadsheets and
      // does not seems worth it ATM.
      await createTable(model, "B2:C3");

      await addColumns(model, "before", "B", 1);
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("C2:D3");

      await addColumns(model, "after", "D", 1);
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("C2:D3");

      await addRows(model, "before", 1, 1);
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("C3:D4");

      await addRows(model, "after", 3, 1);
      expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("C3:D4");
    });
  });

  describe("Grid manipulation", () => {
    let model: Model;
    let sheetId: UID;
    beforeEach(async () => {
      model = await createModel();
      await createTableWithFilter(model, "C3:F6");
      await updateFilter(model, "C3", ["C"]);
      await updateFilter(model, "D3", ["D"]);
      await updateFilter(model, "E3", ["E"]);
      await updateFilter(model, "F3", ["F"]);
      sheetId = model.getters.getActiveSheetId();
    });

    describe("Add columns", () => {
      test("Before the zone", async () => {
        await addColumns(model, "before", "A", 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("D3:G6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "D3:D6", value: ["C"] },
          { zone: "E3:E6", value: ["D"] },
          { zone: "F3:F6", value: ["E"] },
          { zone: "G3:G6", value: ["F"] },
        ]);
      });

      test("On the left part of the zone, add a column before", async () => {
        await addColumns(model, "before", "C", 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("D3:G6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "D3:D6", value: ["C"] },
          { zone: "E3:E6", value: ["D"] },
          { zone: "F3:F6", value: ["E"] },
          { zone: "G3:G6", value: ["F"] },
        ]);
      });

      test("On the left part of the zone, add a column after", async () => {
        await addColumns(model, "after", "C", 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:G6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: [] },
          { zone: "E3:E6", value: ["D"] },
          { zone: "F3:F6", value: ["E"] },
          { zone: "G3:G6", value: ["F"] },
        ]);
      });

      test("On the right part of the zone, add a column before", async () => {
        await addColumns(model, "before", "F", 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:G6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: [] },
          { zone: "G3:G6", value: ["F"] },
        ]);
      });

      test("On the right part of the zone, add a column after", async () => {
        await addColumns(model, "after", "F", 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });

      test("After the zone", async () => {
        await addColumns(model, "after", "H", 1);
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
      test("Before the zone", async () => {
        await deleteColumns(model, ["A"]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("B3:E6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "B3:B6", value: ["C"] },
          { zone: "C3:C6", value: ["D"] },
          { zone: "D3:D6", value: ["E"] },
          { zone: "E3:E6", value: ["F"] },
        ]);
      });

      test("On the left part of the zone", async () => {
        await deleteColumns(model, ["C"]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:E6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["D"] },
          { zone: "D3:D6", value: ["E"] },
          { zone: "E3:E6", value: ["F"] },
        ]);
      });

      test("Inside the zone", async () => {
        await deleteColumns(model, ["D"]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:E6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["E"] },
          { zone: "E3:E6", value: ["F"] },
        ]);
      });

      test("On the right part of the zone", async () => {
        await deleteColumns(model, ["F"]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:E6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
        ]);
      });

      test("After the zone", async () => {
        await deleteColumns(model, ["H"]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });

      test("Delete all the cols of the table ", async () => {
        await deleteColumns(model, ["C", "D", "E", "F"]);
        expect(model.getters.getTables(sheetId).length).toBe(0);
      });
    });

    describe("Add rows", () => {
      test("Before the zone", async () => {
        await addRows(model, "before", 0, 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C4:F7"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C4:C7", value: ["C"] },
          { zone: "D4:D7", value: ["D"] },
          { zone: "E4:E7", value: ["E"] },
          { zone: "F4:F7", value: ["F"] },
        ]);
      });

      test("On the top part of the zone, add a row before", async () => {
        await addRows(model, "before", 2, 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C4:F7"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C4:C7", value: ["C"] },
          { zone: "D4:D7", value: ["D"] },
          { zone: "E4:E7", value: ["E"] },
          { zone: "F4:F7", value: ["F"] },
        ]);
      });

      test("On the top part of the zone, add a row after", async () => {
        await addRows(model, "after", 2, 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F7"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C7", value: ["C"] },
          { zone: "D3:D7", value: ["D"] },
          { zone: "E3:E7", value: ["E"] },
          { zone: "F3:F7", value: ["F"] },
        ]);
      });

      test("On the bottom part of the zone, add a row before", async () => {
        await addRows(model, "before", 5, 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F7"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C7", value: ["C"] },
          { zone: "D3:D7", value: ["D"] },
          { zone: "E3:E7", value: ["E"] },
          { zone: "F3:F7", value: ["F"] },
        ]);
      });

      test("On the bottom part of the zone, add a row after", async () => {
        await addRows(model, "after", 5, 1);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });

      test("After the zone", async () => {
        await addRows(model, "after", 7, 1);
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
      test("Before the zone", async () => {
        await deleteRows(model, [0]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C2:F5"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C2:C5", value: ["C"] },
          { zone: "D2:D5", value: ["D"] },
          { zone: "E2:E5", value: ["E"] },
          { zone: "F2:F5", value: ["F"] },
        ]);
      });

      test("Inside the zone", async () => {
        await deleteRows(model, [3]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F5"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C5", value: ["C"] },
          { zone: "D3:D5", value: ["D"] },
          { zone: "E3:E5", value: ["E"] },
          { zone: "F3:F5", value: ["F"] },
        ]);
      });

      test("On the right part of the zone", async () => {
        await deleteRows(model, [5]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F5"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C5", value: ["C"] },
          { zone: "D3:D5", value: ["D"] },
          { zone: "E3:E5", value: ["E"] },
          { zone: "F3:F5", value: ["F"] },
        ]);
      });

      test("After the zone", async () => {
        await deleteRows(model, [7]);
        expect(model.getters.getTables(sheetId)[0].range.zone).toEqual(toZone("C3:F6"));
        expect(getFilterHiddenValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });

      test("Delete all the rows of the table", async () => {
        await deleteRows(model, [2, 3, 4, 5]);
        expect(model.getters.getTables(sheetId).length).toBe(0);
      });
    });

    test("Inserting cell above a table do not shift down the filters columns", async () => {
      await insertCells(model, "C1", "down");
      expect(getTable(model, "C3")).toMatchObject({
        range: { zone: toZone("C3:F6") },
      });
      expect(getFilter(model, "C3")).toMatchObject({
        rangeWithHeaders: { zone: toZone("C3:C6") },
      });
    });
  });

  describe("Undo/Redo", () => {
    test("Can undo/redo creating a table", async () => {
      const model = await createModel();
      await createTable(model, "C1:C4");
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.getTables(sheetId).length).toBe(1);
      await undo(model);
      expect(model.getters.getTables(sheetId).length).toBe(0);
      await redo(model);
      expect(model.getters.getTables(sheetId).length).toBe(1);
    });

    test("Can undo/redo deleting a table", async () => {
      const model = await createModel();
      await createTableWithFilter(model, "A1:A4");
      expect(getFilter(model, "A1")).toBeTruthy();
      await deleteTable(model, "A1");
      expect(getFilter(model, "A1")).toBeFalsy();
      await undo(model);
      expect(getFilter(model, "A1")).toBeTruthy();
      await redo(model);
      expect(getFilter(model, "A1")).toBeFalsy();
    });

    test("Can undo/redo update a table", async () => {
      const model = await createModel();
      await createTable(model, "A1:A4");

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

      await undo(model);
      expect(getTable(model, "A1")!).toMatchObject({
        range: { zone: toZone("A1:A4") },
        config: DEFAULT_TABLE_CONFIG,
      });
      await redo(model);
      expect(getTable(model, "A1")!).toMatchObject({
        range: { zone: toZone("A1:B4") },
        config: { bandedColumns: true, styleId: "TableStyleDark2" },
      });
    });
  });

  describe("Copy/Cut/Paste tables", () => {
    test("Can copy and paste a whole table", async () => {
      // Note: copying filter values is not possible since the introduction of dynamic tables
      await createTableWithFilter(model, "A1:B4");
      await updateTableConfig(model, "A1", { bandedColumns: true, styleId: "TableStyleDark2" });

      await copy(model, "A1:B4");
      await paste(model, "A5");
      expect(getTable(model, "A1")).toBeTruthy();
      const copiedTable = getTable(model, "A5");
      expect(copiedTable).toBeTruthy();
      expect(copiedTable!.config).toMatchObject({
        ...DEFAULT_TABLE_CONFIG,
        hasFilters: true,
        bandedColumns: true,
        styleId: "TableStyleDark2",
      });
    });

    test("Can cut and paste a whole table", async () => {
      await createTable(model, "A1:B4");

      await cut(model, "A1:B4");
      await paste(model, "A5");
      expect(getTable(model, "A1")).toBeFalsy();
      const copiedTable = getTable(model, "A5");
      expect(copiedTable).toBeTruthy();
    });

    test("Can cut and paste a whole table in another sheet", async () => {
      const sheet1Id = model.getters.getActiveSheetId();
      await createTable(model, "A1:B4");
      await createSheet(model, { sheetId: "sheet2Id" });

      await cut(model, "A1:B4");
      await activateSheet(model, "sheet2Id");
      await paste(model, "A5");
      expect(model.getters.getTables(sheet1Id)).toHaveLength(0);
      const copiedTable = getTable(model, "A5", "sheet2Id");
      expect(copiedTable).toMatchObject({ range: { zone: toZone("A5:B8") } });
    });

    test("Can cut and paste multiple tables", async () => {
      await createTable(model, "A1:B4");
      await createTable(model, "D5:D7");

      await cut(model, "A1:D7");
      await paste(model, "A5");
      expect(getTable(model, "A1")).toBeFalsy();
      expect(getTable(model, "D5")).toBeFalsy();

      const copiedTable = getTable(model, "A5");
      expect(copiedTable).toBeTruthy();
      expect(getTable(model, "D9")).toBeTruthy();
    });

    test("Can cut and paste a whole table in another sheet", async () => {
      await createTable(model, "A1:B4");

      await cut(model, "A1:B4");
      await createSheet(model, { sheetId: "42", activate: true });
      await paste(model, "A5");
      expect(model.getters.getTable({ sheetId, col: 0, row: 0 })).toBeFalsy();
      expect(model.getters.getTable({ sheetId: "42", col: 0, row: 4 })).toBeTruthy();
    });

    test("Copy tables that are in a bigger selection", async () => {
      await createTable(model, "A1:B4");
      await cut(model, "A1:C5");
      await paste(model, "A5");
      expect(getTable(model, "A1")).toBeFalsy();
      expect(getTable(model, "A5")).toBeTruthy();
    });

    test("If the pasted table overlap with another table, don't paste it", async () => {
      await setCellContent(model, "A1", "Hey");
      await createTable(model, "A1:A4");
      await createTable(model, "C1:D2");
      await copy(model, "A1:A4");
      await paste(model, "C1");
      expect(getCellContent(model, "C1")).toEqual("Hey");
      expect(getTable(model, "A1")).toBeTruthy();
      expect(getTable(model, "A3")).toBeTruthy();
      expect(getTable(model, "D3")).toBeFalsy();
    });

    test("Copy table style as a cell style if the table is not entirely in the selection", async () => {
      await createTable(model, "B2:B3");
      await updateTableConfig(model, "B2", { styleId: "TestStyleAllRed", numberOfHeaders: 1 });
      await copy(model, "A1:B2");
      await paste(model, "C1");
      expect(getTable(model, "D2")).toBeFalsy();
      expect(getCell(model, "D2")?.style).toEqual({ fillColor: "#FF0000", bold: true });
      expect(getBorder(model, "D2")?.top).toEqual(DEFAULT_BORDER_DESC);
    });

    test("HideGridLine table style is ignored in the copy paste", async () => {
      TABLE_PRESETS.TestStyleAllRed = {
        ...TABLE_PRESETS.TestStyleAllRed,
        wholeTable: { style: { fillColor: "#FF0000", hideGridLines: true } },
      };
      const model = await createModel();
      await createTable(model, "B2:B3");
      await updateTableConfig(model, "B2", { styleId: "TestStyleAllRed", numberOfHeaders: 1 });
      expect(getStyle(model, "B2")).toEqual({
        fillColor: "#FF0000",
        bold: true,
        hideGridLines: true,
      });

      await copy(model, "B2");
      await paste(model, "C1");
      expect(getTable(model, "C1")).toBeFalsy();
      expect(getCell(model, "C1")?.style).toEqual({
        fillColor: "#FF0000",
        bold: true,
        hideGridLines: undefined,
      });
    });

    test("Copy table style as a cell style if the selection is inside the table but smaller", async () => {
      await createTable(model, "A1:A4");
      await updateTableConfig(model, "A1", { styleId: "TestStyleAllRed", numberOfHeaders: 1 });
      await copy(model, "A1:A2");
      await paste(model, "B1");
      expect(getTable(model, "B1")).toBeFalsy();
      expect(getCell(model, "B1")?.style).toEqual({ fillColor: "#FF0000", bold: true });
      expect(getBorder(model, "B1")?.top).toEqual(DEFAULT_BORDER_DESC);
      expect(getCell(model, "B2")?.style).toEqual({ fillColor: "#FF0000" });
    });

    test("Cutting partially the table paste the style but do not remove the table", async () => {
      await createTable(model, "A1:A4");
      await updateTableConfig(model, "A1", { styleId: "TestStyleAllRed", numberOfHeaders: 1 });
      await cut(model, "A1");
      await paste(model, "B1");
      expect(getTable(model, "A1")).toBeTruthy();
      expect(getTable(model, "B1")).toBeFalsy();
      expect(getCell(model, "B1")?.style).toEqual({ fillColor: "#FF0000", bold: true });
    });

    test("Do not paste table style inside another table", async () => {
      await createTable(model, "A1:A4");
      await updateTableConfig(model, "A1", { styleId: "TestStyleAllRed", numberOfHeaders: 1 });
      await createTable(model, "B1:B4");
      await copy(model, "A1");
      await paste(model, "B1");
      expect(getCell(model, "B1")?.style?.fillColor).not.toEqual("#FF0000");
    });

    test("Paste as value do not copy the table", async () => {
      await createTable(model, "A1:B4", { styleId: "TestStyleAllRed" });

      await copy(model, "A1:B4");
      await paste(model, "A5", "asValue");
      expect(getTable(model, "A5")).toBeFalsy();
      expect(getCell(model, "A5")?.style).toBeUndefined();
    });

    test("Can copy/paste the whole table formatting", async () => {
      await createTable(model, "A1:A2", { styleId: "TestStyleAllRed" });

      await copy(model, "A1:A2");
      await paste(model, "A5", "onlyFormat");
      expect(getTable(model, "A5")).toBeFalsy();
      expect(getCell(model, "A5")?.style).toEqual({ fillColor: "#FF0000", bold: true });
      expect(getBorder(model, "A5")).toEqual({ top: DEFAULT_BORDER_DESC });
      expect(getCell(model, "A6")?.style).toEqual({ fillColor: "#FF0000" });
    });

    test("Pasting onlyFormat with a partial table copied paste the table style, not asValue", async () => {
      await createTable(model, "A1:B4");
      await updateTableConfig(model, "A1", { styleId: "TestStyleAllRed" });
      await copy(model, "A1");

      await paste(model, "A5", "onlyFormat");
      expect(getCell(model, "A5")?.style).toEqual({ fillColor: "#FF0000", bold: true });

      await paste(model, "A6", "asValue");
      expect(getCell(model, "A6")?.style).toEqual(undefined);
    });

    test("Copied table style do not overwrite cell style", async () => {
      await createTable(model, "A1:A2");
      await updateTableConfig(model, "A1", { styleId: "TestStyleAllRed", numberOfHeaders: 1 });
      await setFormatting(model, "A1", { fillColor: "#000000", italic: true });
      await copy(model, "A1");
      await paste(model, "B2");
      expect(getCell(model, "B2")?.style).toEqual({
        fillColor: "#000000",
        italic: true,
        bold: true,
      });
    });

    test("Copy table and adjacent cells", async () => {
      const sheet1Id = model.getters.getActiveSheetId();
      await createTableWithFilter(model, "B2:C4");
      await setCellContent(model, "B3", "4");
      await updateFilter(model, "B2", ["4"]);
      await copy(model, "A1:D5");
      await paste(model, "E6");
      expect(model.getters.getTables(sheet1Id)).toHaveLength(2);
      const copiedTable = getTable(model, "F7");
      expect(copiedTable).toMatchObject({ range: { zone: toZone("F7:G8") } });
    });

    test("Cut table and adjacent cells", async () => {
      const sheet1Id = model.getters.getActiveSheetId();
      await createTableWithFilter(model, "B2:C4");
      await setCellContent(model, "B3", "4");
      await updateFilter(model, "B2", ["4"]);
      await cut(model, "A1:D5");
      await paste(model, "E6");
      expect(model.getters.getTables(sheet1Id)).toHaveLength(1);
      const copiedTable = getTable(model, "F7");
      expect(copiedTable).toMatchObject({ range: { zone: toZone("F7:G9") } });
    });
  });

  describe("Import/Export", () => {
    test("Import/Export tables", async () => {
      await createTableWithFilter(model, "A1:B5");
      await updateTableConfig(model, "A1", { bandedColumns: true, styleId: "TableStyleDark2" });
      await createTable(model, "C5:C9");
      await setCellContent(model, "A2", "5");
      await updateFilter(model, "A1", ["5"]);
      await setCellContent(model, "B3", "8");
      await setCellContent(model, "B4", "hey");
      await updateFilter(model, "B1", ["8", "hey"]);

      const exported = model.exportData();
      expect(exported.sheets[0].tables).toMatchObject([
        {
          range: "A1:B5",
          config: {
            ...DEFAULT_TABLE_CONFIG,
            hasFilters: true,
            bandedColumns: true,
            styleId: "TableStyleDark2",
          },
        },
        { range: "C5:C9" }, // default config is not exported
      ]);

      const imported = await createModel(exported);
      expect(imported.getters.getTables(sheetId)).toMatchObject([
        {
          range: { zone: toZone("A1:B5") },
          config: {
            ...DEFAULT_TABLE_CONFIG,
            hasFilters: true,
            bandedColumns: true,
            styleId: "TableStyleDark2",
          },
        },
        { range: { zone: toZone("C5:C9") }, config: DEFAULT_TABLE_CONFIG },
      ]);
    });
  });
});
