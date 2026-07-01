import { Model } from "../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, ZOOM_VALUES } from "../src/constants";
import { SpreadsheetChildEnv } from "../src/types/spreadsheet_env";
import { setCellContent, setZoom } from "./test_helpers/commands_helpers";
import { clickCell, clickHeader, hoverCell } from "./test_helpers/dom_helper";
import { getSelectionAnchorCellXc } from "./test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick, useJestFakeTimers } from "./test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;
let env: SpreadsheetChildEnv;

useJestFakeTimers();

afterAll(() => {
  jest.useRealTimers();
});

describe("Spreadsheet zoom tests", () => {
  describe.each(ZOOM_VALUES.map((zoom) => zoom / 100))("Zoom tests selection %s", (zoom) => {
    beforeEach(async () => {
      ({ model, fixture, env } = await mountSpreadsheet());
      setZoom(env, zoom);
      await nextTick();
    });
    test("can render a sheet with zoom", async () => {
      expect(fixture.querySelector(".o-grid-overlay")).not.toBeNull();
    });

    test("can click on a cell to select it", async () => {
      setCellContent(model, "B2", "b2");
      setCellContent(model, "B3", "b3");
      await clickCell(env, "C8", {}, { clickInMiddle: true });
      expect(getSelectionAnchorCellXc(model)).toBe("C8");
    });

    test("can click on the edge of a cell to select it", async () => {
      setCellContent(model, "B2", "b2");
      setCellContent(model, "B3", "b3");
      // by default we click on top left
      await clickCell(env, "C8");
      expect(getSelectionAnchorCellXc(model)).toBe("C8");
      await clickCell(
        env,
        "C8",
        {},
        { offsetX: DEFAULT_CELL_WIDTH * zoom - 1, offsetY: DEFAULT_CELL_HEIGHT * zoom - 1 }
      );
      expect(getSelectionAnchorCellXc(model)).toBe("C8");
    });

    test("can select a COL header", async () => {
      setCellContent(model, "B2", "b2");
      setCellContent(model, "B3", "b3");
      await clickHeader(env, "COL", 2, {});
      expect(getSelectionAnchorCellXc(model)).toBe("C1");
    });

    test("can select a ROW header", async () => {
      setCellContent(model, "B2", "b2");
      setCellContent(model, "B3", "b3");
      await clickHeader(env, "ROW", 2, {});
      expect(getSelectionAnchorCellXc(model)).toBe("A4");
    });

    test("can hover a cell to show its error", async () => {
      setCellContent(model, "A10", "=1/0");
      expect(fixture.querySelector(".o-error-tooltip")).toBeFalsy();
      await hoverCell(env, "A10", 400);
      expect(fixture.querySelector(".o-error-tooltip")).toBeTruthy();
    });
  });
});

describe("Dashboard zoom tests", () => {
  describe.each(ZOOM_VALUES.map((zoom) => zoom / 100))("Zoom tests selection %s", (zoom) => {
    beforeEach(async () => {
      ({ model, fixture, env } = await mountSpreadsheet());
      setZoom(env, zoom);
      setCellContent(model, "C8", "=1/0");
      model.updateMode("dashboard");
      await nextTick();
    });
    test("can render a sheet with zoom", async () => {
      expect(fixture.querySelector(".o-grid-overlay")).not.toBeNull();
    });

    test("can hover a cell to show its error", async () => {
      expect(fixture.querySelector(".o-error-tooltip")).toBeNull();
      await hoverCell(env, "C8", 400);
      expect(fixture.querySelector(".o-error-tooltip")).toBeTruthy();
    });
  });
});
