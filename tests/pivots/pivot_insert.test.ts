import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { insertPivot } from "../test_helpers/commands_helpers";
import { getCellText } from "../test_helpers/getters_helpers";

describe("Insert pivot command", () => {
  test("Can insert a pivot in a cell", () => {
    const model = Model.BuildSync();
    insertPivot(model, "A1", "pivot1", "Sheet2");
    expect(model.getters.getActiveSheetId()).toEqual("Sheet2");
    expect(getCellText(model, "A1")).toEqual("=PIVOT(1)");
    expect(model.getters.getPivotIds()).toHaveLength(1);
    expect(model.getters.getPivotCoreDefinition("pivot1")["dataSet"].zone).toEqual(toZone("A1"));
  });

  test("Can insert a pivot from a zone", () => {
    const model = Model.BuildSync();
    insertPivot(model, "A1:B2", "pivot1", "Sheet2");
    expect(model.getters.getPivotCoreDefinition("pivot1")["dataSet"].zone).toEqual(toZone("A1:B2"));
  });

  test("Can insert a pivot from a contiguous zone", () => {
    const model = Model.BuildSync({
      sheets: [
        {
          id: "Sheet1",
          cells: {
            A1: { content: "1" },
            A2: { content: "2" },
            B1: { content: "3" },
            B2: { content: "4" },
          },
        },
      ],
    });
    insertPivot(model, "A1", "pivot1", "Sheet2");
    expect(model.getters.getPivotCoreDefinition("pivot1")["dataSet"].zone).toEqual(toZone("A1:B2"));
  });
});
