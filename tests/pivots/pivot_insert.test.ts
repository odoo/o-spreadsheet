import { PIVOT_INSERT_TABLE_STYLE_ID } from "@odoo/o-spreadsheet-engine/constants";
import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { copy, insertPivot, paste } from "../test_helpers/commands_helpers";
import { getCell, getCellText, getTable } from "../test_helpers/getters_helpers";
import { setGrid } from "../test_helpers/helpers";

describe("Insert pivot command", () => {
  test("Can insert a pivot in a cell", () => {
    const model = new Model();
    insertPivot(model, "A1", "pivot1", "Sheet2");
    expect(model.getters.getActiveSheetId()).toEqual("Sheet2");
    expect(getCellText(model, "A1")).toEqual("=PIVOT(1)");
    expect(model.getters.getPivotIds()).toHaveLength(1);
    expect(model.getters.getPivotCoreDefinition("pivot1")["dataSet"].zone).toEqual(toZone("A1"));
  });

  test("Can insert a pivot from a zone", () => {
    const model = new Model();
    setGrid(model, { A1: "Header1", B1: "Header2", A2: "Data1", B2: "Data2" });
    insertPivot(model, "A1:B2", "pivot1", "Sheet2");
    expect(model.getters.getPivotCoreDefinition("pivot1")["dataSet"].zone).toEqual(toZone("A1:B2"));
    expect(getTable(model, "A1", "Sheet2")).toMatchObject({
      range: { zone: toZone("A1:A3") },
      config: { styleId: PIVOT_INSERT_TABLE_STYLE_ID },
    });
  });

  test("Can insert a pivot from a contiguous zone", () => {
    const model = new Model({
      sheets: [
        {
          id: "Sheet1",
          cells: {
            A1: "1",
            A2: "2",
            B1: "3",
            B2: "4",
          },
        },
      ],
    });
    insertPivot(model, "A1", "pivot1", "Sheet2");
    expect(model.getters.getPivotCoreDefinition("pivot1")["dataSet"].zone).toEqual(toZone("A1:B2"));
  });
});

describe("Check the style when copying and pasting a pivot table", () => {
  test("copy/paste the top left cell", () => {
    const model = new Model({
      sheets: [
        {
          id: "Sheet1",
          cells: {
            A1: "1",
            A2: "2",
          },
        },
      ],
    });
    insertPivot(model, "A1:A2", "pivot1", "Sheet2");
    copy(model, "A1");
    paste(model, "C1");
    expect(getCell(model, "C1")?.style).toBe(undefined);
    expect(model.getters.getTables("Sheet2")).toHaveLength(2);
  });

  test("copy/paste the whole table", () => {
    const model = new Model({
      sheets: [
        {
          id: "Sheet1",
          cells: {
            A1: "1",
            A2: "2",
          },
        },
      ],
    });
    insertPivot(model, "A1:A2", "pivot1", "Sheet2");
    copy(model, "A1:A3");
    paste(model, "C1");
    expect(getCell(model, "C1")?.style).toBe(undefined);
    expect(model.getters.getTables("Sheet2")).toHaveLength(2);
  });

  test("copy/paste a random cell", () => {
    const model = new Model({
      sheets: [
        {
          id: "Sheet1",
          cells: {
            A1: "1",
            A2: "2",
          },
        },
      ],
    });
    insertPivot(model, "A1:A2", "pivot1", "Sheet2");
    copy(model, "A2");
    paste(model, "C1");
    expect(getCell(model, "C1")?.style).toStrictEqual({
      bold: true,
      fillColor: "#6C4E65",
      textColor: "#FFFFFF",
    });
    expect(model.getters.getTables("Sheet2")).toHaveLength(1);
  });
});
