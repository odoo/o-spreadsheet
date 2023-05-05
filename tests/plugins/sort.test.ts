import { INCORRECT_RANGE_STRING } from "../../src/constants";
import { parseDateTime } from "../../src/helpers/dates";
import { toZone, zoneToXc } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { CellValueType, DEFAULT_LOCALE, UID } from "../../src/types";
import { redo, setCellContent, sort, undo } from "../test_helpers/commands_helpers";
import { getEvaluatedCell } from "../test_helpers/getters_helpers";
import { getCellsObject } from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

let model: Model;
const dateFormat = "mm/dd/yyyy";
const locale = DEFAULT_LOCALE;

describe("Basic Sorting", () => {
  const sheetId: UID = "sheetId";
  test("Sort Numbers then undo then redo", () => {
    const cells = {
      A1: { content: "4" },
      A2: { content: "23" },
      A3: { content: "8" },
      A4: { content: "42" },
      A5: { content: "16" },
      A6: { content: "15" },
    };
    model = new Model({ sheets: [{ id: sheetId, colNumber: 1, rowNumber: 6, cells: cells }] });
    sort(model, {
      zone: "A1:A6",
      anchor: "A2",
      direction: "ascending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "4" },
      A2: { content: "8" },
      A3: { content: "15" },
      A4: { content: "16" },
      A5: { content: "23" },
      A6: { content: "42" },
    });
    undo(model);
    expect(getCellsObject(model, sheetId)).toMatchObject(cells);
    redo(model);
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "4" },
      A2: { content: "8" },
      A3: { content: "15" },
      A4: { content: "16" },
      A5: { content: "23" },
      A6: { content: "42" },
    });
  });
  test("Sort Text", () => {
    model = new Model({
      sheets: [
        {
          id: sheetId,
          colNumber: 1,
          rowNumber: 6,
          cells: {
            A1: { content: "Mike" },
            A2: { content: "Zulu" },
            A3: { content: "Echo" },
            A4: { content: "Alpha" },
            A5: { content: "November" },
            A6: { content: "Sierra" },
          },
        },
      ],
    });
    sort(model, {
      zone: "A1:A6",
      anchor: "A2",
      direction: "ascending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "Alpha" },
      A2: { content: "Echo" },
      A3: { content: "Mike" },
      A4: { content: "November" },
      A5: { content: "Sierra" },
      A6: { content: "Zulu" },
    });
  });
  test("Sort Dates", () => {
    model = new Model({
      sheets: [
        {
          id: sheetId,
          colNumber: 1,
          rowNumber: 6,
          cells: {
            A1: { content: "11/24/1991", format: dateFormat },
            A2: { content: "06/06/1944", format: dateFormat },
            A3: { content: "11/08/2016", format: dateFormat },
            A4: { content: "09/05/1946", format: dateFormat },
            A5: { content: "08/18/1969", format: dateFormat },
            A6: { content: "08/15/1969", format: dateFormat },
          },
        },
      ],
    });
    sort(model, {
      zone: "A1:A6",
      anchor: "A1",
      direction: "ascending",
    });

    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { value: parseDateTime("06/06/1944", locale)!.value },
      A2: { value: parseDateTime("09/05/1946", locale)!.value },
      A3: { value: parseDateTime("08/15/1969", locale)!.value },
      A4: { value: parseDateTime("08/18/1969", locale)!.value },
      A5: { value: parseDateTime("11/24/1991", locale)!.value },
      A6: { value: parseDateTime("11/08/2016", locale)!.value },
    });
  });
  test("Sort Formulas", () => {
    model = new Model({
      sheets: [
        {
          id: sheetId,
          colNumber: 3,
          rowNumber: 6,
          cells: {
            A1: { content: "4" },
            A2: { content: "23" },
            A3: { content: "8" },
            A4: { content: "42" },
            C1: { content: "=A3*10" }, // 80
            C2: { content: "=SUM(A2, A3)" }, // 31
            C3: { content: "=EQ(A1, 4)" }, // TRUE
            C4: { content: '=CONCAT("ki", "kou")' },
            C5: { content: "=BADBUNNY" }, // #BAD_EXPR
            C6: { content: "=B1/B2" },
          },
        },
      ],
    });
    sort(model, {
      zone: "C1:C6",
      anchor: "C1",
      direction: "ascending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      C1: { content: "=SUM(A1, A2)" },
      C2: { content: "=A4*10" },
      C3: { content: "=BADBUNNY" },
      C4: {
        content: `=${INCORRECT_RANGE_STRING}/${INCORRECT_RANGE_STRING}`,
      },
      C5: { content: '=CONCAT("ki", "kou")' },
      C6: { content: "=EQ(A4, 4)" },
    });
    expect(getEvaluatedCell(model, "C3").type).toBe(CellValueType.error);
    expect(getEvaluatedCell(model, "C4").type).toBe(CellValueType.error);
  });
  test("Sort all types of cells then undo then redo", () => {
    model = new Model({
      sheets: [
        {
          id: sheetId,
          colNumber: 2,
          rowNumber: 11,
          cells: {
            A1: { content: "23" },
            A2: { content: "4" },
            A3: { content: '=CONCAT("Zor", "glub")' },
            A4: { content: "=DATE(2012, 12, 21)" },
            A5: { content: "Machette" },
            A7: { content: "Kills" },
            A8: { content: "=BADBUNNY" }, // #BAD_EXPR
            A9: { content: "=SUM(4, A1)" }, // 27
            A10: { content: "2020/09/01" },
            A11: { content: "=B1/B2" },
          },
        },
      ],
    });
    sort(model, {
      zone: "A1:A11",
      anchor: "A1",
      direction: "ascending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "4" },
      A2: { content: "23" },
      A3: { content: `=SUM(4, ${INCORRECT_RANGE_STRING})` },
      A4: { content: "=DATE(2012, 12, 21)" },
      A5: { value: parseDateTime("2020/09/01", locale)!.value },
      A6: { content: "=BADBUNNY" },
      A7: {
        content: `=${INCORRECT_RANGE_STRING}/${INCORRECT_RANGE_STRING}`,
      },
      A8: { content: "Kills" },
      A9: { content: "Machette" },
      A10: { content: '=CONCAT("Zor", "glub")' },
    });
    expect(getEvaluatedCell(model, "A6").type).toBe(CellValueType.error);
    expect(getEvaluatedCell(model, "A7").type).toBe(CellValueType.error);
    undo(model);
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "23" },
      A2: { content: "4" },
      A3: { content: '=CONCAT("Zor", "glub")' },
      A4: { content: "=DATE(2012, 12, 21)" },
      A5: { content: "Machette" },
      A7: { content: "Kills" },
      A8: { content: "=BADBUNNY" },
      A9: { content: "=SUM(4, A1)" },
      A10: { value: parseDateTime("2020/09/01", locale)!.value },
      A11: { content: "=B1/B2" },
    });
    redo(model);
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "4" },
      A2: { content: "23" },
      A3: { content: `=SUM(4, ${INCORRECT_RANGE_STRING})` },
      A4: { content: "=DATE(2012, 12, 21)" },
      A5: { value: parseDateTime("2020/09/01", locale)!.value },
      A6: { content: "=BADBUNNY" },
      A7: {
        content: `=${INCORRECT_RANGE_STRING}/${INCORRECT_RANGE_STRING}`,
      },
      A8: { content: "Kills" },
      A9: { content: "Machette" },
      A10: { content: '=CONCAT("Zor", "glub")' },
    });
    expect(getEvaluatedCell(model, "A6").type).toBe(CellValueType.error);
    expect(getEvaluatedCell(model, "A7").type).toBe(CellValueType.error);
  });
  test("Sort style", () => {
    const myStyle = { textColor: "#fe0000" };
    model = new Model({
      sheets: [
        {
          id: sheetId,
          colNumber: 1,
          rowNumber: 8,
          cells: {
            A1: { content: "33" },
            A2: { content: "11", style: 1 },
            A3: { content: "22", border: 1 },
          },
        },
      ],
      styles: { 1: myStyle },
    });
    sort(model, {
      zone: "A1:A3",
      anchor: "A2",
      direction: "ascending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "11", style: myStyle },
      A2: { content: "22" },
      A3: { content: "33" },
    });
  });

  test("Sort with empty cells", () => {
    model = new Model({
      sheets: [
        {
          id: sheetId,
          colNumber: 1,
          rowNumber: 8,
          cells: {
            A2: { content: "-33" },
            A3: { content: "11" },
            A4: { content: "22" },
            A5: { content: "ab" },
            A6: { content: "ba" },
          },
        },
      ],
    });
    sort(model, {
      zone: "A1:A7",
      anchor: "A2",
      direction: "ascending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "-33" },
      A2: { content: "11" },
      A3: { content: "22" },
      A4: { content: "ab" },
      A5: { content: "ba" },
    });
  });

  test("Sort with emptyCellAsZero option", () => {
    model = new Model({
      sheets: [
        {
          id: sheetId,
          colNumber: 1,
          rowNumber: 8,
          cells: {
            A2: { content: "-33" },
            A3: { content: "11" },
            A4: { content: "22" },
            A5: { content: "ab" },
            A6: { content: "ba" },
          },
        },
      ],
    });
    sort(model, {
      zone: "A1:A7",
      anchor: "A2",
      direction: "ascending",
      sortOptions: { emptyCellAsZero: true },
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "-33" },
      A4: { content: "11" },
      A5: { content: "22" },
      A6: { content: "ab" },
      A7: { content: "ba" },
    });

    sort(model, {
      zone: "A1:A7",
      anchor: "A2",
      direction: "descending",
      sortOptions: { emptyCellAsZero: true },
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "ba" },
      A2: { content: "ab" },
      A3: { content: "22" },
      A4: { content: "11" },
      A7: { content: "-33" },
    });
  });
});

describe("Trigger sort generic errors", () => {
  const sheetId: UID = "sheet2";

  test("Sort with anchor outside of the sorting zone", () => {
    const model = new Model({ sheets: [{ id: sheetId, colNumber: 1, rowNumber: 6 }] });
    expect(() => {
      sort(model, {
        zone: "A1:A3",
        anchor: "A6",
        direction: "ascending",
      });
    }).toThrowError();
  });
});

describe("Sort multi adjacent columns", () => {
  const sheetId: UID = "sheet3";
  const modelData = {
    sheets: [
      {
        id: sheetId,
        colNumber: 4,
        rowNumber: 5,
        cells: {
          A1: { content: "Alpha" },
          A2: { content: "Tango" },
          A3: { content: "Delta" },
          A4: { content: "Zulu" },
          B1: { content: "3" },
          B2: { content: "4" },
          B3: { content: "2" },
          C2: { content: "5" },
          C4: { content: "Charlie" },
          D5: { content: "6" },
        },
      },
    ],
  };

  /**
   * Interactive tests for same are moved to helpers/ui.test.ts
   * Manually calling the getContiguousZone function.
   */
  test("Sort on second column w/ contiguous", () => {
    model = new Model(modelData);
    const zone = toZone("B2:B3");
    const sheetId = model.getters.getActiveSheetId();
    const contiguousZone = model.getters.getContiguousZone(sheetId, zone);
    sort(model, {
      zone: zoneToXc(contiguousZone),
      anchor: "B2",
      direction: "descending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "Tango" },
      A2: { content: "Alpha" },
      A3: { content: "Delta" },
      A4: { content: "Zulu" },
      B1: { content: "4" },
      B2: { content: "3" },
      B3: { content: "2" },
      C1: { content: "5" },
      C4: { content: "Charlie" },
      D5: { content: "6" },
    });
  });
  test("Sort on third column  w/ contiguous", () => {
    model = new Model(modelData);
    const zone = toZone("C2:C4");
    const contiguousZone = model.getters.getContiguousZone(sheetId, zone);
    sort(model, {
      zone: zoneToXc(contiguousZone),
      anchor: "C2",
      direction: "descending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "Zulu" },
      A2: { content: "Tango" },
      A3: { content: "Alpha" },
      A4: { content: "Delta" },
      B2: { content: "4" },
      B3: { content: "3" },
      B4: { content: "2" },
      C1: { content: "Charlie" },
      C2: { content: "5" },
      D5: { content: "6" },
    });
  });
  test("Sort on fourth column w/ contiguous", () => {
    model = new Model(modelData);
    const zone = toZone("D2:D5");
    const contiguousZone = model.getters.getContiguousZone(sheetId, zone);
    sort(model, {
      zone: zoneToXc(contiguousZone),
      anchor: "D5",
      direction: "descending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A2: { content: "Alpha" },
      A3: { content: "Tango" },
      A4: { content: "Delta" },
      A5: { content: "Zulu" },
      B2: { content: "3" },
      B3: { content: "4" },
      B4: { content: "2" },
      C3: { content: "5" },
      C5: { content: "Charlie" },
      D1: { content: "6" },
    });
  });

  test("Sort w/ multicolumn selection", () => {
    model = new Model(modelData);
    sort(model, {
      zone: "B2:C3",
      anchor: "B3",
      direction: "ascending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "Alpha" },
      A2: { content: "Tango" },
      A3: { content: "Delta" },
      A4: { content: "Zulu" },
      B1: { content: "3" },
      B2: { content: "2" },
      B3: { content: "4" },
      C3: { content: "5" },
      C4: { content: "Charlie" },
      D5: { content: "6" },
    });
  });
});

describe("Sort adjacent columns with headers", () => {
  const sheetId: UID = "sheet4";
  beforeEach(() => {
    model = new Model({
      sheets: [
        {
          id: sheetId,
          colNumber: 5,
          rowNumber: 4,
          cells: {
            A1: { content: "=B2" }, // => HEADER
            A2: { content: "Tango" },
            A3: { content: "Delta" },
            A4: { content: "Alpha" },
            B1: { content: "Col1" }, //=> HEADER
            B2: { content: "49" },
            B3: { content: "2500" },
            B4: { content: "192" },
            C1: { content: "Col2" },
            C2: { content: "09/13/2020" },
            C3: { content: "09/14/2020" },
            C4: { content: "09/15/2020" },
          },
        },
      ],
    });
  });
  test("Presence of header", () => {
    sort(model, {
      zone: "A1:C4",
      anchor: "A1",
      direction: "ascending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "=B2" },
      A2: { content: "Alpha" },
      A3: { content: "Delta" },
      A4: { content: "Tango" },
      B1: { content: "Col1" },
      B2: { content: "192" },
      B3: { content: "2500" },
      B4: { content: "49" },
      C1: { content: "Col2" },
      C2: { value: parseDateTime("09/15/2020", locale)!.value },
      C3: { value: parseDateTime("09/14/2020", locale)!.value },
      C4: { value: parseDateTime("09/13/2020", locale)!.value },
    });
  });

  test("No header with option sortHeaders set to true", () => {
    sort(model, {
      zone: "B1:C4",
      anchor: "B1",
      direction: "ascending",
      sortOptions: { sortHeaders: true },
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      B1: { content: "49" },
      B2: { content: "192" },
      B3: { content: "2500" },
      B4: { content: "Col1" },
      C1: { value: parseDateTime("09/13/2020", locale)!.value },
      C2: { value: parseDateTime("09/15/2020", locale)!.value },
      C3: { value: parseDateTime("09/14/2020", locale)!.value },
      C4: { content: "Col2" },
    });
  });

  test("Empty TopLeft cell does not alter the presence of header", () => {
    setCellContent(model, "A1", "", sheetId);
    sort(model, {
      zone: "A1:C4",
      anchor: "A1",
      direction: "ascending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A2: { content: "Alpha" },
      A3: { content: "Delta" },
      A4: { content: "Tango" },
      B1: { content: "Col1" },
      B2: { content: "192" },
      B3: { content: "2500" },
      B4: { content: "49" },
      C1: { content: "Col2" },
      C2: { value: parseDateTime("09/15/2020", locale)!.value },
      C3: { value: parseDateTime("09/14/2020", locale)!.value },
      C4: { value: parseDateTime("09/13/2020", locale)!.value },
    });
  });
  test("No header when there is an empty cell on top row (other than topLeft)", () => {
    setCellContent(model, "C1", "", sheetId);
    sort(model, {
      zone: "A1:C4",
      anchor: "B1",
      direction: "ascending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "Tango" },
      A2: { content: "Alpha" },
      A3: { content: "Delta" },
      A4: { content: "=B5" },
      B1: { content: "49" },
      B2: { content: "192" },
      B3: { content: "2500" },
      B4: { content: "Col1" },
      C1: { value: parseDateTime("09/13/2020", locale)!.value },
      C2: { value: parseDateTime("09/15/2020", locale)!.value },
      C3: { value: parseDateTime("09/14/2020", locale)!.value },
    });
  });
  test("No header when comparing top row cells to empty cells", () => {
    // disqualify cols 1 and 2 by giving them the same type of cell as the one below
    setCellContent(model, "A1", "Zulu", sheetId);
    setCellContent(model, "B1", "44", sheetId);

    // arrange empty cell in second row of 3rd col
    setCellContent(model, "C2", "", sheetId);

    sort(model, {
      zone: "A1:C4",
      anchor: "A1",
      direction: "ascending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A1: { content: "Alpha" },
      A2: { content: "Delta" },
      A3: { content: "Tango" },
      A4: { content: "Zulu" }, // refered to B5 which is empty
      B1: { content: "192" },
      B2: { content: "2500" },
      B3: { content: "49" },
      B4: { content: "44" },
      C1: { value: parseDateTime("09/15/2020", locale)!.value },
      C2: { value: parseDateTime("09/14/2020", locale)!.value },
      C4: { content: "Col2" },
    });
  });
});

describe("Sort Merges", () => {
  const sheetId: UID = "sheet5";
  const modelData = {
    sheets: [
      {
        id: sheetId,
        colNumber: 6,
        rowNumber: 10,
        cells: {
          B2: { content: "20" },
          B5: { content: "6" },
          B8: { content: "9" },
          C2: { content: "Zulu" },
          C5: { content: "Echo" },
          C8: { content: "Golf" },
          D2: { content: "09/20/2020" },
          D5: { content: "08/20/2020" },
          D8: { content: "07/20/2020" },
        },
        merges: [
          "B2:B4",
          "B5:B7",
          "B8:B10",
          "C2:C4",
          "C5:C7",
          "C8:C10",
          "D2:D4",
          "D5:D7",
          "D8:D10",
        ],
      },
    ],
  };
  beforeEach(() => {
    model = new Model(modelData);
  });
  test("Sort of merges w/ contiguous", () => {
    const zone = toZone("B2:B4");
    const contiguousZone = model.getters.getContiguousZone(sheetId, zone);
    sort(model, {
      zone: zoneToXc(contiguousZone),
      anchor: "B2",
      direction: "ascending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      B2: { content: "6" },
      B5: { content: "9" },
      B8: { content: "20" },
      C2: { content: "Echo" },
      C5: { content: "Golf" },
      C8: { content: "Zulu" },
      D2: { value: parseDateTime("08/20/2020", locale)!.value },
      D5: { value: parseDateTime("07/20/2020", locale)!.value },
      D8: { value: parseDateTime("09/20/2020", locale)!.value },
    });
  });

  test("Sort w/ multicolumn selection", () => {
    sort(model, {
      zone: "B5:C10",
      anchor: "B5",
      direction: "descending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      B2: { content: "20" },
      B5: { content: "9" },
      B8: { content: "6" },
      C2: { content: "Zulu" },
      C5: { content: "Golf" },
      C8: { content: "Echo" },
      D2: { value: parseDateTime("09/20/2020", locale)!.value },
      D5: { value: parseDateTime("08/20/2020", locale)!.value },
      D8: { value: parseDateTime("07/20/2020", locale)!.value },
    });
  });

  test("Sort merges with headers", () => {
    // Add header i.e. text in a column of dates
    setCellContent(model, "D2", "Header", sheetId);

    const zone = toZone("B2");
    const contiguousZone = model.getters.getContiguousZone(sheetId, zone);
    sort(model, {
      zone: zoneToXc(contiguousZone),
      anchor: "D2",
      direction: "ascending",
    });
    expect(getCellsObject(model, sheetId)).toMatchObject({
      B2: { content: "20" },
      B5: { content: "9" },
      B8: { content: "6" },
      C2: { content: "Zulu" },
      C5: { content: "Golf" },
      C8: { content: "Echo" },
      D2: { content: "Header" },
      D5: { value: parseDateTime("07/20/2020", locale)!.value },
      D8: { value: parseDateTime("08/20/2020", locale)!.value },
    });
  });
});
