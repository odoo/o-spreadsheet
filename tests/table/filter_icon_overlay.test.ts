import { Model } from "../../src";
import { createTableWithFilter } from "../test_helpers/commands_helpers";
import { clickGridIcon } from "../test_helpers/dom_helper";
import { mountSpreadsheet } from "../test_helpers/helpers";

describe("Filter Icon Overlay component", () => {
  test("Overlapping filters are overwritten by the latest inserted", () => {
    const model = new Model({
      version: 12,
      sheets: [
        {
          name: "Sheet1",
          id: "sh1",
          filterTables: [{ range: "A2:B3" }, { range: "A2:C4" }],
        },
      ],
    });
    expect(model.getters.getCellIcons({ col: 0, row: 1, sheetId: "sh1" })).toHaveLength(1);
  });

  test("MouseEvent on filter icon selects the underlying cell", async () => {
    const model = new Model();
    createTableWithFilter(model, "B2:B3");
    const sheetId = model.getters.getActiveSheetId();
    await mountSpreadsheet({ model });
    expect(model.getters.getActivePosition()).toEqual({ sheetId, col: 0, row: 0 });

    await clickGridIcon(model, "B2");
    expect(model.getters.getActivePosition()).toEqual({ sheetId, col: 1, row: 1 });
  });
});
