import { DEFAULT_TABLE_CONFIG } from "@odoo/o-spreadsheet-engine/helpers/table_presets";
import { Model } from "../../src";
import { range } from "../../src/helpers";
import { CommandResult, FilterCriterionType, UID } from "../../src/types";
import {
  addRows,
  createSheet,
  createTableWithFilter,
  deleteColumns,
  deleteRows,
  deleteTable,
  foldHeaderGroup,
  groupHeaders,
  hideRows,
  setCellContent,
  setFormat,
  unhideRows,
  updateFilter,
  updateFilterCriterion,
  updateTableConfig,
  updateTableZone,
} from "../test_helpers/commands_helpers";
import { getFilterHiddenValues, setGrid } from "../test_helpers/helpers";

describe("Simple filter test", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  test("Can update  a filter", () => {
    createTableWithFilter(model, "A1:A5");
    updateFilter(model, "A1", ["2", "A"]);
    expect(model.getters.getFilterHiddenValues({ sheetId, col: 0, row: 0 })).toEqual(["2", "A"]);
  });

  test("Can update  a filter in readonly mode", () => {
    createTableWithFilter(model, "A1:A5");
    model.updateMode("readonly");
    updateFilter(model, "A1", ["2", "A"]);
    expect(model.getters.getFilterHiddenValues({ sheetId, col: 0, row: 0 })).toEqual(["2", "A"]);
  });

  test("Update filter is correctly rejected when target is not inside a table", () => {
    createTableWithFilter(model, "A1:A10");
    expect(updateFilter(model, "B1", [])).toBeCancelledBecause(CommandResult.FilterNotFound);
  });

  test("Filter is disabled if its header row is hidden by the user", () => {
    createTableWithFilter(model, "A1:A3");
    setCellContent(model, "A2", "28");
    updateFilter(model, "A1", ["28"]);
    expect(model.getters.isRowHidden(sheetId, 1)).toBe(true);

    hideRows(model, [0]);
    expect(model.getters.isRowHidden(sheetId, 1)).toBe(false);
  });

  test("Filter is disabled if its header row is hidden by another filter", () => {
    createTableWithFilter(model, "A2:A3");
    setCellContent(model, "A3", "15");
    updateFilter(model, "A2", ["15"]);
    expect(model.getters.isRowHidden(sheetId, 2)).toBe(true);

    createTableWithFilter(model, "B1:B2");
    setCellContent(model, "B2", "28");
    updateFilter(model, "B1", ["28"]);
    expect(model.getters.isRowHidden(sheetId, 1)).toBe(true);
    expect(model.getters.isRowHidden(sheetId, 2)).toBe(false);
  });

  test("Filtered rows should persist after hiding and unhiding multiple rows", () => {
    const model = new Model();

    setCellContent(model, "A4", "D");

    createTableWithFilter(model, "A3:A4");
    updateFilter(model, "A3", ["D"]);
    expect(model.getters.isRowFiltered(sheetId, 3)).toEqual(true);
    hideRows(model, [2, 3]);
    unhideRows(model, [2, 3]);
    expect(model.getters.isRowFiltered(sheetId, 3)).toEqual(true);
  });

  test("Can delete row/columns on duplicated sheet with filters", () => {
    createTableWithFilter(model, "B1:B3");
    updateFilter(model, "B1", ["C"]);

    const sheet2Id = "42";
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: sheetId,
      sheetIdTo: sheet2Id,
      sheetNameTo: "Copy of Sheet1",
    });
    expect(getFilterHiddenValues(model, sheet2Id)).toMatchObject([{ zone: "B1:B3", value: ["C"] }]);
    deleteColumns(model, ["A"], sheet2Id);

    expect(getFilterHiddenValues(model, sheetId)).toMatchObject([{ zone: "B1:B3", value: ["C"] }]);
    expect(getFilterHiddenValues(model, sheet2Id)).toMatchObject([{ zone: "A1:A3", value: ["C"] }]);
  });
});

describe("Filter Evaluation", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();

    createTableWithFilter(model, "A1:A5");
    setCellContent(model, "A1", "A1");
    setCellContent(model, "A2", "A2");
    setCellContent(model, "A3", "A3");
    setCellContent(model, "A4", "A4");
    setCellContent(model, "A5", "A5");

    createTableWithFilter(model, "B1:B5");
    setCellContent(model, "B1", "Header");
    setCellContent(model, "B2", "1");
    setCellContent(model, "B3", "1");
    setCellContent(model, "B4", "2");
    setCellContent(model, "B5", "2");
  });

  test.each(["normal", "readonly", "dashboard"] as const)("Can filter a row", (mode) => {
    model.updateMode(mode);
    updateFilter(model, "A1", ["A2", "A3"]);
    expect(model.getters.isRowHidden(sheetId, 0)).toEqual(false);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);
    expect(model.getters.isRowHidden(sheetId, 2)).toEqual(true);
    expect(model.getters.isRowHidden(sheetId, 3)).toEqual(false);
    expect(model.getters.isRowHidden(sheetId, 4)).toEqual(false);
  });

  test("Filters use the formatted value of the cells", () => {
    setCellContent(model, "A2", "2");
    setFormat(model, "A2", "m/d/yyyy");
    updateFilter(model, "A2", ["1/1/1900"]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);
  });

  test("deleting a table show rows again", () => {
    const model = new Model();
    createTableWithFilter(model, "A1:A3");
    setCellContent(model, "A2", "Hi");
    updateFilter(model, "A2", ["Hi"]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);
    deleteTable(model, "A1:A3");
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(false);
  });

  test("Filters ignore lowercase/uppercase", () => {
    setCellContent(model, "A2", "A");
    setCellContent(model, "A3", "a");
    updateFilter(model, "A2", ["A"]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);
    expect(model.getters.isRowHidden(sheetId, 2)).toEqual(true);
  });

  test("Filters ignore whitespaces", () => {
    setCellContent(model, "A2", "a");
    setCellContent(model, "A3", " a");
    setCellContent(model, "A4", "a ");
    updateFilter(model, "A2", ["a"]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);
    expect(model.getters.isRowHidden(sheetId, 2)).toEqual(true);
    expect(model.getters.isRowHidden(sheetId, 3)).toEqual(true);
  });

  test("Header is not filtered", () => {
    updateFilter(model, "A1", ["A1"]);
    expect(model.getters.isRowHidden(sheetId, 0)).toEqual(false);
  });

  test("All filters are correctly applied", () => {
    updateFilter(model, "A1", ["A2"]);
    updateFilter(model, "B1", ["1"]);
    expect(model.getters.isRowHidden(sheetId, 0)).toEqual(false);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);
    expect(model.getters.isRowHidden(sheetId, 2)).toEqual(true);
    expect(model.getters.isRowHidden(sheetId, 3)).toEqual(false);
    expect(model.getters.isRowHidden(sheetId, 4)).toEqual(false);

    updateFilter(model, "A1", []);
    expect(model.getters.isRowHidden(sheetId, 0)).toEqual(false);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);
    expect(model.getters.isRowHidden(sheetId, 2)).toEqual(true);
    expect(model.getters.isRowHidden(sheetId, 3)).toEqual(false);
    expect(model.getters.isRowHidden(sheetId, 4)).toEqual(false);
  });

  test("Hidden rows are updated when the value of a filtered cell change", () => {
    setCellContent(model, "D1", "5");
    setCellContent(model, "A2", "=D1");
    updateFilter(model, "A1", ["5"]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);

    setCellContent(model, "D1", "9");
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(false);
  });

  test("Updating a table zone keep the filtered values if the filter header did not move", () => {
    updateFilter(model, "A1", ["A2"]);
    expect(getFilterHiddenValues(model, sheetId)).toMatchObject([{ zone: "A1:A5", value: ["A2"] }]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);

    updateTableZone(model, "A1:A5", "A1:A6");
    expect(getFilterHiddenValues(model, sheetId)).toMatchObject([{ zone: "A1:A6", value: ["A2"] }]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);
  });

  test("Updating a table zone drops the filtered values if the filter header moved", () => {
    updateFilter(model, "A1", ["A3"]);
    expect(getFilterHiddenValues(model, sheetId)).toMatchObject([{ zone: "A1:A5", value: ["A3"] }]);
    expect(model.getters.isRowHidden(sheetId, 2)).toEqual(true);

    updateTableZone(model, "A1:A5", "A2:A5");
    expect(getFilterHiddenValues(model, sheetId)).toMatchObject([{ zone: "A2:A5", value: [] }]);
    expect(model.getters.isRowHidden(sheetId, 2)).toEqual(false);
  });

  test("Updating a table zone updates the hidden rows", () => {
    updateFilter(model, "A1", ["A2"]);
    expect(getFilterHiddenValues(model, sheetId)).toMatchObject([{ zone: "A1:A5", value: ["A2"] }]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);

    updateTableZone(model, "A1:A5", "E1:E3");
    expect(getFilterHiddenValues(model, sheetId)).toMatchObject([{ zone: "E1:E3", value: [] }]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(false);
  });

  test("Removing the filters from a table updates the hidden rows", () => {
    updateFilter(model, "A1", ["A2"]);
    expect(getFilterHiddenValues(model, sheetId)).toMatchObject([{ zone: "A1:A5", value: ["A2"] }]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);

    updateTableConfig(model, "A1:A5", { hasFilters: false });
    expect(model.getters.getFilter({ sheetId, col: 0, row: 0 })).toBeUndefined();
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(false);
  });

  test("Sheet duplication after importing table don't break", () => {
    const model = new Model({
      sheets: [
        {
          id: "sh1",
          tables: [
            {
              range: "A1:A8",
              config: { ...DEFAULT_TABLE_CONFIG, hasFilters: true },
            },
          ],
        },
      ],
    });
    expect(model.getters.getFilter({ sheetId: "sh1", col: 0, row: 0 })).toBeTruthy();

    model.dispatch("DUPLICATE_SHEET", {
      sheetId: "sh1",
      sheetIdTo: "sh2",
      sheetNameTo: "Copy of Sheet1",
    });
    expect(model.getters.getFilter({ sheetId: "sh2", col: 0, row: 0 })).toBeTruthy();
  });

  test("Inserting rows above or below the table header updates the filtered rows", () => {
    const model = new Model();

    createTableWithFilter(model, "A1:A2");
    setCellContent(model, "A2", "Hi");

    updateFilter(model, "A1", ["Hi"]);
    expect(model.getters.isRowFiltered(sheetId, 1)).toEqual(true);

    addRows(model, "before", 0, 1);
    expect(model.getters.isRowFiltered(sheetId, 1)).toEqual(false);
    expect(model.getters.isRowFiltered(sheetId, 2)).toEqual(true);

    addRows(model, "after", 1, 1);
    expect(model.getters.isRowFiltered(sheetId, 2)).toEqual(false);
    expect(model.getters.isRowFiltered(sheetId, 3)).toEqual(true);
  });

  test("Removing rows above the table header updates the filtered rows", () => {
    const model = new Model();

    createTableWithFilter(model, "A4:A6");
    setCellContent(model, "A5", "Hi");
    setCellContent(model, "A6", "Hi");

    updateFilter(model, "A4", ["Hi"]);
    expect(model.getters.isRowFiltered(sheetId, 4)).toEqual(true);
    expect(model.getters.isRowFiltered(sheetId, 5)).toEqual(true);

    deleteRows(model, [0, 1, 2]);

    expect(model.getters.isRowFiltered(sheetId, 1)).toEqual(true);
    expect(model.getters.isRowFiltered(sheetId, 2)).toEqual(true);
  });

  test("Folding a group after filtering some rows does not hide all rows of the sheet", () => {
    const model = new Model({ sheets: [{ colNumber: 5, rowNumber: 5 }] });
    const sheetId = model.getters.getActiveSheetId();

    groupHeaders(model, "ROW", 0, 3);

    createTableWithFilter(model, "A4:A5");
    setCellContent(model, "A5", "Hi");
    updateFilter(model, "A4", ["Hi"]);

    expect(model.getters.isRowFiltered(sheetId, 4)).toEqual(true);
    foldHeaderGroup(model, "ROW", 0, 3);
    expect(model.getters.isRowFiltered(sheetId, 4)).toEqual(false);
  });

  test("Grouping headers after filtering some rows does not break the data filter state", () => {
    const model = new Model({ sheets: [{ colNumber: 8, rowNumber: 8 }] });
    const sheetId = model.getters.getActiveSheetId();

    groupHeaders(model, "ROW", 0, 5);

    createTableWithFilter(model, "A6:A8");
    setCellContent(model, "A7", "Hi");
    setCellContent(model, "A8", "Hi");
    updateFilter(model, "A6", ["Hi"]);

    foldHeaderGroup(model, "ROW", 0, 5);
    groupHeaders(model, "ROW", 6, 7);

    expect(model.getters.getHeaderGroups(sheetId, "ROW")).toMatchObject([{ start: 0, end: 7 }]);
    expect(model.getters.isRowFiltered(sheetId, 6)).toEqual(true);
    expect(model.getters.isRowFiltered(sheetId, 7)).toEqual(true);
  });

  test("row filtered in an inactive sheet", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();

    createTableWithFilter(model, "A6:A8");
    setCellContent(model, "A7", "Hi");
    updateFilter(model, "A6", ["Hi"]);

    createSheet(model, { sheetId: "sh2", activate: true });
    expect(model.getters.isRowFiltered(sheetId, 6)).toEqual(true);
  });
});

describe("Filter criterion test", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  function getFilteredRows() {
    return range(0, 10).filter((row) => model.getters.isRowFiltered(sheetId, row));
  }

  test.each([
    ["isEmpty", [], [1, 2]],
    ["isNotEmpty", [], [3]],
    ["containsText", ["hello"], [2, 3]],
    ["notContainsText", ["hello"], [1]],
    ["isEqualText", ["there"], [1, 3]],
  ])(
    "Can filter based on a text criterion %s",
    (type: string, criterionValues: string[], expectedFilteredRows: number[]) => {
      const grid = {
        A2: "hello",
        A3: "there",
        A4: "",
      };
      setGrid(model, grid);
      createTableWithFilter(model, "A1:A4");
      updateFilterCriterion(model, "A1", {
        type: type as FilterCriterionType,
        values: criterionValues,
      });

      expect(getFilteredRows()).toEqual(expectedFilteredRows);
    }
  );

  test.each([
    ["beginsWithText", [2]],
    ["endsWithText", [3]],
    ["isEqualText", [2, 3]],
  ])(
    "Filters based on a text criterion %s do not ignore whitespaces",
    (type: string, expectedFilteredRows: number[]) => {
      const grid = {
        A2: "a",
        A3: " a",
        A4: "a ",
      };
      setGrid(model, grid);
      createTableWithFilter(model, "A1:A4");
      updateFilterCriterion(model, "A1", {
        type: type as FilterCriterionType,
        values: ["a"],
      });

      expect(getFilteredRows()).toEqual(expectedFilteredRows);
    }
  );

  test.each([
    ["isEqual", ["1"], [2, 3]],
    ["isNotEqual", ["1"], [1]],
    ["isGreaterThan", ["2"], [1, 2]],
    ["isGreaterOrEqualTo", ["2"], [1]],
    ["isLessThan", ["2"], [2, 3]],
    ["isLessOrEqualTo", ["2"], [3]],
    ["isBetween", ["2", "3"], [1]],
    ["isNotBetween", ["2", "3"], [2, 3]],
  ])(
    "Can filter based on a number criterion %s",
    (type: string, criterionValues: string[], expectedFilteredRows: number[]) => {
      const grid = {
        A2: "1",
        A3: "2",
        A4: "3",
      };
      setGrid(model, grid);
      createTableWithFilter(model, "A1:A4");
      updateFilterCriterion(model, "A1", {
        type: type as FilterCriterionType,
        values: criterionValues,
      });

      expect(getFilteredRows()).toEqual(expectedFilteredRows);
    }
  );

  test.each([
    ["dateIs", ["01/20/2025"], [2, 3]],
    ["dateIsBefore", ["04/15/2025"], [2, 3]],
    ["dateIsOnOrBefore", ["04/15/2025"], [3]],
    ["dateIsAfter", ["04/15/2025"], [1, 2]],
    ["dateIsOnOrAfter", ["04/15/2025"], [1]],
    ["dateIsBetween", ["01/01/2025", "05/01/2025"], [3]],
    ["dateIsNotBetween", ["01/01/2025", "05/01/2025"], [1, 2]],
  ])(
    "Can filter based on a date criterion %s",
    (type: string, criterionValues: string[], expectedFilteredRows: number[]) => {
      const grid = {
        A2: "01/20/2025",
        A3: "04/15/2025",
        A4: "07/10/2025",
      };
      setGrid(model, grid);
      createTableWithFilter(model, "A1:A4");
      updateFilterCriterion(model, "A1", {
        type: type as FilterCriterionType,
        values: criterionValues,
        dateValue: "exactDate",
      });

      expect(getFilteredRows()).toEqual(expectedFilteredRows);
    }
  );

  test("applies filter correctly when formula returns a 1x1 matrix", () => {
    const grid = {
      A2: "text",
      A3: "random",
    };
    setGrid(model, grid);
    createTableWithFilter(model, "A1:A3");

    updateFilterCriterion(model, "A1", {
      type: "containsText",
      values: ['=IF(TRUE, $A$2, "something else")'],
    });

    expect(getFilteredRows()).toEqual([2]);
  });
});
