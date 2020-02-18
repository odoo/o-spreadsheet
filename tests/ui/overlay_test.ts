import { GridModel, CURRENT_VERSION } from "../../src/model";
import { makeTestFixture, triggerMouseEvent, GridParent, nextTick } from "../helpers";
import {
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_CELL_HEIGHT
} from "../../src/constants";
import { lettersToNumber } from "../../src/helpers";

jest.mock("../../src/ui/grid_renderer");
const { getMaxSize } = require("../../src/ui/grid_renderer");

let fixture: HTMLElement;
let model: GridModel;

beforeEach(async () => {
  fixture = makeTestFixture();
  model = new GridModel({
    version: CURRENT_VERSION,
    sheets: [
      {
        colNumber: 10,
        rowNumber: 10
      }
    ]
  });
  const parent = new GridParent(model);
  await parent.mount(fixture);
  model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };
});

afterEach(() => {
  fixture.remove();
});

/**
 * Select a column
 * @param letter Name of the column to click on (Starts at 'A')
 * @param extra shiftKey, ctrlKey
 */
function selectColumn(letter: string, extra: any = {}) {
  const index = lettersToNumber(letter);
  const x = model.state.cols[index].left + 1;
  triggerMouseEvent(".o-overlay .o-col-resizer", "mousedown", x, 10, extra);
  triggerMouseEvent(window, "mouseup", x, 10);
}
/**
 * Resize a column
 * @param letter Name of the column to resize (Starts at 'A')
 * @param delta Size to add (or remove if delta < 0)
 */
async function resizeColumn(letter: string, delta: number) {
  const index = lettersToNumber(letter);
  const x = model.state.cols[index].left + 1;
  triggerMouseEvent(".o-overlay .o-col-resizer", "mousemove", x, 10);
  await nextTick();
  const witdh = model.state.cols[8].right;
  model.state.clientWidth = witdh;
  triggerMouseEvent(".o-overlay .o-col-resizer .o-handle", "mousedown", x, 10);
  triggerMouseEvent(window, "mousemove", x + delta, 10);
  triggerMouseEvent(window, "mouseup", x + delta, 10);
  await nextTick();
  model.state.clientWidth = witdh;
}
/**
 * Trigger a double click on a column
 * @param letter Name of the column to double click on (Starts at 'A')
 */
async function dblClickColumn(letter: string) {
  getMaxSize.mockImplementation(() => 1000);
  const index = lettersToNumber(letter);
  const x = model.state.cols[index].right;
  triggerMouseEvent(".o-overlay .o-col-resizer", "mousemove", x, 10);
  await nextTick();
  model.state.clientWidth = model.state.cols[8].right;
  triggerMouseEvent(".o-overlay .o-col-resizer .o-handle", "dblclick", x, 10);
}
/**
 * Select a row
 * @param index Number of the row to click on (Starts at 0)
 * @param extra shiftKey, ctrlKey
 */
function selectRow(index: number, extra: any = {}) {
  const y = model.state.rows[index].top + 1;
  triggerMouseEvent(".o-overlay .o-row-resizer", "mousedown", 10, y, extra);
  triggerMouseEvent(window, "mouseup", 10, y);
}
/**
 * Resize a row
 * @param index Number of the row to resize (Starts at 0)
 * @param delta Size to add (or remove if delta < 0)
 */
async function resizeRow(index: number, delta: number) {
  const y = model.state.rows[index].top + 1;
  triggerMouseEvent(".o-overlay .o-row-resizer", "mousemove", 10, y);
  await nextTick();
  const height = model.state.rows[8].bottom;
  model.state.clientHeight = height;
  triggerMouseEvent(".o-overlay .o-row-resizer .o-handle", "mousedown", 10, y);
  triggerMouseEvent(window, "mousemove", 10, y + delta);
  triggerMouseEvent(window, "mouseup", 10, y + delta);
  await nextTick();
  model.state.clientHeight = height;
}
/**
 * Trigger a double click on a row
 * @param letter Number of the row to double click on (Starts at 0)
 */
async function dblClickRow(index: number) {
  getMaxSize.mockImplementation(() => 1000);
  const y = model.state.rows[index].bottom;
  triggerMouseEvent(".o-overlay .o-row-resizer", "mousemove", 10, y);
  await nextTick();
  model.state.clientHeight = model.state.rows[8].bottom;
  triggerMouseEvent(".o-overlay .o-row-resizer .o-handle", "dblclick", 10, y);
}

describe("Resizer component", () => {
  test("can click on a header to select a column", async () => {
    selectColumn("C");
    expect(model.state.selection.zones[0]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(model.state.activeXc).toBe("C1");
  });

  test("can click on a row-header to select a row", async () => {
    selectRow(2);
    expect(model.state.selection.zones[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.state.activeXc).toBe("A3");
  });

  test("can select multiple rows/cols", async () => {
    selectRow(2);
    expect(model.state.selection.zones[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });

    selectRow(3, { ctrlKey: true });
    expect(model.state.selection.zones[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.state.selection.zones[1]).toEqual({ left: 0, top: 3, right: 9, bottom: 3 });
    expect(model.state.activeXc).toBe("A4");

    selectColumn("C", { ctrlKey: true });
    expect(model.state.selection.zones[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.state.selection.zones[1]).toEqual({ left: 0, top: 3, right: 9, bottom: 3 });
    expect(model.state.selection.zones[2]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(model.state.activeXc).toBe("C1");

    selectColumn("C");
    expect(model.state.selection.zones.length).toBe(1);
    expect(model.state.selection.zones[0]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(model.state.activeXc).toBe("C1");
  });

  test("Can resize a column", async () => {
    await resizeColumn("C", 50);
    expect(model.state.cols[1].size).toBe(model.state.cols[0].size + 50);
    expect(model.state.cols[2].size).toBe(model.state.cols[0].size);
  });

  test("Can resize a row", async () => {
    await resizeRow(2, 50);
    expect(model.state.rows[1].size).toBe(model.state.rows[0].size + 50);
    expect(model.state.rows[2].size).toBe(model.state.rows[0].size);
  });

  test("Can resize multiples columns", async () => {
    selectColumn("C");
    selectColumn("D", { ctrlKey: true });
    expect(model.state.selection.zones[0]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(model.state.selection.zones[1]).toEqual({ left: 3, top: 0, right: 3, bottom: 9 });
    expect(model.state.activeXc).toBe("D1");

    await resizeColumn("D", 50);
    expect(model.state.cols[1].size).toBe(model.state.cols[0].size);
    expect(model.state.cols[2].size).toBe(model.state.cols[0].size + 50);
    expect(model.state.cols[3].size).toBe(model.state.cols[0].size + 50);
    expect(model.state.cols[4].size).toBe(model.state.cols[0].size);
    expect(model.state.cols[4].left).toBe(model.state.cols[0].size * 4 + 100);
  });

  test("Can resize multiples rows", async () => {
    selectRow(2);
    selectRow(3, { ctrlKey: true });
    expect(model.state.selection.zones[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.state.selection.zones[1]).toEqual({ left: 0, top: 3, right: 9, bottom: 3 });
    expect(model.state.activeXc).toBe("A4");

    await resizeRow(3, 50);
    expect(model.state.rows[1].size).toBe(model.state.rows[0].size);
    expect(model.state.rows[2].size).toBe(model.state.rows[0].size + 50);
    expect(model.state.rows[3].size).toBe(model.state.rows[0].size + 50);
    expect(model.state.rows[4].size).toBe(model.state.rows[0].size);
    expect(model.state.rows[4].top).toBe(model.state.rows[0].size * 4 + 100);
  });

  test("can select the entire sheet", async () => {
    triggerMouseEvent(".o-overlay .all", "mousedown", 5, 5);
    expect(model.state.selection.zones[0]).toEqual({ left: 0, top: 0, right: 9, bottom: 9 });
    expect(model.state.activeXc).toBe("A1");
  });

  test("Mousemove hover something else than a header", async () => {
    triggerMouseEvent(".o-overlay .o-col-resizer", "mousemove", -10, 10);
    expect(fixture.querySelector("o-handle")).toBeNull();

    triggerMouseEvent(".o-overlay .o-row-resizer", "mousemove", 10, -10);
    expect(fixture.querySelector("o-handle")).toBeNull();

    triggerMouseEvent(".o-overlay .o-col-resizer", "mousemove", 20, 10);
    expect(fixture.querySelector("o-handle")).toBeNull();

    triggerMouseEvent(".o-overlay .o-row-resizer", "mousemove", 10, 12);
    expect(fixture.querySelector("o-handle")).toBeNull();
  });

  test("Min boundaries resizing columns", async () => {
    await resizeColumn("C", -10000000);
    expect(model.state.cols[1].size).toBe(MIN_COL_WIDTH);
  });

  test("Min boundaries resizing rows", async () => {
    await resizeRow(2, -10000000);
    expect(model.state.rows[1].size).toBe(MIN_ROW_HEIGHT);
  });

  test("Max boundaries resizing columns", async () => {
    await resizeColumn("C", 10000000);
    expect(model.state.cols[1].size).toBe(model.state.clientWidth - 90 - model.state.cols[0].size);
  });

  test("Max boundaries resizing rows", async () => {
    await resizeRow(2, 10000000);
    expect(model.state.rows[1].size).toBe(model.state.clientHeight - 60 - model.state.rows[0].size);
  });

  test("Double click: Modify the size of a column", async () => {
    model.setValue("B2", "b2");
    await dblClickColumn("B");
    expect(model.state.cols[1].size).toBe(1000);
  });

  test("Double click: Modify the size of a row", async () => {
    model.setValue("B2", "b2");
    await dblClickRow(1);
    expect(model.state.rows[1].size).toBe(1000);
  });

  test("Select B, shift D then BCD selected", () => {
    selectColumn("B");
    selectColumn("D", { shiftKey: true });
    expect(model.getActiveCols()).toEqual(new Set([1, 2, 3]));
  });

  test("Select B, ctrl D then BD selected", () => {
    selectColumn("B");
    selectColumn("D", { ctrlKey: true });
    expect(model.getActiveCols()).toEqual(new Set([1, 3]));
  });

  test("Select 2, shift 4 then 234 selected", () => {
    selectRow(1);
    selectRow(3, { shiftKey: true });
    expect(model.getActiveRows()).toEqual(new Set([1, 2, 3]));
  });

  test("Select 2, ctrl 4 then 24 selected", () => {
    selectRow(1);
    selectRow(3, { ctrlKey: true });
    expect(model.getActiveRows()).toEqual(new Set([1, 3]));
  });

  test("Select B, shift D, shift A then AB selected", () => {
    selectColumn("B");
    selectColumn("D", { shiftKey: true });
    selectColumn("A", { shiftKey: true });
    expect(model.getActiveCols()).toEqual(new Set([0, 1]));
  });

  test("Select 2, shift 4, shift 1 then 12 selected", () => {
    selectRow(1);
    selectRow(3, { shiftKey: true });
    selectRow(0, { shiftKey: true });
    expect(model.getActiveRows()).toEqual(new Set([0, 1]));
  });

  test("Select A, shift C, ctrl E then ABCE selected", () => {
    selectColumn("A");
    selectColumn("C", { shiftKey: true });
    selectColumn("E", { ctrlKey: true });
    expect(model.getActiveCols()).toEqual(new Set([0, 1, 2, 4]));
  });

  test("Select 1, shift 3, ctrl 5 then 1235 selected", () => {
    selectRow(0);
    selectRow(2, { shiftKey: true });
    selectRow(4, { ctrlKey: true });
    expect(model.getActiveRows()).toEqual(new Set([0, 1, 2, 4]));
  });

  test("Select A, shift C, ctrl E, shift G then ABCEFG selected", () => {
    selectColumn("A");
    selectColumn("C", { shiftKey: true });
    selectColumn("E", { ctrlKey: true });
    selectColumn("G", { shiftKey: true });

    expect(model.getActiveCols()).toEqual(new Set([0, 1, 2, 4, 5, 6]));
  });

  test("Select 1, shift 3, ctrl 5, shift 7 then 123567 selected", () => {
    selectRow(0);
    selectRow(2, { shiftKey: true });
    selectRow(4, { ctrlKey: true });
    selectRow(6, { shiftKey: true });
    expect(model.getActiveRows()).toEqual(new Set([0, 1, 2, 4, 5, 6]));
  });

  test("Select A, shift C, ctrl 1, shift 3 then ABC123 selected", () => {
    selectColumn("A");
    selectColumn("C", { shiftKey: true });
    selectRow(0, { ctrlKey: true });
    selectRow(2, { shiftKey: true });

    expect(model.getActiveCols()).toEqual(new Set([0, 1, 2]));
    expect(model.getActiveRows()).toEqual(new Set([0, 1, 2]));
  });

  test("Select A, ctrl C, shift E then ACDE selected", () => {
    selectColumn("A");
    selectColumn("C", { ctrlKey: true });
    selectColumn("E", { shiftKey: true });
    expect(model.getActiveCols()).toEqual(new Set([0, 2, 3, 4]));
  });

  test("Select 1, ctrl 3, shift 5 then 1345 selected", () => {
    selectRow(0);
    selectRow(2, { ctrlKey: true });
    selectRow(4, { shiftKey: true });
    expect(model.getActiveRows()).toEqual(new Set([0, 2, 3, 4]));
  });

  test("Select ABC E, dblclick E then resize all", async () => {
    selectColumn("A");
    selectColumn("C", { shiftKey: true });
    selectColumn("E", { ctrlKey: true });
    await dblClickColumn("E");
    expect(model.state.cols[0].size).toBe(1000);
    expect(model.state.cols[1].size).toBe(1000);
    expect(model.state.cols[2].size).toBe(1000);
    expect(model.state.cols[3].size).toBe(DEFAULT_CELL_WIDTH);
    expect(model.state.cols[4].size).toBe(1000);
  });

  test("Select ABC E, dblclick F then resize only F", async () => {
    selectColumn("A");
    selectColumn("C", { shiftKey: true });
    selectColumn("E", { ctrlKey: true });
    await dblClickColumn("F");
    expect(model.state.cols[0].size).toBe(DEFAULT_CELL_WIDTH);
    expect(model.state.cols[1].size).toBe(DEFAULT_CELL_WIDTH);
    expect(model.state.cols[2].size).toBe(DEFAULT_CELL_WIDTH);
    expect(model.state.cols[3].size).toBe(DEFAULT_CELL_WIDTH);
    expect(model.state.cols[4].size).toBe(DEFAULT_CELL_WIDTH);
    expect(model.state.cols[5].size).toBe(1000);
  });

  test("Select 123 5, dblclick 5 then resize all", async () => {
    selectRow(0);
    selectRow(2, { shiftKey: true });
    selectRow(4, { ctrlKey: true });
    await dblClickRow(4);
    expect(model.state.rows[0].size).toBe(1000);
    expect(model.state.rows[1].size).toBe(1000);
    expect(model.state.rows[2].size).toBe(1000);
    expect(model.state.rows[3].size).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.state.rows[4].size).toBe(1000);
  });

  test("Select 123 5, dblclick 6 then resize only 6", async () => {
    selectRow(0);
    selectRow(2, { shiftKey: true });
    selectRow(4, { ctrlKey: true });
    await dblClickRow(5);
    expect(model.state.rows[0].size).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.state.rows[1].size).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.state.rows[2].size).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.state.rows[3].size).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.state.rows[4].size).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.state.rows[5].size).toBe(1000);
  });

  test("Select A, drag to C then ABC selected", async () => {
    let x = model.state.cols[0].left + 1;
    triggerMouseEvent(".o-overlay .o-col-resizer", "mousedown", x, 10);
    x = model.state.cols[2].left + 1;
    triggerMouseEvent(window, "mousemove", x, 10, { buttons: 1 });
    expect(model.getActiveCols()).toEqual(new Set([0, 1, 2]));
  });

  test("Select 1, drag to 3 then 123 selected", async () => {
    let y = model.state.rows[0].top + 1;
    triggerMouseEvent(".o-overlay .o-row-resizer", "mousedown", 10, y);
    y = model.state.rows[2].top + 1;
    triggerMouseEvent(window, "mousemove", 10, y, { buttons: 1 });
    expect(model.getActiveRows()).toEqual(new Set([0, 1, 2]));
  });
});
