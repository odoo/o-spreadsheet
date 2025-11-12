import { Model } from "@odoo/o-spreadsheet-engine";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  ZOOM_VALUES,
} from "@odoo/o-spreadsheet-engine/constants";
import { setCellContent } from "./test_helpers/commands_helpers";
import { clickCell, clickHeader, hoverCell } from "./test_helpers/dom_helper";
import { getSelectionAnchorCellXc } from "./test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick } from "./test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;

jest.useFakeTimers();

afterAll(() => {
  jest.useRealTimers();
});

describe("Spreadsheet zoom tests", () => {
  describe.each(ZOOM_VALUES.map((zoom) => zoom / 100))("Zoom tests selection %s", (zoom) => {
    beforeEach(async () => {
      ({ model, fixture } = await mountSpreadsheet());
      model.dispatch("SET_ZOOM", { zoom });
      await nextTick();
    });
    test("can render a sheet with zoom", async () => {
      expect(fixture.querySelector(".o-grid-overlay")).not.toBeNull();
    });

    test("can click on a cell to select it", async () => {
      setCellContent(model, "B2", "b2");
      setCellContent(model, "B3", "b3");
      await clickCell(model, "C8", {}, { clickInMiddle: true });
      expect(getSelectionAnchorCellXc(model)).toBe("C8");
    });

    test("can click on the edge of a cell to select it", async () => {
      setCellContent(model, "B2", "b2");
      setCellContent(model, "B3", "b3");
      // by default we click on top left
      await clickCell(model, "C8");
      expect(getSelectionAnchorCellXc(model)).toBe("C8");
      await clickCell(
        model,
        "C8",
        {},
        { offsetX: DEFAULT_CELL_WIDTH * zoom - 1, offsetY: DEFAULT_CELL_HEIGHT * zoom - 1 }
      );
      expect(getSelectionAnchorCellXc(model)).toBe("C8");
    });

    test("can select a COL header", async () => {
      setCellContent(model, "B2", "b2");
      setCellContent(model, "B3", "b3");
      await clickHeader(model, "COL", 2, {});
      expect(getSelectionAnchorCellXc(model)).toBe("C1");
    });

    test("can select a ROW header", async () => {
      setCellContent(model, "B2", "b2");
      setCellContent(model, "B3", "b3");
      await clickHeader(model, "ROW", 2, {});
      expect(getSelectionAnchorCellXc(model)).toBe("A4");
    });

    test("can hover a cell to show its error", async () => {
      setCellContent(model, "A10", "=1/0");
      expect(fixture.querySelector(".o-error-tooltip")).toBeFalsy();
      await hoverCell(model, "A10", 400);
      expect(fixture.querySelector(".o-error-tooltip")).toBeTruthy();
    });
  });
});

describe("Dashboard zoom tests", () => {
  describe.each(ZOOM_VALUES.map((zoom) => zoom / 100))("Zoom tests selection %s", (zoom) => {
    beforeEach(async () => {
      ({ model, fixture } = await mountSpreadsheet());
      model.dispatch("SET_ZOOM", { zoom });
      setCellContent(model, "C8", "=1/0");
      model.updateMode("dashboard");
      await nextTick();
    });
    test("can render a sheet with zoom", async () => {
      expect(fixture.querySelector(".o-grid-overlay")).not.toBeNull();
    });

    test("can hover a cell to show its error", async () => {
      expect(fixture.querySelector(".o-error-tooltip")).toBeNull();
      await hoverCell(model, "C8", 400);
      expect(fixture.querySelector(".o-error-tooltip")).toBeTruthy();
    });
  });
});
