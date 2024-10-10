import { Model } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { createTableWithFilter } from "../test_helpers/commands_helpers";
import { edgeScrollDelay, simulateClick, triggerMouseEvent } from "../test_helpers/dom_helper";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";

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

  test("MouseEvent on filter icon bubbles and selects the underlying cell", async () => {
    jest.useFakeTimers();
    const model = new Model();
    createTableWithFilter(model, "B2:B3");
    const sheetId = model.getters.getActiveSheetId();
    const {} = await mountSpreadsheet({ model });
    expect(model.getters.getActivePosition()).toEqual({ sheetId, col: 0, row: 0 });
    const { width } = model.getters.getSheetViewDimension();

    await simulateClick(".o-filter-icon", DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT);

    triggerMouseEvent(".o-filter-icon", "pointerdown", DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT);
    await nextTick();
    expect(model.getters.getActivePosition()).toEqual({ sheetId, col: 1, row: 1 });
    triggerMouseEvent(
      ".o-filter-icon",
      "pointermove",
      2.5 * DEFAULT_CELL_WIDTH,
      DEFAULT_CELL_HEIGHT
    );
    const advanceTimer = edgeScrollDelay(1.5 * width, DEFAULT_CELL_HEIGHT);

    jest.advanceTimersByTime(advanceTimer);
    expect(model.getters.getSelectedZone()).toEqual(toZone("B2:C2"));
  });
});
