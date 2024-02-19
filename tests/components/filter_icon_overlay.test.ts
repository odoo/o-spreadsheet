import { Model } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { createTable } from "../test_helpers/commands_helpers";
import { simulateClick } from "../test_helpers/dom_helper";
import { mountSpreadsheet } from "../test_helpers/helpers";

describe("Filter Icon Overlay component", () => {
  test("Overlapping filters are overwritten by the latest inserted", async () => {
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
    const { fixture } = await mountSpreadsheet({ model });
    expect(fixture.querySelectorAll(".o-filter-icon").length).toBe(3);
  });

  test("Click on filter icon bubble and select the underlying cell", async () => {
    const model = new Model();
    createTable(model, "B2:B3");
    const sheetId = model.getters.getActiveSheetId();
    const {} = await mountSpreadsheet({ model });
    expect(model.getters.getActivePosition()).toEqual({ sheetId, col: 0, row: 0 });

    await simulateClick(".o-filter-icon", DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT);
    expect(model.getters.getActivePosition()).toEqual({ sheetId, col: 1, row: 1 });
  });
});
