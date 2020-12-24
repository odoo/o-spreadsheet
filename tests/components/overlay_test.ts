import { Model } from "../../src/model";
import {
  makeTestFixture,
  GridParent,
  nextTick,
  getActiveXc,
  setCellContent,
  redo,
  undo,
} from "../helpers";
import {
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_FONT_SIZE,
  PADDING_AUTORESIZE,
} from "../../src/constants";
import { lettersToNumber, toXC } from "../../src/helpers/index";
import { ColResizer, RowResizer } from "../../src/components/overlay";
import "../canvas.mock";
import { triggerMouseEvent } from "../dom_helper";
import { SelectionMode } from "../../src/plugins/ui/selection";
import { fontSizeMap } from "../../src/fonts";

let fixture: HTMLElement;
let model: Model;

ColResizer.prototype._getMaxSize = () => 1000;
RowResizer.prototype._getMaxSize = () => 1000;

function fillData() {
  for (let i = 0; i < 8; i++) {
    setCellContent(model, toXC(i, i), "i");
  }
}

beforeEach(async () => {
  fixture = makeTestFixture();
  model = new Model({
    sheets: [
      {
        colNumber: 10,
        rowNumber: 10,
      },
    ],
  });
  const parent = new GridParent(model);
  await parent.mount(fixture);
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
  const x = model.getters.getCol(model.getters.getActiveSheetId(), index)!.start + 1;
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
  const x = model.getters.getCol(model.getters.getActiveSheetId(), index)!.start + 1;
  triggerMouseEvent(".o-overlay .o-col-resizer", "mousemove", x, 10);
  await nextTick();
  triggerMouseEvent(".o-overlay .o-col-resizer .o-handle", "mousedown", x, 10);
  triggerMouseEvent(window, "mousemove", x + delta, 10);
  triggerMouseEvent(window, "mouseup", x + delta, 10);
  await nextTick();
}
/**
 * Trigger a double click on a column
 * @param letter Name of the column to double click on (Starts at 'A')
 */
async function dblClickColumn(letter: string) {
  const index = lettersToNumber(letter);
  const x = model.getters.getCol(model.getters.getActiveSheetId(), index)!.end;
  triggerMouseEvent(".o-overlay .o-col-resizer", "mousemove", x, 10);
  await nextTick();
  triggerMouseEvent(".o-overlay .o-col-resizer .o-handle", "dblclick", x, 10);
}
/**
 * Select a row
 * @param index Number of the row to click on (Starts at 0)
 * @param extra shiftKey, ctrlKey
 */
function selectRow(index: number, extra: any = {}) {
  const y = model.getters.getRow(model.getters.getActiveSheetId(), index)!.start + 1;
  triggerMouseEvent(".o-overlay .o-row-resizer", "mousedown", 10, y, extra);
  triggerMouseEvent(window, "mouseup", 10, y);
}
/**
 * Resize a row
 * @param index Number of the row to resize (Starts at 0)
 * @param delta Size to add (or remove if delta < 0)
 */
async function resizeRow(index: number, delta: number) {
  const y = model.getters.getRow(model.getters.getActiveSheetId(), index)!.start + 1;
  triggerMouseEvent(".o-overlay .o-row-resizer", "mousemove", 10, y);
  await nextTick();
  triggerMouseEvent(".o-overlay .o-row-resizer .o-handle", "mousedown", 10, y);
  triggerMouseEvent(window, "mousemove", 10, y + delta);
  triggerMouseEvent(window, "mouseup", 10, y + delta);
  await nextTick();
}
/**
 * Trigger a double click on a row
 * @param letter Number of the row to double click on (Starts at 0)
 */
async function dblClickRow(index: number) {
  const y = model.getters.getRow(model.getters.getActiveSheetId(), index)!.end;
  triggerMouseEvent(".o-overlay .o-row-resizer", "mousemove", 10, y);
  await nextTick();

  triggerMouseEvent(".o-overlay .o-row-resizer .o-handle", "dblclick", 10, y);
}

describe("Resizer component", () => {
  test("can click on a header to select a column", async () => {
    selectColumn("C");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(getActiveXc(model)).toBe("C1");
  });

  test("click on a header to select a column changes the selection mode", async () => {
    const index = lettersToNumber("C");
    const x = model.getters.getCol(model.getters.getActiveSheetId(), index)!.start + 1;
    expect(model.getters.getSelectionMode()).toBe(SelectionMode.idle);
    triggerMouseEvent(".o-overlay .o-col-resizer", "mousedown", x, 10);
    expect(model.getters.getSelectionMode()).toBe(SelectionMode.selecting);
    triggerMouseEvent(window, "mouseup", x, 10);
    expect(model.getters.getSelectionMode()).toBe(SelectionMode.idle);
  });

  test("click on a header with CTRL to select a column changes the selection mode", async () => {
    const index = lettersToNumber("C");
    const x = model.getters.getCol(model.getters.getActiveSheetId(), index)!.start + 1;
    expect(model.getters.getSelectionMode()).toBe(SelectionMode.idle);
    triggerMouseEvent(".o-overlay .o-col-resizer", "mousedown", x, 10, { ctrlKey: true });
    expect(model.getters.getSelectionMode()).toBe(SelectionMode.expanding);
    triggerMouseEvent(window, "mouseup", x, 10, { ctrlKey: true });
    expect(model.getters.getSelectionMode()).toBe(SelectionMode.readyToExpand);
  });

  test("resizing a column does not change the selection mode", async () => {
    const index = lettersToNumber("C");
    const x = model.getters.getCol(model.getters.getActiveSheetId(), index)!.start + 1;
    triggerMouseEvent(".o-overlay .o-col-resizer", "mousemove", x, 10);
    await nextTick();
    expect(model.getters.getSelectionMode()).toBe(SelectionMode.idle);
    triggerMouseEvent(".o-overlay .o-col-resizer .o-handle", "mousedown", x, 10);
    triggerMouseEvent(window, "mousemove", x + 50, 10);
    expect(model.getters.getSelectionMode()).toBe(SelectionMode.idle);
    triggerMouseEvent(window, "mouseup", x + 50, 10);
    await nextTick();
    expect(model.getters.getSelectionMode()).toBe(SelectionMode.idle);
  });

  test("can click on a row-header to select a row", async () => {
    selectRow(2);
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(getActiveXc(model)).toBe("A3");
  });

  test("can select multiple rows/cols", async () => {
    selectRow(2);
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });

    selectRow(3, { ctrlKey: true });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.getters.getSelectedZones()[1]).toEqual({ left: 0, top: 3, right: 9, bottom: 3 });
    expect(getActiveXc(model)).toBe("A4");

    selectColumn("C", { ctrlKey: true });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.getters.getSelectedZones()[1]).toEqual({ left: 0, top: 3, right: 9, bottom: 3 });
    expect(model.getters.getSelectedZones()[2]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(getActiveXc(model)).toBe("C1");

    selectColumn("C");
    expect(model.getters.getSelectedZones().length).toBe(1);
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(getActiveXc(model)).toBe("C1");
  });

  test("Can resize a column", async () => {
    await resizeColumn("C", 50);
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 1)!.size).toBe(
      model.getters.getCol(model.getters.getActiveSheetId(), 0)!.size + 50
    );
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 2)!.size).toBe(
      model.getters.getCol(model.getters.getActiveSheetId(), 0)!.size
    );
  });

  test("Can resize a row", async () => {
    await resizeRow(2, 50);
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 1)!.size).toBe(
      model.getters.getRow(model.getters.getActiveSheetId(), 0)!.size + 50
    );
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 2)!.size).toBe(
      model.getters.getRow(model.getters.getActiveSheetId(), 0)!.size
    );
  });

  test("Can resize multiples columns", async () => {
    selectColumn("C");
    selectColumn("D", { ctrlKey: true });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(model.getters.getSelectedZones()[1]).toEqual({ left: 3, top: 0, right: 3, bottom: 9 });
    expect(getActiveXc(model)).toBe("D1");

    await resizeColumn("D", 50);
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 1)!.size).toBe(
      model.getters.getCol(model.getters.getActiveSheetId(), 0)!.size
    );
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 2)!.size).toBe(
      model.getters.getCol(model.getters.getActiveSheetId(), 0)!.size + 50
    );
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 3)!.size).toBe(
      model.getters.getCol(model.getters.getActiveSheetId(), 0)!.size + 50
    );
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 4)!.size).toBe(
      model.getters.getCol(model.getters.getActiveSheetId(), 0)!.size
    );
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 4)!.start).toBe(
      model.getters.getCol(model.getters.getActiveSheetId(), 0)!.size * 4 + 100
    );
  });

  test("Can resize multiples rows", async () => {
    selectRow(2);
    selectRow(3, { ctrlKey: true });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.getters.getSelectedZones()[1]).toEqual({ left: 0, top: 3, right: 9, bottom: 3 });
    expect(getActiveXc(model)).toBe("A4");

    await resizeRow(3, 50);
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 1)!.size).toBe(
      model.getters.getRow(model.getters.getActiveSheetId(), 0)!.size
    );
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 2)!.size).toBe(
      model.getters.getRow(model.getters.getActiveSheetId(), 0)!.size + 50
    );
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 3)!.size).toBe(
      model.getters.getRow(model.getters.getActiveSheetId(), 0)!.size + 50
    );
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 4)!.size).toBe(
      model.getters.getRow(model.getters.getActiveSheetId(), 0)!.size
    );
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 4)!.start).toBe(
      model.getters.getRow(model.getters.getActiveSheetId(), 0)!.size * 4 + 100
    );
  });

  test("can select the entire sheet", async () => {
    triggerMouseEvent(".o-overlay .all", "mousedown", 5, 5);
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 9, bottom: 9 });
    expect(getActiveXc(model)).toBe("A1");
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
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 1)!.size).toBe(MIN_COL_WIDTH);
  });

  test("Min boundaries resizing rows", async () => {
    await resizeRow(2, -10000000);
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 1)!.size).toBe(MIN_ROW_HEIGHT);
  });

  test("Max boundaries resizing columns", async () => {
    await resizeColumn("C", 10000000);
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 1)!.size).toBe(904);
  });

  test("Max boundaries resizing rows", async () => {
    await resizeRow(2, 10000000);
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 1)!.size).toBe(977);
  });

  test("Double click: Modify the size of a column", async () => {
    setCellContent(model, "B2", "b2");
    await dblClickColumn("B");
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 1)!.size).toBe(1006);
  });

  test("Double click on column then undo, then redo", async () => {
    setCellContent(model, "C2", "C2");
    setCellContent(model, "D2", "D2");
    selectColumn("C");
    selectColumn("D", { ctrlKey: true });
    await dblClickColumn("D");
    const sheet = model.getters.getActiveSheetId();
    const initialSize = model.getters.getCol(sheet, 0)!.size;
    expect(model.getters.getCol(sheet, 1)!.size).toBe(initialSize);
    expect(model.getters.getCol(sheet, 2)!.size).toBe(1006);
    expect(model.getters.getCol(sheet, 3)!.size).toBe(1006);
    expect(model.getters.getCol(sheet, 4)!.size).toBe(initialSize);
    expect(model.getters.getCol(sheet, 4)!.start).toBe(initialSize * 2 + 2012);
    undo(model);
    expect(model.getters.getCol(sheet, 1)!.size).toBe(initialSize);
    expect(model.getters.getCol(sheet, 2)!.size).toBe(initialSize);
    expect(model.getters.getCol(sheet, 3)!.size).toBe(initialSize);
    expect(model.getters.getCol(sheet, 4)!.size).toBe(initialSize);
    expect(model.getters.getCol(sheet, 4)!.start).toBe(initialSize * 4);
    redo(model);
    expect(model.getters.getCol(sheet, 1)!.size).toBe(initialSize);
    expect(model.getters.getCol(sheet, 2)!.size).toBe(1006);
    expect(model.getters.getCol(sheet, 3)!.size).toBe(1006);
    expect(model.getters.getCol(sheet, 4)!.size).toBe(initialSize);
    expect(model.getters.getCol(sheet, 4)!.start).toBe(initialSize * 2 + 2012);
  });

  test("Double click: Modify the size of a row", async () => {
    setCellContent(model, "B2", "b2");
    await dblClickRow(1);
    const size = fontSizeMap[DEFAULT_FONT_SIZE] + 2 * PADDING_AUTORESIZE;
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 1)!.size).toBe(size);
  });

  test("Double click on rows then undo, then redo", async () => {
    fillData();
    setCellContent(model, "C3", "C3");
    setCellContent(model, "C4", "C4");
    selectRow(2);
    selectRow(3, { ctrlKey: true });
    await dblClickRow(2);
    const sheet = model.getters.getActiveSheetId();
    const initialSize = model.getters.getRow(sheet, 0)!.size;
    const size = fontSizeMap[DEFAULT_FONT_SIZE] + 2 * PADDING_AUTORESIZE;
    expect(model.getters.getRow(sheet, 1)!.size).toBe(initialSize);
    expect(model.getters.getRow(sheet, 2)!.size).toBe(size);
    expect(model.getters.getRow(sheet, 3)!.size).toBe(size);
    expect(model.getters.getRow(sheet, 4)!.size).toBe(initialSize);
    expect(model.getters.getRow(sheet, 4)!.start).toBe(initialSize * 2 + size * 2);
    undo(model);
    expect(model.getters.getRow(sheet, 1)!.size).toBe(initialSize);
    expect(model.getters.getRow(sheet, 2)!.size).toBe(initialSize);
    expect(model.getters.getRow(sheet, 3)!.size).toBe(initialSize);
    expect(model.getters.getRow(sheet, 4)!.size).toBe(initialSize);
    expect(model.getters.getRow(sheet, 4)!.start).toBe(initialSize * 4);
    redo(model);
    expect(model.getters.getRow(sheet, 1)!.size).toBe(initialSize);
    expect(model.getters.getRow(sheet, 2)!.size).toBe(size);
    expect(model.getters.getRow(sheet, 3)!.size).toBe(size);
    expect(model.getters.getRow(sheet, 4)!.size).toBe(initialSize);
    expect(model.getters.getRow(sheet, 4)!.start).toBe(initialSize * 2 + size * 2);
  });

  test("Select B, shift D then BCD selected", () => {
    selectColumn("B");
    selectColumn("D", { shiftKey: true });
    expect(model.getters.getActiveCols()).toEqual(new Set([1, 2, 3]));
  });

  test("Select B, ctrl D then BD selected", () => {
    selectColumn("B");
    selectColumn("D", { ctrlKey: true });
    expect(model.getters.getActiveCols()).toEqual(new Set([1, 3]));
  });

  test("Select 2, shift 4 then 234 selected", () => {
    selectRow(1);
    selectRow(3, { shiftKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([1, 2, 3]));
  });

  test("Select 2, ctrl 4 then 24 selected", () => {
    selectRow(1);
    selectRow(3, { ctrlKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([1, 3]));
  });

  test("Select B, shift D, shift A then AB selected", () => {
    selectColumn("B");
    selectColumn("D", { shiftKey: true });
    selectColumn("A", { shiftKey: true });
    expect(model.getters.getActiveCols()).toEqual(new Set([0, 1]));
  });

  test("Select 2, shift 4, shift 1 then 12 selected", () => {
    selectRow(1);
    selectRow(3, { shiftKey: true });
    selectRow(0, { shiftKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 1]));
  });

  test("Select A, shift C, ctrl E then ABCE selected", () => {
    selectColumn("A");
    selectColumn("C", { shiftKey: true });
    selectColumn("E", { ctrlKey: true });
    expect(model.getters.getActiveCols()).toEqual(new Set([0, 1, 2, 4]));
  });

  test("Select 1, shift 3, ctrl 5 then 1235 selected", () => {
    selectRow(0);
    selectRow(2, { shiftKey: true });
    selectRow(4, { ctrlKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 1, 2, 4]));
  });

  test("Select A, shift C, ctrl E, shift G then ABCEFG selected", () => {
    selectColumn("A");
    selectColumn("C", { shiftKey: true });
    selectColumn("E", { ctrlKey: true });
    selectColumn("G", { shiftKey: true });

    expect(model.getters.getActiveCols()).toEqual(new Set([0, 1, 2, 4, 5, 6]));
  });

  test("Select 1, shift 3, ctrl 5, shift 7 then 123567 selected", () => {
    selectRow(0);
    selectRow(2, { shiftKey: true });
    selectRow(4, { ctrlKey: true });
    selectRow(6, { shiftKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 1, 2, 4, 5, 6]));
  });

  test("Select A, shift C, ctrl 1, shift 3 then ABC123 selected", () => {
    selectColumn("A");
    selectColumn("C", { shiftKey: true });
    selectRow(0, { ctrlKey: true });
    selectRow(2, { shiftKey: true });

    expect(model.getters.getActiveCols()).toEqual(new Set([0, 1, 2]));
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 1, 2]));
  });

  test("Select A, ctrl C, shift E then ACDE selected", () => {
    selectColumn("A");
    selectColumn("C", { ctrlKey: true });
    selectColumn("E", { shiftKey: true });
    expect(model.getters.getActiveCols()).toEqual(new Set([0, 2, 3, 4]));
  });

  test("Select 1, ctrl 3, shift 5 then 1345 selected", () => {
    selectRow(0);
    selectRow(2, { ctrlKey: true });
    selectRow(4, { shiftKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 2, 3, 4]));
  });

  test("Select ABC E, dblclick E then resize all", async () => {
    fillData();
    selectColumn("A");
    selectColumn("C", { shiftKey: true });
    selectColumn("E", { ctrlKey: true });
    await dblClickColumn("E");
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 0)!.size).toBe(1006);
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 1)!.size).toBe(1006);
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 2)!.size).toBe(1006);
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 3)!.size).toBe(
      DEFAULT_CELL_WIDTH
    );
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 4)!.size).toBe(1006);
  });

  test("Select ABC E, dblclick F then resize only F", async () => {
    fillData();
    selectColumn("A");
    selectColumn("C", { shiftKey: true });
    selectColumn("E", { ctrlKey: true });
    await dblClickColumn("F");
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 0)!.size).toBe(
      DEFAULT_CELL_WIDTH
    );
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 1)!.size).toBe(
      DEFAULT_CELL_WIDTH
    );
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 2)!.size).toBe(
      DEFAULT_CELL_WIDTH
    );
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 3)!.size).toBe(
      DEFAULT_CELL_WIDTH
    );
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 4)!.size).toBe(
      DEFAULT_CELL_WIDTH
    );
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 5)!.size).toBe(1006);
  });

  test("Select 123 5, dblclick 5 then resize all", async () => {
    fillData();
    selectRow(0);
    selectRow(2, { shiftKey: true });
    selectRow(4, { ctrlKey: true });
    await dblClickRow(4);
    const size = fontSizeMap[DEFAULT_FONT_SIZE] + 2 * PADDING_AUTORESIZE;
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 0)!.size).toBe(size);
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 1)!.size).toBe(size);
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 2)!.size).toBe(size);
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 3)!.size).toBe(
      DEFAULT_CELL_HEIGHT
    );
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 4)!.size).toBe(size);
  });

  test("Select 123 5, dblclick 6 then resize only 6", async () => {
    fillData();
    selectRow(0);
    selectRow(2, { shiftKey: true });
    selectRow(4, { ctrlKey: true });
    await dblClickRow(5);
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 0)!.size).toBe(
      DEFAULT_CELL_HEIGHT
    );
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 1)!.size).toBe(
      DEFAULT_CELL_HEIGHT
    );
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 2)!.size).toBe(
      DEFAULT_CELL_HEIGHT
    );
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 3)!.size).toBe(
      DEFAULT_CELL_HEIGHT
    );
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 4)!.size).toBe(
      DEFAULT_CELL_HEIGHT
    );
    const size = fontSizeMap[DEFAULT_FONT_SIZE] + 2 * PADDING_AUTORESIZE;
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 5)!.size).toBe(size);
  });

  test("Select A, drag to C then ABC selected", async () => {
    let x = model.getters.getCol(model.getters.getActiveSheetId(), 0)!.start + 1;
    triggerMouseEvent(".o-overlay .o-col-resizer", "mousedown", x, 10);
    x = model.getters.getCol(model.getters.getActiveSheetId(), 2)!.start + 1;
    triggerMouseEvent(window, "mousemove", x, 10, { buttons: 1 });
    expect(model.getters.getActiveCols()).toEqual(new Set([0, 1, 2]));
  });

  test("Select 1, drag to 3 then 123 selected", async () => {
    let y = model.getters.getRow(model.getters.getActiveSheetId(), 0)!.start + 1;
    triggerMouseEvent(".o-overlay .o-row-resizer", "mousedown", 10, y);
    y = model.getters.getRow(model.getters.getActiveSheetId(), 2)!.start + 1;
    triggerMouseEvent(window, "mousemove", 10, y, { buttons: 1 });
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 1, 2]));
  });

  test("right click after last column does not open context menu", async () => {
    const nCols = model.getters.getActiveSheet().cols.length;
    const activeSheetId = model.getters.getActiveSheetId();
    const x = model.getters.getCol(activeSheetId, nCols - 1)!.end + 1;
    triggerMouseEvent(".o-overlay .o-col-resizer", "contextmenu", x, 10);
    await nextTick();
    expect(fixture.querySelector(".o-context-menu")).toBeFalsy();
  });

  test("right click after last row does not open context menu", async () => {
    const nRows = model.getters.getActiveSheet().rows.length;
    const activeSheetId = model.getters.getActiveSheetId();
    const y = model.getters.getRow(activeSheetId, nRows - 1)!.end + 1;
    triggerMouseEvent(".o-overlay .o-row-resizer", "contextmenu", 10, y);
    await nextTick();
    expect(fixture.querySelector(".o-context-menu")).toBeFalsy();
  });
});
