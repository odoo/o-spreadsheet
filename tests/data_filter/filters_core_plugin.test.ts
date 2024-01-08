import { CommandResult, Model } from "../../src";
import { toZone, zoneToXc } from "../../src/helpers";
import { ClipboardPasteOptions, UID } from "../../src/types";
import {
  addColumns,
  addRows,
  copy,
  createFilter,
  createSheet,
  cut,
  deleteColumns,
  deleteFilter,
  deleteRows,
  hideRows,
  insertCells,
  merge,
  paste,
  redo,
  setCellContent,
  setStyle,
  undo,
  unhideRows,
  updateFilter,
} from "../test_helpers/commands_helpers";
import { getCellContent, getFilter, getFilterTable } from "../test_helpers/getters_helpers";

function getFilterValues(model: Model, sheetId = model.getters.getActiveSheetId()) {
  const table = model.getters.getFilterTables(sheetId)[0];
  return table.filters.map((filter) => ({
    zone: zoneToXc(filter.zoneWithHeaders),
    value: model.getters.getFilterValues({ sheetId, col: filter.col, row: table.zone.top }),
  }));
}

describe("Filters plugin", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  describe("Dispatch results", () => {
    test("Create Filter is correctly rejected if given invalid zone", () => {
      expect(
        model.dispatch("CREATE_FILTER_TABLE", {
          sheetId: model.getters.getActiveSheetId(),
          target: [{ top: -1, bottom: 0, right: 5, left: 9 }],
        })
      ).toBeCancelledBecause(CommandResult.InvalidRange);
    });

    test("Create Filter is correctly rejected for target out of sheet", () => {
      expect(createFilter(model, "A1:A1000")).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
    });

    test.each(["A1,B3", "A1:B2,A3", "A1,B1:B2"])(
      "For multiple targets, create Filter is correctly rejected for non-continuous target",
      (target) => {
        expect(createFilter(model, target)).toBeCancelledBecause(
          CommandResult.NonContinuousTargets
        );
      }
    );

    test.each(["A1", "B1:B10,A1:A10"])(
      "Create Filter is correctly rejected for target overlapping another filter",
      (target) => {
        createFilter(model, "A1:A10");
        expect(createFilter(model, target)).toBeCancelledBecause(CommandResult.FilterOverlap);
      }
    );

    test("Update Filter is correctly rejected when target is not inside a filter", () => {
      createFilter(model, "A1:A10");
      expect(updateFilter(model, "B1", [])).toBeCancelledBecause(CommandResult.FilterNotFound);
    });

    describe("merges", () => {
      test("Create Filter is correctly rejected when a merge in partially inside the filter", () => {
        merge(model, "A1:B1");
        expect(createFilter(model, "A1:A5")).toBeCancelledBecause(CommandResult.MergeInFilter);
      });

      test("Create Filter is correctly rejected when  merge is in the filter", () => {
        merge(model, "A1:A2");
        expect(createFilter(model, "A1:A5")).toBeCancelledBecause(CommandResult.MergeInFilter);
      });

      test("Add Merge is correctly rejected when the merge is partially inside a filter", () => {
        createFilter(model, "A1:A5");
        expect(merge(model, "A1:B1")).toBeCancelledBecause(CommandResult.MergeInFilter);
      });

      test("Add Merge is correctly rejected when creating a merge inside a filter", () => {
        createFilter(model, "A1:A5");
        expect(merge(model, "A1:A2")).toBeCancelledBecause(CommandResult.MergeInFilter);
      });
    });
  });

  describe("Creating and updating a filter", () => {
    test("Can create a filter", () => {
      createFilter(model, "A1:A5");
      expect(getFilterTable(model, "A1")!.zone).toEqual(toZone("A1:A5"));

      expect(getFilter(model, "A1")).toEqual({
        zoneWithHeaders: toZone("A1:A5"),
        filteredZone: toZone("A2:A5"),
        col: 0,
        id: expect.any(String),
      });
    });

    test("Can create a filter on multiple target if they are continuous", () => {
      createFilter(model, "A1:A5,B1:B5");
      expect(getFilterTable(model, "A1")!.zone).toEqual(toZone("A1:B5"));
    });

    test("Can update  a filter", () => {
      createFilter(model, "A1:A5");
      updateFilter(model, "A1", ["2", "A"]);
      expect(model.getters.getFilterValues({ sheetId, col: 0, row: 0 })).toEqual(["2", "A"]);
    });

    test("Can update  a filter in readonly mode", () => {
      createFilter(model, "A1:A5");
      model.updateMode("readonly");
      updateFilter(model, "A1", ["2", "A"]);
      expect(model.getters.getFilterValues({ sheetId, col: 0, row: 0 })).toEqual(["2", "A"]);
    });

    test("Create a filter with multiple target create a single filter of the union of the targets", () => {
      createFilter(model, "A1:A5, B1:B5");
      expect(getFilterTable(model, "A1")!.zone).toEqual(toZone("A1:B5"));
    });

    test("Create new filter on sheet duplication", () => {
      createFilter(model, "A1:A3");
      updateFilter(model, "A1", ["C"]);

      const sheet2Id = "42";
      model.dispatch("DUPLICATE_SHEET", {
        sheetId: sheetId,
        sheetIdTo: sheet2Id,
      });
      expect(getFilterValues(model, sheet2Id)).toMatchObject([{ zone: "A1:A3", value: ["C"] }]);
      updateFilter(model, "A1", ["D"], sheet2Id);

      expect(getFilterValues(model, sheetId)).toMatchObject([{ zone: "A1:A3", value: ["C"] }]);
      expect(getFilterValues(model, sheet2Id)).toMatchObject([{ zone: "A1:A3", value: ["D"] }]);
    });

    test("Can delete row/columns on duplicated sheet with filters", () => {
      createFilter(model, "B1:B3");
      updateFilter(model, "B1", ["C"]);

      const sheet2Id = "42";
      model.dispatch("DUPLICATE_SHEET", {
        sheetId: sheetId,
        sheetIdTo: sheet2Id,
      });
      expect(getFilterValues(model, sheet2Id)).toMatchObject([{ zone: "B1:B3", value: ["C"] }]);
      deleteColumns(model, ["A"], sheet2Id);

      expect(getFilterValues(model, sheetId)).toMatchObject([{ zone: "B1:B3", value: ["C"] }]);
      expect(getFilterValues(model, sheet2Id)).toMatchObject([{ zone: "A1:A3", value: ["C"] }]);
    });

    test("Filter is disabled if its header row is hidden by the user", () => {
      createFilter(model, "A1:A3");
      setCellContent(model, "A2", "28");
      updateFilter(model, "A1", ["28"]);
      expect(model.getters.isRowHidden(sheetId, 1)).toBe(true);

      hideRows(model, [0]);
      expect(model.getters.isRowHidden(sheetId, 1)).toBe(false);
    });

    test("Filter is disabled if its header row is hidden by another filter", () => {
      createFilter(model, "A2:A3");
      setCellContent(model, "A3", "15");
      updateFilter(model, "A2", ["15"]);
      expect(model.getters.isRowHidden(sheetId, 2)).toBe(true);

      createFilter(model, "B1:B2");
      setCellContent(model, "B2", "28");
      updateFilter(model, "B1", ["28"]);
      expect(model.getters.isRowHidden(sheetId, 1)).toBe(true);
      expect(model.getters.isRowHidden(sheetId, 2)).toBe(false);
    });

    test("Filtered rows should persist after hiding and unhiding multiple rows", () => {
      const model = new Model();

      setCellContent(model, "A4", "D");

      createFilter(model, "A3:A4");
      updateFilter(model, "A3", ["D"]);
      expect(model.getters.isRowFiltered(sheetId, 3)).toEqual(true);
      hideRows(model, [2, 3]);
      unhideRows(model, [2, 3]);
      expect(model.getters.isRowFiltered(sheetId, 3)).toEqual(true);
    });
  });

  describe("Filter Table Zone Expansion", () => {
    test("Table zone is expanded when creating a new cell just below the filter", () => {
      createFilter(model, "A1:B3");
      updateFilter(model, "A1", ["C"]);
      setCellContent(model, "A4", "Something");
      setCellContent(model, "B5", "Something Else");
      expect(zoneToXc(model.getters.getFilterTables(sheetId)[0].zone)).toEqual("A1:B5");
      expect(getFilterValues(model)).toEqual([
        { zone: "A1:A5", value: ["C"] },
        { zone: "B1:B5", value: [] },
      ]);
    });

    test("Table zone isn't expanded when creating cells at the side of the table", () => {
      createFilter(model, "B1:B3");
      setCellContent(model, "A1", "Something");
      setCellContent(model, "C3", "Something Else");
      expect(zoneToXc(model.getters.getFilterTables(sheetId)[0].zone)).toEqual("B1:B3");
      expect(getFilterValues(model)).toEqual([{ zone: "B1:B3", value: [] }]);
    });

    test("Table zone isn't expended at creation", () => {
      setCellContent(model, "A4", "Something");
      createFilter(model, "A1:A3");
      expect(zoneToXc(model.getters.getFilterTables(sheetId)[0].zone)).toEqual("A1:A3");
      expect(getFilterValues(model)).toEqual([{ zone: "A1:A3", value: [] }]);
    });

    test("Table zone isn't expanded when modifying existing cell", () => {
      setCellContent(model, "A4", "Something");
      createFilter(model, "A1:A3");
      setCellContent(model, "A4", "Something Else");
      expect(zoneToXc(model.getters.getFilterTables(sheetId)[0].zone)).toEqual("A1:A3");
      expect(getFilterValues(model)).toEqual([{ zone: "A1:A3", value: [] }]);
    });

    test("Table zone isn't expanded when another cell below the table had a content", () => {
      setCellContent(model, "B4", "Something");
      createFilter(model, "A1:B3");
      setCellContent(model, "A4", "Something Else");
      expect(zoneToXc(model.getters.getFilterTables(sheetId)[0].zone)).toEqual("A1:B3");
    });

    test("Table zone is expanded when another cell below the table had a a style but no content", () => {
      setStyle(model, "B4", { fillColor: "#000000" });
      createFilter(model, "A1:B3");
      setCellContent(model, "A4", "Something");
      expect(zoneToXc(model.getters.getFilterTables(sheetId)[0].zone)).toEqual("A1:B4");
    });

    test("Table zone is expanded when a cell on the row below the table but not below the table had a content", () => {
      setCellContent(model, "B4", "Something");
      createFilter(model, "A1:A3");
      setCellContent(model, "A4", "Something Else");
      expect(zoneToXc(model.getters.getFilterTables(sheetId)[0].zone)).toEqual("A1:A4");
    });

    test("Table zone isn't expanded when there was another filter table below it", () => {
      createFilter(model, "A1:B3");
      createFilter(model, "B4:B6");
      setCellContent(model, "A4", "Something");
      expect(zoneToXc(model.getters.getFilterTables(sheetId)[0].zone)).toEqual("A1:B3");
    });

    test("Table zone isn't expanded when there was a merge below it", () => {
      createFilter(model, "A1:B3");
      merge(model, "B4:B6");
      setCellContent(model, "A4", "Something");
      expect(zoneToXc(model.getters.getFilterTables(sheetId)[0].zone)).toEqual("A1:B3");
    });
  });

  describe("Grid manipulation", () => {
    let model: Model;
    let sheetId: UID;
    beforeEach(() => {
      model = new Model();
      createFilter(model, "C3:F6");
      updateFilter(model, "C3", ["C"]);
      updateFilter(model, "D3", ["D"]);
      updateFilter(model, "E3", ["E"]);
      updateFilter(model, "F3", ["F"]);
      sheetId = model.getters.getActiveSheetId();
    });

    describe("Add columns", () => {
      test("Before the zone", () => {
        addColumns(model, "before", "A", 1);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("D3:G6"));
        expect(getFilterValues(model)).toEqual([
          { zone: "D3:D6", value: ["C"] },
          { zone: "E3:E6", value: ["D"] },
          { zone: "F3:F6", value: ["E"] },
          { zone: "G3:G6", value: ["F"] },
        ]);
      });

      test("On the left part of the zone, add a column before", () => {
        addColumns(model, "before", "C", 1);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("D3:G6"));
        expect(getFilterValues(model)).toEqual([
          { zone: "D3:D6", value: ["C"] },
          { zone: "E3:E6", value: ["D"] },
          { zone: "F3:F6", value: ["E"] },
          { zone: "G3:G6", value: ["F"] },
        ]);
      });

      test("On the left part of the zone, add a column after", () => {
        addColumns(model, "after", "C", 1);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:G6"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: [] },
          { zone: "E3:E6", value: ["D"] },
          { zone: "F3:F6", value: ["E"] },
          { zone: "G3:G6", value: ["F"] },
        ]);
      });

      test("On the right part of the zone, add a column before", () => {
        addColumns(model, "before", "F", 1);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:G6"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: [] },
          { zone: "G3:G6", value: ["F"] },
        ]);
      });

      test("On the right part of the zone, add a column after", () => {
        addColumns(model, "after", "F", 1);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:F6"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });

      test("After the zone", () => {
        addColumns(model, "after", "H", 1);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:F6"));
        expect(getFilterValues(model)).toEqual([
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
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("B3:E6"));
        expect(getFilterValues(model)).toEqual([
          { zone: "B3:B6", value: ["C"] },
          { zone: "C3:C6", value: ["D"] },
          { zone: "D3:D6", value: ["E"] },
          { zone: "E3:E6", value: ["F"] },
        ]);
      });

      test("On the left part of the zone", () => {
        deleteColumns(model, ["C"]);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:E6"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C3:C6", value: ["D"] },
          { zone: "D3:D6", value: ["E"] },
          { zone: "E3:E6", value: ["F"] },
        ]);
      });

      test("Inside the zone", () => {
        deleteColumns(model, ["D"]);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:E6"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["E"] },
          { zone: "E3:E6", value: ["F"] },
        ]);
      });

      test("On the right part of the zone", () => {
        deleteColumns(model, ["F"]);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:E6"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
        ]);
      });

      test("After the zone", () => {
        deleteColumns(model, ["H"]);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:F6"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });
    });

    describe("Add rows", () => {
      test("Before the zone", () => {
        addRows(model, "before", 0, 1);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C4:F7"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C4:C7", value: ["C"] },
          { zone: "D4:D7", value: ["D"] },
          { zone: "E4:E7", value: ["E"] },
          { zone: "F4:F7", value: ["F"] },
        ]);
      });

      test("On the top part of the zone, add a row before", () => {
        addRows(model, "before", 2, 1);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C4:F7"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C4:C7", value: ["C"] },
          { zone: "D4:D7", value: ["D"] },
          { zone: "E4:E7", value: ["E"] },
          { zone: "F4:F7", value: ["F"] },
        ]);
      });

      test("On the top part of the zone, add a row after", () => {
        addRows(model, "after", 2, 1);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:F7"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C3:C7", value: ["C"] },
          { zone: "D3:D7", value: ["D"] },
          { zone: "E3:E7", value: ["E"] },
          { zone: "F3:F7", value: ["F"] },
        ]);
      });

      test("On the bottom part of the zone, add a row before", () => {
        addRows(model, "before", 5, 1);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:F7"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C3:C7", value: ["C"] },
          { zone: "D3:D7", value: ["D"] },
          { zone: "E3:E7", value: ["E"] },
          { zone: "F3:F7", value: ["F"] },
        ]);
      });

      test("On the bottom part of the zone, add a row after", () => {
        addRows(model, "after", 5, 1);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:F6"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });

      test("After the zone", () => {
        addRows(model, "after", 7, 1);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:F6"));
        expect(getFilterValues(model)).toEqual([
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
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C2:F5"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C2:C5", value: ["C"] },
          { zone: "D2:D5", value: ["D"] },
          { zone: "E2:E5", value: ["E"] },
          { zone: "F2:F5", value: ["F"] },
        ]);
      });

      test("Removing rows with filter table should remove the filter table", () => {
        deleteRows(model, [2]);
        expect(model.getters.getFilterTables(sheetId)).toEqual([]);
      });

      test("Inside the zone", () => {
        deleteRows(model, [3]);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:F5"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C3:C5", value: ["C"] },
          { zone: "D3:D5", value: ["D"] },
          { zone: "E3:E5", value: ["E"] },
          { zone: "F3:F5", value: ["F"] },
        ]);
      });

      test("On the right part of the zone", () => {
        deleteRows(model, [5]);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:F5"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C3:C5", value: ["C"] },
          { zone: "D3:D5", value: ["D"] },
          { zone: "E3:E5", value: ["E"] },
          { zone: "F3:F5", value: ["F"] },
        ]);
      });

      test("After the zone", () => {
        deleteRows(model, [7]);
        expect(model.getters.getFilterTables(sheetId)[0].zone).toEqual(toZone("C3:F6"));
        expect(getFilterValues(model)).toEqual([
          { zone: "C3:C6", value: ["C"] },
          { zone: "D3:D6", value: ["D"] },
          { zone: "E3:E6", value: ["E"] },
          { zone: "F3:F6", value: ["F"] },
        ]);
      });
    });

    test("Inserting cell above a filter don't shift down the filters columns", () => {
      insertCells(model, "C1", "down");
      expect(getFilterTable(model, "C3")).toMatchObject({
        zone: toZone("C3:F6"),
      });
      expect(getFilter(model, "C3")).toMatchObject({
        zoneWithHeaders: toZone("C3:C6"),
      });
    });
  });

  describe("Undo/Redo", () => {
    test("Can undo/redo a create filter", () => {
      const model = new Model();
      createFilter(model, "C1:C4");
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.getFilterTables(sheetId).length).toBe(1);
      undo(model);
      expect(model.getters.getFilterTables(sheetId).length).toBe(0);
      redo(model);
      expect(model.getters.getFilterTables(sheetId).length).toBe(1);
    });

    test("Can undo/redo a delete filter", () => {
      const model = new Model();
      createFilter(model, "A1:A4");
      expect(getFilter(model, "A1")).toBeTruthy();
      deleteFilter(model, "A1");
      expect(getFilter(model, "A1")).toBeFalsy();
      undo(model);
      expect(getFilter(model, "A1")).toBeTruthy();
      redo(model);
      expect(getFilter(model, "A1")).toBeFalsy();
    });
  });

  describe("Copy/Cut/Paste filters", () => {
    test("Can copy and paste a filter table", () => {
      createFilter(model, "A1:B4");
      updateFilter(model, "A1", ["thisIsAValue"]);

      copy(model, "A1:B4");
      paste(model, "A5");
      expect(getFilterTable(model, "A1")).toBeTruthy();
      const copiedTable = getFilterTable(model, "A5");
      expect(copiedTable).toBeTruthy();
      expect(
        model.getters.getFilterValues({
          sheetId,
          col: copiedTable!.zone.left,
          row: copiedTable!.zone.top,
        })
      ).toEqual(["thisIsAValue"]);
    });

    test("Can cut and paste a filter table", () => {
      createFilter(model, "A1:B4");
      updateFilter(model, "A1", ["thisIsAValue"]);

      cut(model, "A1:B4");
      paste(model, "A5");
      expect(getFilterTable(model, "A1")).toBeFalsy();
      const copiedTable = getFilterTable(model, "A5");
      expect(copiedTable).toBeTruthy();
      expect(
        model.getters.getFilterValues({
          sheetId,
          col: copiedTable!.zone.left,
          row: copiedTable!.zone.top,
        })
      ).toEqual(["thisIsAValue"]);
    });

    test("Can cut and paste multiple filter tables", () => {
      createFilter(model, "A1:B4");
      updateFilter(model, "A1", ["thisIsAValue"]);
      createFilter(model, "D5:D7");

      cut(model, "A1:D7");
      paste(model, "A5");
      expect(getFilterTable(model, "A1")).toBeFalsy();
      expect(getFilterTable(model, "D5")).toBeFalsy();

      const copiedTable = getFilterTable(model, "A5");
      expect(copiedTable).toBeTruthy();
      expect(
        model.getters.getFilterValues({
          sheetId,
          col: copiedTable!.zone.left,
          row: copiedTable!.zone.top,
        })
      ).toEqual(["thisIsAValue"]);
      expect(getFilterTable(model, "D9")).toBeTruthy();
    });

    test("Can cut and paste a filter table in another sheet", () => {
      createFilter(model, "A1:B4");

      cut(model, "A1:B4");
      createSheet(model, { sheetId: "42", activate: true });
      paste(model, "A5");
      expect(model.getters.getFilterTable({ sheetId, col: 0, row: 0 })).toBeFalsy();
      expect(model.getters.getFilterTable({ sheetId: "42", col: 0, row: 4 })).toBeTruthy();
    });

    test("Don't copy tables that are not entirety in the selection", () => {
      createFilter(model, "A1:B4");
      updateFilter(model, "A1", ["thisIsAValue"]);

      cut(model, "A1:A10");
      paste(model, "A5");
      expect(getFilterTable(model, "A1")).toBeTruthy();
      expect(getFilterTable(model, "A5")).toBeFalsy();
    });

    test("Don't copy tables if the selection is inside the table but smaller", () => {
      createFilter(model, "A1:B4");
      updateFilter(model, "A1", ["thisIsAValue"]);

      cut(model, "A1:A2");
      paste(model, "A5");
      expect(getFilterTable(model, "A1")).toBeTruthy();
      expect(getFilterTable(model, "A5")).toBeFalsy();
    });

    test("Copy tables that are in a bigger selection", () => {
      createFilter(model, "A1:B4");
      updateFilter(model, "A1", ["thisIsAValue"]);

      cut(model, "A1:C5");
      paste(model, "A5");
      expect(getFilterTable(model, "A1")).toBeFalsy();
      expect(getFilterTable(model, "A5")).toBeTruthy();
    });

    test("If the pasted table overlap with another table, don't paste it", () => {
      setCellContent(model, "A1", "Hey");
      createFilter(model, "A1:A4");
      createFilter(model, "C1:D2");
      copy(model, "A1:A4");
      paste(model, "C1");
      expect(getCellContent(model, "C1")).toEqual("Hey");
      expect(getFilterTable(model, "A1")).toBeTruthy();
      expect(getFilterTable(model, "A3")).toBeTruthy();
      expect(getFilterTable(model, "D3")).toBeFalsy();
    });

    test.each(["onlyFormat", "asValue"] as ClipboardPasteOptions[])(
      "Special paste %s don't paste filter tables",
      (pasteOption: ClipboardPasteOptions) => {
        createFilter(model, "A1:B4");
        updateFilter(model, "A1", ["thisIsAValue"]);

        copy(model, "A1:B4");
        paste(model, "A5", pasteOption);
        expect(getFilterTable(model, "A5")).toBeFalsy();
      }
    );
  });

  describe("Import/Export", () => {
    test("Import/Export filters", () => {
      createFilter(model, "A1:B5");
      createFilter(model, "C5:C9");
      setCellContent(model, "A2", "5");
      updateFilter(model, "A1", ["5"]);
      setCellContent(model, "B3", "8");
      setCellContent(model, "B4", "hey");
      updateFilter(model, "B1", ["8", "hey"]);

      const exported = model.exportData();
      expect(exported.sheets[0].filterTables).toMatchObject([
        { range: "A1:B5" },
        { range: "C5:C9" },
      ]);

      const imported = new Model(exported).exportData();
      expect(imported.sheets[0].filterTables).toMatchObject([
        { range: "A1:B5" },
        { range: "C5:C9" },
      ]);
    });
  });
});
