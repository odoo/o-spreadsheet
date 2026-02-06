import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "@odoo/o-spreadsheet-engine/constants";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Model, UID } from "../../src";
import { Grid } from "../../src/components/grid/grid";
import { toZone, zoneToXc } from "../../src/helpers";
import { createDynamicTable, createTable, setCellContent } from "../test_helpers/commands_helpers";
import { clickAndDrag, triggerMouseEvent } from "../test_helpers/dom_helper";
import { getCellRawContent } from "../test_helpers/getters_helpers";
import {
  flattenHighlightRange,
  getHighlightsFromStore,
  mountComponent,
  nextTick,
} from "../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../test_helpers/mock_helpers";

extendMockGetBoundingClientRect({
  "o-spreadsheet": () => {
    return { x: 0, y: 0, width: 1000, height: 1000 };
  },
  "o-grid": () => {
    return { x: 0, y: 0, width: 1000, height: 780 };
  },
  "o-spreadsheet-bottombar-wrapper": () => {
    return { x: 0, y: 0, width: 1000, height: 120 };
  },
  "o-spreadsheet-topbar-wrapper": () => {
    return { x: 0, y: 0, width: 1000, height: 100 };
  },
});
describe("Table resizer component", () => {
  let model: Model;
  let sheetId: UID;
  let env: SpreadsheetChildEnv;

  beforeEach(async () => {
    model = new Model();
    ({ env } = await mountComponent(Grid, {
      props: {
        exposeFocus: () => {},
        getGridSize: model.getters.getSheetViewDimensionWithHeaders,
      },
      model,
    }));
    sheetId = model.getters.getActiveSheetId();
  });

  test("Can resize a table with drag & drop", async () => {
    createTable(model, "A1:B2");
    await nextTick();

    let dragEndPosition = { x: DEFAULT_CELL_WIDTH * 4, y: DEFAULT_CELL_HEIGHT * 4 };
    await clickAndDrag(".o-table-resizer", dragEndPosition, undefined, true);
    expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:E5");

    dragEndPosition = { x: DEFAULT_CELL_WIDTH * 2, y: DEFAULT_CELL_HEIGHT * 2 };
    await clickAndDrag(".o-table-resizer", dragEndPosition, undefined, true);
    expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:C3");
  });

  test("Highlight appear during the table drag & drop", async () => {
    createTable(model, "A1:B2");
    await nextTick();
    const dragEndPosition = { x: DEFAULT_CELL_WIDTH * 4, y: DEFAULT_CELL_HEIGHT * 4 };
    clickAndDrag(".o-table-resizer", dragEndPosition, undefined, false);
    expect(flattenHighlightRange(getHighlightsFromStore(env)[0])).toMatchObject({
      zone: toZone("A1:E5"),
      noFill: true,
    });

    triggerMouseEvent(".o-table-resizer", "pointerup", 0, 0);
    expect(getHighlightsFromStore(env)[0]).toEqual(undefined);
  });

  test("Cannot drag & drop to position above/left of the table", async () => {
    createTable(model, "C3:D4");
    await nextTick();

    clickAndDrag(".o-table-resizer", { x: 0, y: 0 }, undefined, false);
    expect(flattenHighlightRange(getHighlightsFromStore(env)[0])).toMatchObject({
      zone: toZone("C3"),
    });
    triggerMouseEvent(".o-table-resizer", "pointerup", 0, 0);
    expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("C3");
  });

  test("Table formula are auto-filled on resize table down", async () => {
    createTable(model, "A1:B2");
    setCellContent(model, "A2", "=A1+1");
    setCellContent(model, "B2", "string content");
    await nextTick();

    const dragEndPosition = { x: DEFAULT_CELL_WIDTH, y: DEFAULT_CELL_HEIGHT * 2 };
    await clickAndDrag(".o-table-resizer", dragEndPosition, undefined, true);

    expect(zoneToXc(model.getters.getTables(sheetId)[0].range.zone)).toEqual("A1:B3");
    expect(getCellRawContent(model, "A3")).toEqual("=A2+1");
    expect(getCellRawContent(model, "B3")).toBeUndefined();
  });

  test("Cannot resize a dynamic table", async () => {
    setCellContent(model, "A1", "=MUNIT(5)");
    createDynamicTable(model, "A1");
    await nextTick();

    expect(document.querySelector(".o-table-resizer")).toBeNull();
  });
});
