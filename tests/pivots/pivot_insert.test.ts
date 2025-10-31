import { PIVOT_INSERT_TABLE_STYLE_ID } from "@odoo/o-spreadsheet-engine/constants";
import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { insertPivot } from "../test_helpers/commands_helpers";
import { getCellText, getTable } from "../test_helpers/getters_helpers";
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
