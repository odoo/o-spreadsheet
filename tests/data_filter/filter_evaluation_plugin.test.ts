import { Model } from "../../src";
import { DEFAULT_BORDER_DESC, DEFAULT_FILTER_BORDER_DESC } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { UID } from "../../src/types";
import {
  addRows,
  createFilter,
  createSheet,
  deleteFilter,
  deleteRows,
  foldHeaderGroup,
  groupHeaders,
  hideColumns,
  hideRows,
  setCellContent,
  setFormat,
  setZoneBorders,
  updateFilter,
} from "../test_helpers/commands_helpers";

describe("Filter Evaluation Plugin", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();

    setCellContent(model, "A1", "A1");
    setCellContent(model, "A2", "A2");
    setCellContent(model, "A3", "A3");
    setCellContent(model, "A4", "A4");
    setCellContent(model, "A5", "A5");
    createFilter(model, "A1:A5");

    setCellContent(model, "B1", "Header");
    setCellContent(model, "B2", "1");
    setCellContent(model, "B3", "1");
    setCellContent(model, "B4", "2");
    setCellContent(model, "B5", "2");
    createFilter(model, "B1:B5");
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

  test("deleting a filter table show rows again", () => {
    const model = new Model();
    createFilter(model, "A1:A3");
    setCellContent(model, "A2", "Hi");
    updateFilter(model, "A2", ["Hi"]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);
    deleteFilter(model, "A1:A3");
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(false);
  });

  test("Filters ignore lowercase/uppercase", () => {
    setCellContent(model, "A2", "A");
    setCellContent(model, "A3", "a");
    updateFilter(model, "A2", ["A"]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);
    expect(model.getters.isRowHidden(sheetId, 2)).toEqual(true);
  });

  test("Header isn't filtered", () => {
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

  test("Filters borders are correct", () => {
    createFilter(model, "A7:B9");
    const zone = toZone("A7:B9");
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const filterBorder = model.getters.getCellBorderWithFilterBorder({ sheetId, col, row });
        const expected = {};
        expected["top"] = row === zone.top ? DEFAULT_FILTER_BORDER_DESC : undefined;
        expected["bottom"] = row === zone.bottom ? DEFAULT_FILTER_BORDER_DESC : undefined;
        expected["left"] = col === zone.left ? DEFAULT_FILTER_BORDER_DESC : undefined;
        expected["right"] = col === zone.right ? DEFAULT_FILTER_BORDER_DESC : undefined;
        expect(filterBorder).toEqual(expected);
      }
    }
  });

  test("Filters borders don't overwrite cell borders", () => {
    setZoneBorders(model, { position: "left" }, ["A7:A9"]);
    createFilter(model, "A7:A9");
    const zone = toZone("A7:A9");
    for (let row = zone.top; row <= zone.bottom; row++) {
      const filterBorder = model.getters.getCellBorderWithFilterBorder({ sheetId, col: 0, row });
      const expected = {
        top: row === zone.top ? DEFAULT_FILTER_BORDER_DESC : undefined,
        bottom: row === zone.bottom ? DEFAULT_FILTER_BORDER_DESC : undefined,
        left: DEFAULT_BORDER_DESC,
        right: DEFAULT_FILTER_BORDER_DESC,
      };
      expect(filterBorder).toEqual(expected);
    }
  });

  test("Filters borders are correct when cols and rows of the filter are hidden", () => {
    createFilter(model, "A7:E14");
    hideColumns(model, ["E", "A", "B"]);
    hideRows(model, [6, 12, 13]);

    const zone = toZone("C8:D12");
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const filterBorder = model.getters.getCellBorderWithFilterBorder({ sheetId, col, row });
        const expected = {};
        expected["top"] = row === zone.top ? DEFAULT_FILTER_BORDER_DESC : undefined;
        expected["bottom"] = row === zone.bottom ? DEFAULT_FILTER_BORDER_DESC : undefined;
        expected["left"] = col === zone.left ? DEFAULT_FILTER_BORDER_DESC : undefined;
        expected["right"] = col === zone.right ? DEFAULT_FILTER_BORDER_DESC : undefined;
        expect(filterBorder).toEqual(expected);
      }
    }
  });

  test("Sheet duplication after importing filter don't break", () => {
    const model = new Model({ sheets: [{ id: "sh1", filterTables: [{ range: "A1:A8" }] }] });
    expect(model.getters.getFilter({ sheetId: "sh1", col: 0, row: 0 })).toBeTruthy();

    model.dispatch("DUPLICATE_SHEET", {
      sheetId: "sh1",
      sheetIdTo: "sh2",
    });
    expect(model.getters.getFilter({ sheetId: "sh2", col: 0, row: 0 })).toBeTruthy();
  });

  test("Inserting rows above or below the data filter header updates the filtered rows", () => {
    const model = new Model();

    createFilter(model, "A1:A2");
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

  test("Removing rows above the data filter header updates the filtered rows", () => {
    const model = new Model();

    createFilter(model, "A4:A6");
    setCellContent(model, "A5", "Hi");
    setCellContent(model, "A6", "Hi");

    updateFilter(model, "A4", ["Hi"]);
    expect(model.getters.isRowFiltered(sheetId, 4)).toEqual(true);
    expect(model.getters.isRowFiltered(sheetId, 5)).toEqual(true);

    deleteRows(model, [0, 1, 2]);

    expect(model.getters.isRowFiltered(sheetId, 1)).toEqual(true);
    expect(model.getters.isRowFiltered(sheetId, 2)).toEqual(true);
  });

  test("Folding a group after filtering some rows doesn't hide all rows of the sheet", () => {
    const model = new Model({ sheets: [{ colNumber: 5, rowNumber: 5 }] });
    const sheetId = model.getters.getActiveSheetId();

    groupHeaders(model, "ROW", 0, 3);

    createFilter(model, "A4:A5");
    setCellContent(model, "A5", "Hi");
    updateFilter(model, "A4", ["Hi"]);

    expect(model.getters.isRowFiltered(sheetId, 4)).toEqual(true);
    foldHeaderGroup(model, "ROW", 0, 3);
    expect(model.getters.isRowFiltered(sheetId, 4)).toEqual(false);
  });

  test("Grouping headers after filtering some rows doesn't break the data filter state", () => {
    const model = new Model({ sheets: [{ colNumber: 8, rowNumber: 8 }] });
    const sheetId = model.getters.getActiveSheetId();

    groupHeaders(model, "ROW", 0, 5);

    createFilter(model, "A6:A8");
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

    createFilter(model, "A6:A8");
    setCellContent(model, "A7", "Hi");
    updateFilter(model, "A6", ["Hi"]);

    createSheet(model, { sheetId: "sh2", activate: true });
    expect(model.getters.isRowFiltered(sheetId, 6)).toEqual(true);
  });
});
