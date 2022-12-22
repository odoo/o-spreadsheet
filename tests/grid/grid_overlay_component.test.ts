import { ColResizer, RowResizer } from "../../src/components/headers_overlay/headers_overlay";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_WIDTH,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  PADDING_AUTORESIZE_HORIZONTAL,
} from "../../src/constants";
import { lettersToNumber, toXC, toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import {
  deleteColumns,
  deleteRows,
  hideColumns,
  hideRows,
  merge,
  redo,
  resizeRows,
  setCellContent,
  undo,
} from "../test_helpers/commands_helpers";
import {
  edgeScrollDelay,
  selectColumnByClicking,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import { getEvaluatedCell, getSelectionAnchorCellXc } from "../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick, typeInComposerGrid } from "../test_helpers/helpers";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("../__mocks__/content_editable_helper")
);
let fixture: HTMLElement;
let model: Model;

ColResizer.prototype._getMaxSize = () => 1000;
RowResizer.prototype._getMaxSize = () => 1000;

function fillData() {
  for (let i = 0; i < 8; i++) {
    setCellContent(model, toXC(i, i), "i");
  }
}

async function selectColumn(letter: string, extra: any = {}) {
  await selectColumnByClicking(model, letter, extra);
}

/**
 * Resize a column
 * @param letter Name of the column to resize (Starts at 'A')
 * @param delta Size to add (or remove if delta < 0)
 */
async function resizeColumn(letter: string, delta: number) {
  const index = lettersToNumber(letter);
  const x = model.getters.getColDimensions(model.getters.getActiveSheetId(), index)!.start + 1;
  triggerMouseEvent(".o-overlay .o-col-resizer", "mousemove", x, 10);
  await nextTick();
  triggerMouseEvent(".o-overlay .o-col-resizer .o-handle", "mousedown", x, 10);
  triggerMouseEvent(window, "mousemove", x + delta, 10);
  triggerMouseEvent(window, "mouseup", x + delta, 10);
  await nextTick();
}
/**
 * Drag a column until another
 * @param startLetter Name of the column to move (Starts at 'A')
 * @param endLetter Name of the column where the movement will end
 */
async function dragColumn(startLetter: string, endLetter: string) {
  let index = lettersToNumber(startLetter);
  let x = model.getters.getColDimensions(model.getters.getActiveSheetId(), index)!.start + 1;
  triggerMouseEvent(".o-overlay .o-col-resizer", "mousedown", x, 10);
  index = lettersToNumber(endLetter);
  x = model.getters.getColDimensions(model.getters.getActiveSheetId(), index)!.start + 1;
  triggerMouseEvent(window, "mousemove", x, 10, { buttons: 1 });
  await nextTick();
  triggerMouseEvent(window, "mouseup", x, 10);
}
/**
 * Trigger a double click on a column
 * @param letter Name of the column to double click on (Starts at 'A')
 */
async function dblClickColumn(letter: string) {
  const index = lettersToNumber(letter);
  const x = model.getters.getColDimensions(model.getters.getActiveSheetId(), index)!.end;
  triggerMouseEvent(".o-overlay .o-col-resizer", "mousemove", x, 10);
  await nextTick();
  triggerMouseEvent(".o-overlay .o-col-resizer .o-handle", "dblclick", x, 10);
}
/**
 * Select a row
 * @param index Number of the row to click on (Starts at 0)
 * @param extra shiftKey, ctrlKey
 */
async function selectRow(index: number, extra: any = {}) {
  const y = model.getters.getRowDimensions(model.getters.getActiveSheetId(), index)!.start + 1;
  triggerMouseEvent(".o-overlay .o-row-resizer", "mousemove", 10, y);
  await nextTick();
  triggerMouseEvent(".o-overlay .o-row-resizer", "mousedown", 10, y, extra);
  triggerMouseEvent(window, "mouseup", 10, y);
}
/**
 * Resize a row
 * @param index Number of the row to resize (Starts at 0)
 * @param delta Size to add (or remove if delta < 0)
 */
async function resizeRow(index: number, delta: number) {
  const y = model.getters.getRowDimensions(model.getters.getActiveSheetId(), index)!.start + 1;
  triggerMouseEvent(".o-overlay .o-row-resizer", "mousemove", 10, y);
  await nextTick();
  triggerMouseEvent(".o-overlay .o-row-resizer .o-handle", "mousedown", 10, y);
  triggerMouseEvent(window, "mousemove", 10, y + delta);
  triggerMouseEvent(window, "mouseup", 10, y + delta);
  await nextTick();
}
/**
 * Drag a row until another
 * @param startIndex Name of the column to move (Starts at '0')
 * @param endIndex Name of the column where the movement will end
 */
async function dragRow(startIndex: number, endIndex: number) {
  let y = model.getters.getRowDimensions(model.getters.getActiveSheetId(), startIndex)!.start + 1;
  triggerMouseEvent(".o-overlay .o-row-resizer", "mousedown", 10, y);
  y = model.getters.getRowDimensions(model.getters.getActiveSheetId(), endIndex)!.start + 1;
  triggerMouseEvent(window, "mousemove", 10, y, { buttons: 1 });
  await nextTick();
  triggerMouseEvent(window, "mouseup", 10, y);
}
/**
 * Trigger a double click on a row
 * @param letter Number of the row to double click on (Starts at 0)
 */
async function dblClickRow(index: number) {
  const y = model.getters.getRowDimensions(model.getters.getActiveSheetId(), index)!.end;
  triggerMouseEvent(".o-overlay .o-row-resizer", "mousemove", 10, y);
  await nextTick();

  triggerMouseEvent(".o-overlay .o-row-resizer .o-handle", "dblclick", 10, y);
}

describe("Resizer component", () => {
  beforeEach(async () => {
    const data = {
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    };
    model = new Model(data);
    ({ fixture } = await mountSpreadsheet({ model }));
  });

  test("can click on a header to select a column", async () => {
    await selectColumn("C");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(getSelectionAnchorCellXc(model)).toBe("C1");
    expect(model.getters.getSelectedZones()).toEqual([toZone("C1:C10")]);
  });

  test("On a sheet with a single row, can click a header to select a column", async () => {
    deleteRows(model, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(model.getters.getNumberRows(model.getters.getActiveSheetId())).toBe(1);
    await selectColumn("C");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 2, top: 0, right: 2, bottom: 0 });
    expect(getSelectionAnchorCellXc(model)).toBe("C1");
  });

  test("resizing a column does not change the selection", async () => {
    const index = lettersToNumber("C");
    const x = model.getters.getColDimensions(model.getters.getActiveSheetId(), index)!.start + 1;
    expect(getSelectionAnchorCellXc(model)).toBe("A1");
    triggerMouseEvent(".o-overlay .o-col-resizer", "mousemove", x, 10);
    await nextTick();
    expect(getSelectionAnchorCellXc(model)).toBe("A1");
    triggerMouseEvent(".o-overlay .o-col-resizer .o-handle", "mousedown", x, 10);
    triggerMouseEvent(window, "mousemove", x + 50, 10);
    await nextTick();
    expect(getSelectionAnchorCellXc(model)).toBe("A1");
    triggerMouseEvent(window, "mouseup", x + 50, 10);
    await nextTick();
    expect(getSelectionAnchorCellXc(model)).toBe("A1");
  });

  test("can click on a row-header to select a row", async () => {
    await selectRow(2);
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(getSelectionAnchorCellXc(model)).toBe("A3");
  });

  test("In a sheet with a single column, can click on a row-header to select a row", async () => {
    deleteColumns(model, ["B", "C", "D", "E", "F", "G", "H", "I", "J"]);
    expect(model.getters.getNumberCols(model.getters.getActiveSheetId())).toBe(1);
    await selectRow(2);
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 2, right: 0, bottom: 2 });
    expect(getSelectionAnchorCellXc(model)).toBe("A3");
  });

  test("can select multiple rows/cols", async () => {
    await selectRow(2);
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });

    await selectRow(3, { ctrlKey: true });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.getters.getSelectedZones()[1]).toEqual({ left: 0, top: 3, right: 9, bottom: 3 });
    expect(getSelectionAnchorCellXc(model)).toBe("A4");

    await selectColumn("C", { ctrlKey: true });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.getters.getSelectedZones()[1]).toEqual({ left: 0, top: 3, right: 9, bottom: 3 });
    expect(model.getters.getSelectedZones()[2]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(getSelectionAnchorCellXc(model)).toBe("C1");
  });

  test("The composer should be closed before selecting headers", async () => {
    await typeInComposerGrid("Hello");
    expect(model.getters.getEditionMode()).not.toBe("inactive");
    await selectColumnByClicking(model, "C");
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("Can resize a column", async () => {
    await resizeColumn("C", 50);
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 1)).toBe(
      model.getters.getColSize(model.getters.getActiveSheetId(), 0) + 50
    );
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 2)).toBe(
      model.getters.getColSize(model.getters.getActiveSheetId(), 0)
    );
  });

  test("Can resize a row", async () => {
    await resizeRow(2, 50);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 1)).toBe(
      model.getters.getRowSize(model.getters.getActiveSheetId(), 0) + 50
    );
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 2)).toBe(
      model.getters.getRowSize(model.getters.getActiveSheetId(), 0)
    );
  });

  test("Can resize multiples columns", async () => {
    await selectColumn("C");
    await selectColumn("D", { ctrlKey: true });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(model.getters.getSelectedZones()[1]).toEqual({ left: 3, top: 0, right: 3, bottom: 9 });
    expect(getSelectionAnchorCellXc(model)).toBe("D1");

    await resizeColumn("D", 50);
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 1)).toBe(
      model.getters.getColSize(model.getters.getActiveSheetId(), 0)
    );
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 2)).toBe(
      model.getters.getColSize(model.getters.getActiveSheetId(), 0) + 50
    );
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 3)).toBe(
      model.getters.getColSize(model.getters.getActiveSheetId(), 0) + 50
    );
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 4)).toBe(
      model.getters.getColSize(model.getters.getActiveSheetId(), 0)
    );
    expect(model.getters.getColDimensions(model.getters.getActiveSheetId(), 4)!.start).toBe(
      model.getters.getColSize(model.getters.getActiveSheetId(), 0) * 4 + 100
    );
  });

  test("Can resize multiples rows", async () => {
    await selectRow(2);
    await selectRow(3, { ctrlKey: true });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.getters.getSelectedZones()[1]).toEqual({ left: 0, top: 3, right: 9, bottom: 3 });
    expect(getSelectionAnchorCellXc(model)).toBe("A4");

    await resizeRow(3, 50);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 1)).toBe(
      model.getters.getRowSize(model.getters.getActiveSheetId(), 0)
    );
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 2)).toBe(
      model.getters.getRowSize(model.getters.getActiveSheetId(), 0) + 50
    );
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 3)).toBe(
      model.getters.getRowSize(model.getters.getActiveSheetId(), 0) + 50
    );
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 4)).toBe(
      model.getters.getRowSize(model.getters.getActiveSheetId(), 0)
    );
    expect(model.getters.getRowDimensions(model.getters.getActiveSheetId(), 4)!.start).toBe(
      model.getters.getRowSize(model.getters.getActiveSheetId(), 0) * 4 + 100
    );
  });

  test("Can resize columns with some hidden", async () => {
    const sheetId = model.getters.getActiveSheetId();
    const col_A = model.getters.getColSize(sheetId, 0);
    hideColumns(model, ["D", "E"]);
    await selectColumn("C");
    await selectColumn("F", { shiftKey: true });
    await resizeColumn("D", 50);
    expect(model.getters.getColSize(sheetId, 2)).toBe(col_A + 50);

    expect(model.getters.getColSize(sheetId, 3)).toBe(col_A + 50);
    expect(model.getters.getColDimensions(sheetId, 3)!.start).toBe(
      model.getters.getColDimensions(sheetId, 3)!.end
    );
    expect(model.getters.getColDimensions(sheetId, 3)!.start).toBe(
      model.getters.getColDimensions(sheetId, 2)!.end
    );

    expect(model.getters.getColSize(sheetId, 4)).toBe(col_A + 50);
    expect(model.getters.getColDimensions(sheetId, 4)!.start).toBe(
      model.getters.getColDimensions(sheetId, 4)!.end
    );
    expect(model.getters.getColDimensions(sheetId, 4)!.start).toBe(
      model.getters.getColDimensions(sheetId, 2)!.end
    );

    expect(model.getters.getColDimensions(sheetId, 5)!.size).toBe(col_A + 50);
    expect(model.getters.getColDimensions(sheetId, 5)!.start).toBe(
      model.getters.getColDimensions(sheetId, 2)!.end
    );
  });
  test("Can resize rows with some hidden", async () => {
    const sheetId = model.getters.getActiveSheetId();
    const row_1 = model.getters.getRowSize(sheetId, 0);
    hideRows(model, [3, 4]);
    await selectRow(2);
    await selectRow(5, { shiftKey: true });
    await resizeRow(3, 50);
    expect(model.getters.getRowDimensions(sheetId, 2)!.size).toBe(row_1 + 50);

    expect(model.getters.getRowDimensions(sheetId, 3)!.size).toBe(row_1 + 50);
    expect(model.getters.getRowDimensions(sheetId, 3)!.start).toBe(
      model.getters.getRowDimensions(sheetId, 3)!.end
    );
    expect(model.getters.getRowDimensions(sheetId, 3)!.start).toBe(
      model.getters.getRowDimensions(sheetId, 2)!.end
    );

    expect(model.getters.getRowDimensions(sheetId, 4)!.size).toBe(row_1 + 50);
    expect(model.getters.getRowDimensions(sheetId, 4)!.start).toBe(
      model.getters.getRowDimensions(sheetId, 4)!.end
    );
    expect(model.getters.getRowDimensions(sheetId, 4)!.start).toBe(
      model.getters.getRowDimensions(sheetId, 2)!.end
    );

    expect(model.getters.getRowDimensions(sheetId, 5)!.size).toBe(row_1 + 50);
    expect(model.getters.getRowDimensions(sheetId, 5)!.start).toBe(
      model.getters.getRowDimensions(sheetId, 2)!.end
    );
  });
  test("can select the entire sheet", async () => {
    triggerMouseEvent(".o-overlay .all", "mousedown", 5, 5);
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 9, bottom: 9 });
    expect(getSelectionAnchorCellXc(model)).toBe("A1");
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
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 1)).toBe(MIN_COL_WIDTH);
  });

  test("Min boundaries resizing rows", async () => {
    await resizeRow(2, -10000000);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 1)).toBe(MIN_ROW_HEIGHT);
  });

  test("Max boundaries resizing columns", async () => {
    await resizeColumn("C", 10000000);
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 1)).toBe(904);
  });

  test("Max boundaries resizing rows", async () => {
    await resizeRow(2, 10000000);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 1)).toBe(977);
  });

  test("Double click: Modify the size of a column", async () => {
    setCellContent(model, "B2", "b2");
    await dblClickColumn("B");
    await nextTick();
    const expectedSize = 2 * 13 + 2 * PADDING_AUTORESIZE_HORIZONTAL; // 2 * letter size + 2 * padding
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 1)).toBe(expectedSize);
    expect(fixture.querySelector(".o-handle")).toBeFalsy();
  });

  test("Double click on column then undo, then redo", async () => {
    setCellContent(model, "C2", "C2");
    setCellContent(model, "D2", "D2");
    await selectColumn("C");
    await selectColumn("D", { ctrlKey: true });
    await dblClickColumn("D");
    const sheet = model.getters.getActiveSheetId();
    const initialSize = model.getters.getColSize(sheet, 0);
    const resizedSize = 2 * 13 + 2 * PADDING_AUTORESIZE_HORIZONTAL; // 2 letter fontSize 13 + 2*3px padding
    expect(model.getters.getColSize(sheet, 1)).toBe(initialSize);
    expect(model.getters.getColSize(sheet, 2)).toBe(resizedSize);
    expect(model.getters.getColSize(sheet, 3)).toBe(resizedSize);
    expect(model.getters.getColSize(sheet, 4)).toBe(initialSize);
    expect(model.getters.getColDimensions(sheet, 4)!.start).toBe(initialSize * 2 + resizedSize * 2);
    undo(model);
    expect(model.getters.getColSize(sheet, 1)).toBe(initialSize);
    expect(model.getters.getColSize(sheet, 2)).toBe(initialSize);
    expect(model.getters.getColSize(sheet, 3)).toBe(initialSize);
    expect(model.getters.getColSize(sheet, 4)).toBe(initialSize);
    expect(model.getters.getColDimensions(sheet, 4)!.start).toBe(initialSize * 4);
    redo(model);
    expect(model.getters.getColSize(sheet, 1)).toBe(initialSize);
    expect(model.getters.getColSize(sheet, 2)).toBe(resizedSize);
    expect(model.getters.getColSize(sheet, 3)).toBe(resizedSize);
    expect(model.getters.getColSize(sheet, 4)).toBe(initialSize);
    expect(model.getters.getColDimensions(sheet, 4)!.start).toBe(initialSize * 2 + resizedSize * 2);
  });

  test("Double click: Modify the size of a row", async () => {
    resizeRows(model, [1], 30);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 1)).toBe(30);
    setCellContent(model, "B2", "b2");
    await dblClickRow(1);
    await nextTick();
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 1)).toBe(DEFAULT_CELL_HEIGHT);
    expect(fixture.querySelector(".o-handle")).toBeFalsy();
  });

  test("Double click on rows then undo, then redo", async () => {
    fillData();
    resizeRows(model, [0, 1, 2, 3, 4], 30);
    setCellContent(model, "C3", "C3");
    setCellContent(model, "C4", "C4");
    await selectRow(2);
    await selectRow(3, { ctrlKey: true });
    await dblClickRow(2);
    const sheet = model.getters.getActiveSheetId();
    const initialSize = 30;
    const size = DEFAULT_CELL_HEIGHT;
    expect(model.getters.getRowSize(sheet, 1)).toBe(initialSize);
    expect(model.getters.getRowSize(sheet, 2)).toBe(size);
    expect(model.getters.getRowSize(sheet, 3)).toBe(size);
    expect(model.getters.getRowSize(sheet, 4)).toBe(initialSize);
    expect(model.getters.getRowDimensions(sheet, 4)!.start).toBe(initialSize * 2 + size * 2);
    undo(model);
    expect(model.getters.getRowSize(sheet, 1)).toBe(initialSize);
    expect(model.getters.getRowSize(sheet, 2)).toBe(initialSize);
    expect(model.getters.getRowSize(sheet, 3)).toBe(initialSize);
    expect(model.getters.getRowSize(sheet, 4)).toBe(initialSize);
    expect(model.getters.getRowDimensions(sheet, 4)!.start).toBe(initialSize * 4);
    redo(model);
    expect(model.getters.getRowSize(sheet, 1)).toBe(initialSize);
    expect(model.getters.getRowSize(sheet, 2)).toBe(size);
    expect(model.getters.getRowSize(sheet, 3)).toBe(size);
    expect(model.getters.getRowSize(sheet, 4)).toBe(initialSize);
    expect(model.getters.getRowDimensions(sheet, 4)!.start).toBe(initialSize * 2 + size * 2);
  });

  test("Select B, shift D then BCD selected", async () => {
    await selectColumn("B");
    await selectColumn("D", { shiftKey: true });
    expect(model.getters.getActiveCols()).toEqual(new Set([1, 2, 3]));
  });

  test("Select B, ctrl D then BD selected", async () => {
    await selectColumn("B");
    await selectColumn("D", { ctrlKey: true });
    expect(model.getters.getActiveCols()).toEqual(new Set([1, 3]));
  });

  test("Select 2, shift 4 then 234 selected", async () => {
    await selectRow(1);
    await selectRow(3, { shiftKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([1, 2, 3]));
  });

  test("Select 2, ctrl 4 then 24 selected", async () => {
    await selectRow(1);
    await selectRow(3, { ctrlKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([1, 3]));
  });

  test("Select B, shift D, shift A then AB selected", async () => {
    await selectColumn("B");
    await selectColumn("D", { shiftKey: true });
    await selectColumn("A", { shiftKey: true });
    expect(model.getters.getActiveCols()).toEqual(new Set([0, 1]));
  });

  test("Select 2, shift 4, shift 1 then 12 selected", async () => {
    await selectRow(1);
    await selectRow(3, { shiftKey: true });
    await selectRow(0, { shiftKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 1]));
  });

  test("Select A, shift C, ctrl E then ABCE selected", async () => {
    await selectColumn("A");
    await selectColumn("C", { shiftKey: true });
    await selectColumn("E", { ctrlKey: true });
    expect(model.getters.getActiveCols()).toEqual(new Set([0, 1, 2, 4]));
  });

  test("Select 1, shift 3, ctrl 5 then 1235 selected", async () => {
    await selectRow(0);
    await selectRow(2, { shiftKey: true });
    await selectRow(4, { ctrlKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 1, 2, 4]));
  });

  test("Select A, shift C, ctrl E, shift G then ABCEFG selected", async () => {
    await selectColumn("A");
    await selectColumn("C", { shiftKey: true });
    await selectColumn("E", { ctrlKey: true });
    await selectColumn("G", { shiftKey: true });

    expect(model.getters.getActiveCols()).toEqual(new Set([0, 1, 2, 4, 5, 6]));
  });

  test("Select 1, shift 3, ctrl 5, shift 7 then 123567 selected", async () => {
    await selectRow(0);
    await selectRow(2, { shiftKey: true });
    await selectRow(4, { ctrlKey: true });
    await selectRow(6, { shiftKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 1, 2, 4, 5, 6]));
  });

  test("Select A, shift C, ctrl 1, shift 3 then ABC123 selected", async () => {
    await selectColumn("A");
    await selectColumn("C", { shiftKey: true });
    await selectRow(0, { ctrlKey: true });
    await selectRow(2, { shiftKey: true });

    expect(model.getters.getActiveCols()).toEqual(new Set([0, 1, 2]));
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 1, 2]));
  });

  test("Select A, ctrl C, shift E then ACDE selected", async () => {
    await selectColumn("A");
    await selectColumn("C", { ctrlKey: true });
    await selectColumn("E", { shiftKey: true });
    expect(model.getters.getActiveCols()).toEqual(new Set([0, 2, 3, 4]));
  });

  test("Select 1, ctrl 3, shift 5 then 1345 selected", async () => {
    await selectRow(0);
    await selectRow(2, { ctrlKey: true });
    await selectRow(4, { shiftKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 2, 3, 4]));
  });

  test("Select ABC E, dblclick E then resize all", async () => {
    fillData();
    await selectColumn("A");
    await selectColumn("C", { shiftKey: true });
    await selectColumn("E", { ctrlKey: true });
    await dblClickColumn("E");
    const resizedSize = 13 + 2 * PADDING_AUTORESIZE_HORIZONTAL; // 1 letter fontSize 13 + 2 * padding
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 0)).toBe(resizedSize);
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 1)).toBe(resizedSize);
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 2)).toBe(resizedSize);
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 3)).toBe(DEFAULT_CELL_WIDTH);
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 4)).toBe(resizedSize);
  });

  test("Select ABC E, dblclick F then resize only F", async () => {
    fillData();
    await selectColumn("A");
    await selectColumn("C", { shiftKey: true });
    await selectColumn("E", { ctrlKey: true });
    await dblClickColumn("F");
    const resizedSize = 13 + 2 * PADDING_AUTORESIZE_HORIZONTAL; // 1 letter fontSize 13 + 2 * padding
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 0)).toBe(DEFAULT_CELL_WIDTH);
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 1)).toBe(DEFAULT_CELL_WIDTH);
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 2)).toBe(DEFAULT_CELL_WIDTH);
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 3)).toBe(DEFAULT_CELL_WIDTH);
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 4)).toBe(DEFAULT_CELL_WIDTH);
    expect(model.getters.getColSize(model.getters.getActiveSheetId(), 5)).toBe(resizedSize);
  });

  test("Select 123 5, dblclick 5 then resize all", async () => {
    fillData();
    resizeRows(model, [0, 1, 2, 3, 4, 5, 6], 30);
    await selectRow(0);
    await selectRow(2, { shiftKey: true });
    await selectRow(4, { ctrlKey: true });
    await dblClickRow(4);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 0)).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 1)).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 2)).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 3)).toBe(30);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 4)).toBe(DEFAULT_CELL_HEIGHT);
  });

  test("Select 123 5, dblclick 6 then resize only 6", async () => {
    fillData();
    resizeRows(model, [0, 1, 2, 3, 4, 5, 6], 30);
    await selectRow(0);
    await selectRow(2, { shiftKey: true });
    await selectRow(4, { ctrlKey: true });
    await dblClickRow(5);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 0)).toBe(30);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 1)).toBe(30);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 2)).toBe(30);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 3)).toBe(30);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 4)).toBe(30);
    expect(model.getters.getRowSize(model.getters.getActiveSheetId(), 5)).toBe(DEFAULT_CELL_HEIGHT);
  });

  test("Select A, drag to C then ABC selected", async () => {
    await dragColumn("A", "C");
    expect(model.getters.getActiveCols()).toEqual(new Set([0, 1, 2]));
  });

  test("Select 1, drag to 3 then 123 selected", async () => {
    await dragRow(0, 2);
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 1, 2]));
  });

  test("right click after last column does not open context menu", async () => {
    const activeSheetId = model.getters.getActiveSheetId();
    const nCols = model.getters.getNumberCols(activeSheetId);
    const x = model.getters.getColDimensions(activeSheetId, nCols - 1)!.end + 1;
    triggerMouseEvent(".o-overlay .o-col-resizer", "contextmenu", x, 10);
    await nextTick();
    expect(fixture.querySelector(".o-context-menu")).toBeFalsy();
  });

  test("right click after last row does not open context menu", async () => {
    const activeSheetId = model.getters.getActiveSheetId();
    const nRows = model.getters.getNumberRows(activeSheetId);
    const y = model.getters.getRowDimensions(activeSheetId, nRows - 1)!.end + 1;
    triggerMouseEvent(".o-overlay .o-row-resizer", "contextmenu", 10, y);
    await nextTick();
    expect(fixture.querySelector(".o-context-menu")).toBeFalsy();
  });

  test("Hide A unhide it", async () => {
    hideColumns(model, ["A"]);
    await nextTick();
    const x = model.getters.getColDimensions(model.getters.getActiveSheetId(), 0)!.end + 10;
    triggerMouseEvent(".o-overlay .o-col-resizer .o-unhide[data-index='0']", "click", x, 10);
    expect(model.getters.getHiddenColsGroups(model.getters.getActiveSheetId())).toEqual([]);
  });

  test("hide BCD, unhide it", async () => {
    hideColumns(model, ["B", "C", "D"]);
    // from the left
    await nextTick();
    let x = model.getters.getColDimensions(model.getters.getActiveSheetId(), 1)!.start - 10;
    triggerMouseEvent(
      ".o-overlay .o-col-resizer .o-unhide[data-index='0']:nth-child(1)",
      "click",
      x,
      10
    );
    expect(model.getters.getHiddenColsGroups(model.getters.getActiveSheetId())).toEqual([]);
    // from the right
    undo(model);
    expect(model.getters.getHiddenColsGroups(model.getters.getActiveSheetId())).toEqual([
      [1, 2, 3],
    ]);
    await nextTick();
    x = model.getters.getColDimensions(model.getters.getActiveSheetId(), 1)!.end + 10;
    triggerMouseEvent(
      ".o-overlay .o-col-resizer .o-unhide[data-index='0']:nth-child(2)",
      "click",
      x,
      10
    );
    expect(model.getters.getHiddenColsGroups(model.getters.getActiveSheetId())).toEqual([]);
  });
  test("hide  A, B, D:E and unhide A-B", async () => {
    hideColumns(model, ["A", "B", "D", "E"]);
    await nextTick();
    let x = model.getters.getColDimensions(model.getters.getActiveSheetId(), 1)!.end + 10;
    triggerMouseEvent(".o-overlay .o-col-resizer .o-unhide[data-index='0']", "click", x, 10);
    expect(model.getters.getHiddenColsGroups(model.getters.getActiveSheetId())).toEqual([[3, 4]]);
  });
  test("hide A, C, E:F and unhide C", async () => {
    hideColumns(model, ["A", "C", "E", "F"]);
    await nextTick();
    let x = model.getters.getColDimensions(model.getters.getActiveSheetId(), 2)!.end + 10;
    triggerMouseEvent(".o-overlay .o-col-resizer .o-unhide[data-index='1']", "click", x, 10);
    expect(model.getters.getHiddenColsGroups(model.getters.getActiveSheetId())).toEqual([
      [0],
      [4, 5],
    ]);
  });

  test("hide 1, unhide it", async () => {
    hideRows(model, [0]);
    await nextTick();
    const y = model.getters.getRowDimensions(model.getters.getActiveSheetId(), 0)!.end + 10;
    triggerMouseEvent(
      ".o-overlay .o-row-resizer .o-unhide[data-index='0']",
      "click",
      HEADER_WIDTH - 5,
      y
    );
    expect(model.getters.getHiddenRowsGroups(model.getters.getActiveSheetId())).toEqual([]);
  });
  test("hide 2:4, unhide it", async () => {
    hideRows(model, [1, 2, 3]);
    // from the left
    await nextTick();
    let y = model.getters.getRowDimensions(model.getters.getActiveSheetId(), 1)!.start - 10;
    triggerMouseEvent(
      ".o-overlay .o-row-resizer .o-unhide[data-index='0']:nth-child(1)",
      "click",
      HEADER_WIDTH - 5,
      y
    );
    expect(model.getters.getHiddenRowsGroups(model.getters.getActiveSheetId())).toEqual([]);
    // from the right
    undo(model);
    expect(model.getters.getHiddenRowsGroups(model.getters.getActiveSheetId())).toEqual([
      [1, 2, 3],
    ]);
    await nextTick();
    y = model.getters.getRowDimensions(model.getters.getActiveSheetId(), 1)!.end + 10;
    triggerMouseEvent(
      ".o-overlay .o-row-resizer .o-unhide[data-index='0']:nth-child(2)",
      "click",
      HEADER_WIDTH - 5,
      y
    );
    expect(model.getters.getHiddenRowsGroups(model.getters.getActiveSheetId())).toEqual([]);
  });
  test("hide  0,1,3,4  and unhide 0", async () => {
    hideRows(model, [0, 1, 3, 4]);
    await nextTick();
    let y = model.getters.getRowDimensions(model.getters.getActiveSheetId(), 1)!.end + 10;
    triggerMouseEvent(
      ".o-overlay .o-row-resizer .o-unhide[data-index='0']",
      "click",
      HEADER_WIDTH - 5,
      y
    );
    expect(model.getters.getHiddenRowsGroups(model.getters.getActiveSheetId())).toEqual([[3, 4]]);
  });
  test("hide 0, 2, 4,5 and unhide 2", async () => {
    hideRows(model, [0, 2, 4, 5]);
    await nextTick();
    let y = model.getters.getRowDimensions(model.getters.getActiveSheetId(), 2)!.end + 10;
    triggerMouseEvent(
      ".o-overlay .o-row-resizer .o-unhide[data-index='1']",
      "click",
      HEADER_WIDTH - 5,
      y
    );
    expect(model.getters.getHiddenRowsGroups(model.getters.getActiveSheetId())).toEqual([
      [0],
      [4, 5],
    ]);
  });
});

describe("Edge-Scrolling on mouseMove in selection", () => {
  beforeEach(async () => {
    jest.useFakeTimers();

    ({ model, fixture } = await mountSpreadsheet());
  });

  test("Can edge-scroll horizontally", async () => {
    const { width } = model.getters.getSheetViewDimension();
    const y = DEFAULT_CELL_HEIGHT;

    triggerMouseEvent(".o-col-resizer", "mousedown", width / 2, y);
    triggerMouseEvent(".o-col-resizer", "mousemove", 1.5 * width, y);
    // we want 5 ticks of setTimeout
    const advanceTimer = edgeScrollDelay(0.5 * width, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-col-resizer", "mouseup", 1.5 * width, y);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 6,
      right: 16,
      top: 0,
      bottom: 42,
    });

    triggerMouseEvent(".o-col-resizer", "mousedown", width / 2, y);
    triggerMouseEvent(".o-col-resizer", "mousemove", -0.5 * width, y);
    // we want 2 ticks of setTimeout
    const advanceTimer2 = edgeScrollDelay(0.5 * width, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-col-resizer", "mouseup", -0.5 * width, y);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 3,
      right: 13,
      top: 0,
      bottom: 42,
    });
  });

  test("Can edge-scroll vertically", async () => {
    const { height } = model.getters.getSheetViewDimensionWithHeaders();
    const x = DEFAULT_CELL_WIDTH / 2;
    triggerMouseEvent(".o-row-resizer", "mousedown", x, height / 2);
    triggerMouseEvent(".o-row-resizer", "mousemove", x, 1.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * height, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-row-resizer", "mouseup", x, 1.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 6,
      bottom: 48,
    });

    triggerMouseEvent(".o-row-resizer", "mousedown", x, height / 2);
    triggerMouseEvent(".o-row-resizer", "mousemove", x, -0.5 * height);
    const advanceTimer2 = edgeScrollDelay(0.5 * height, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-row-resizer", "mouseup", x, -0.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 3,
      bottom: 45,
    });
  });
});

describe("move selected element(s)", () => {
  beforeEach(async () => {
    const data = {
      sheets: [
        {
          id: "sheet1",
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    };
    model = new Model(data);
    ({ fixture } = await mountSpreadsheet({ model }));
  });

  test("select the last selected cols/rows keep all selected zone active", async () => {
    await selectColumn("A");
    // last selected column is now column A
    await selectColumn("C", { ctrlKey: true });
    await selectColumn("E", { shiftKey: true });
    // last selected columns are now columns C, D, E
    await selectColumn("C");
    // A, C, D, E stay active
    expect(model.getters.getActiveCols()).toEqual(new Set([0, 2, 3, 4]));
  });

  describe("move selected column(s)", () => {
    test("drag selected B to C --> C arrive before B", async () => {
      setCellContent(model, "B1", "b1");
      setCellContent(model, "C1", "c1");

      await selectColumn("B");
      // last selected column is now the column B
      await dragColumn("B", "C");

      expect(getEvaluatedCell(model, "B1").value).toBe("c1");
      expect(getEvaluatedCell(model, "C1").value).toBe("b1");
    });

    test("drag selected C to B --> C arrive before B", async () => {
      setCellContent(model, "B1", "b1");
      setCellContent(model, "C1", "c1");

      await selectColumn("C");
      // last selected column is now the column C
      await dragColumn("C", "B");

      expect(getEvaluatedCell(model, "B1").value).toBe("c1");
      expect(getEvaluatedCell(model, "C1").value).toBe("b1");
    });

    test("drag selected C,D to B (mouseDown on C) --> C,D arrive before B", async () => {
      setCellContent(model, "B1", "b1");
      setCellContent(model, "C1", "c1");
      setCellContent(model, "D1", "d1");

      await selectColumn("C");
      await selectColumn("D", { shiftKey: true });
      // last selected columns are now columns C, D
      await dragColumn("C", "B");

      expect(getEvaluatedCell(model, "B1").value).toBe("c1");
      expect(getEvaluatedCell(model, "C1").value).toBe("d1");
      expect(getEvaluatedCell(model, "D1").value).toBe("b1");
    });

    test("drag selected C,D to B (mouseDown on D) --> C,D arrive before B", async () => {
      setCellContent(model, "B1", "b1");
      setCellContent(model, "C1", "c1");
      setCellContent(model, "D1", "d1");

      await selectColumn("C");
      await selectColumn("D", { shiftKey: true });
      // last selected columns are now columns C, D
      await dragColumn("D", "B");

      expect(getEvaluatedCell(model, "B1").value).toBe("c1");
      expect(getEvaluatedCell(model, "C1").value).toBe("d1");
      expect(getEvaluatedCell(model, "D1").value).toBe("b1");
    });

    test("drag selected C,D to E (mouseDown on C) -->  E arrive before C,D", async () => {
      setCellContent(model, "C1", "c1");
      setCellContent(model, "D1", "d1");
      setCellContent(model, "E1", "e1");

      await selectColumn("C");
      await selectColumn("D", { shiftKey: true });
      // last selected columns are now columns C, D
      await dragColumn("C", "E");

      expect(getEvaluatedCell(model, "C1").value).toBe("e1");
      expect(getEvaluatedCell(model, "D1").value).toBe("c1");
      expect(getEvaluatedCell(model, "E1").value).toBe("d1");
    });

    test("drag selected C,D to E (mouseDown on D) --> E arrive before C,D", async () => {
      setCellContent(model, "C1", "c1");
      setCellContent(model, "D1", "d1");
      setCellContent(model, "E1", "e1");

      await selectColumn("C");
      await selectColumn("D", { shiftKey: true });
      // last selected columns are now columns C, D
      await dragColumn("D", "E");

      expect(getEvaluatedCell(model, "C1").value).toBe("e1");
      expect(getEvaluatedCell(model, "D1").value).toBe("c1");
      expect(getEvaluatedCell(model, "E1").value).toBe("d1");
    });

    test("drag selected C,D to C (mouseDown on D) --> does nothing", async () => {
      setCellContent(model, "C1", "c1");
      setCellContent(model, "D1", "d1");

      await selectColumn("C");
      await selectColumn("D", { shiftKey: true });
      // last selected columns are now columns C, D
      await dragColumn("D", "C");

      expect(getEvaluatedCell(model, "C1").value).toBe("c1");
      expect(getEvaluatedCell(model, "D1").value).toBe("d1");
    });

    test("drag selected C,D to D (mouseDown on C) --> does nothing", async () => {
      setCellContent(model, "C1", "c1");
      setCellContent(model, "D1", "d1");

      await selectColumn("C");
      await selectColumn("D", { shiftKey: true });
      // last selected columns are now columns C, D
      await dragColumn("C", "D");

      expect(getEvaluatedCell(model, "C1").value).toBe("c1");
      expect(getEvaluatedCell(model, "D1").value).toBe("d1");
    });

    test("can't move a selected col that isn't the last selected zone", async () => {
      setCellContent(model, "B1", "b1");
      setCellContent(model, "C1", "c1");
      setCellContent(model, "D1", "d1");

      await selectColumn("B");
      // last selected column is now column B
      await selectColumn("C", { ctrlKey: true });
      await selectColumn("D", { shiftKey: true });
      // last selected columns are now columns C, D
      await dragColumn("B", "D");

      expect(getEvaluatedCell(model, "B1").value).toBe("b1");
      expect(getEvaluatedCell(model, "C1").value).toBe("c1");
      expect(getEvaluatedCell(model, "D1").value).toBe("d1");
    });
  });

  describe("move selected row(s)", () => {
    test("drag selected 2 to 3 --> 2 arrive before 3", async () => {
      setCellContent(model, "A2", "a2");
      setCellContent(model, "A3", "a3");

      await selectRow(1);
      // last selected row is now row 2
      await dragRow(1, 2);

      expect(getEvaluatedCell(model, "A2").value).toBe("a3");
      expect(getEvaluatedCell(model, "A3").value).toBe("a2");
    });

    test("drag selected 3 to 2 --> 2 arrive before 3", async () => {
      setCellContent(model, "A2", "a2");
      setCellContent(model, "A3", "a3");

      await selectRow(2);
      // last selected row is now row 3
      await dragRow(2, 1);

      expect(getEvaluatedCell(model, "A2").value).toBe("a3");
      expect(getEvaluatedCell(model, "A3").value).toBe("a2");
    });

    test("drag selected 3,4 to 2 (mouseDown on 3) --> 3,4 arrive before 2", async () => {
      setCellContent(model, "A2", "a2");
      setCellContent(model, "A3", "a3");
      setCellContent(model, "A4", "a4");

      await selectRow(2);
      await selectRow(3, { shiftKey: true });
      // last selected rows are now rows 3, 4
      await dragRow(2, 1);

      expect(getEvaluatedCell(model, "A2").value).toBe("a3");
      expect(getEvaluatedCell(model, "A3").value).toBe("a4");
      expect(getEvaluatedCell(model, "A4").value).toBe("a2");
    });

    test("drag selected 3,4 to 2 (mouseDown on 4) --> 3,4 arrive before 2", async () => {
      setCellContent(model, "A2", "a2");
      setCellContent(model, "A3", "a3");
      setCellContent(model, "A4", "a4");

      await selectRow(2);
      await selectRow(3, { shiftKey: true });
      // last selected rows are now rows 3, 4
      await dragRow(3, 1);

      expect(getEvaluatedCell(model, "A2").value).toBe("a3");
      expect(getEvaluatedCell(model, "A3").value).toBe("a4");
      expect(getEvaluatedCell(model, "A4").value).toBe("a2");
    });

    test("drag selected 3,4 to 5 (mouseDown on 3) -->  5 arrive before 3,4", async () => {
      setCellContent(model, "A3", "a3");
      setCellContent(model, "A4", "a4");
      setCellContent(model, "A5", "a5");

      await selectRow(2);
      await selectRow(3, { shiftKey: true });
      // last selected rows are now row 3, 4
      await dragRow(2, 4);

      expect(getEvaluatedCell(model, "A3").value).toBe("a5");
      expect(getEvaluatedCell(model, "A4").value).toBe("a3");
      expect(getEvaluatedCell(model, "A5").value).toBe("a4");
    });

    test("drag selected 3,4 to 5 (mouseDown on 4) -->  5 arrive before 3,4", async () => {
      setCellContent(model, "A3", "a3");
      setCellContent(model, "A4", "a4");
      setCellContent(model, "A5", "a5");

      await selectRow(2);
      await selectRow(3, { shiftKey: true });
      // last selected rows are now row 3, 4
      await dragRow(3, 4);

      expect(getEvaluatedCell(model, "A3").value).toBe("a5");
      expect(getEvaluatedCell(model, "A4").value).toBe("a3");
      expect(getEvaluatedCell(model, "A5").value).toBe("a4");
    });

    test("drag selected 3,4 to 3 (mouseDown on 4) --> does nothing", async () => {
      setCellContent(model, "A3", "a3");
      setCellContent(model, "A4", "a4");

      await selectRow(2);
      await selectRow(3, { shiftKey: true });
      // last selected rows are now rows 3, 4
      await dragRow(3, 2);

      expect(getEvaluatedCell(model, "A3").value).toBe("a3");
      expect(getEvaluatedCell(model, "A4").value).toBe("a4");
    });

    test("drag selected 3,4 to 4 (mouseDown on 3) --> does nothing", async () => {
      setCellContent(model, "A3", "a3");
      setCellContent(model, "A4", "a4");

      await selectRow(2);
      await selectRow(3, { shiftKey: true });
      // last selected rows are now rows 3, 4
      await dragRow(2, 3);

      expect(getEvaluatedCell(model, "A3").value).toBe("a3");
      expect(getEvaluatedCell(model, "A4").value).toBe("a4");
    });

    test("can't move a selected row that isn't the last selected zone", async () => {
      setCellContent(model, "A2", "a2");
      setCellContent(model, "A3", "a3");
      setCellContent(model, "A4", "a4");

      await selectRow(1);
      // last selected row is now row 2
      await selectRow(2, { ctrlKey: true });
      await selectRow(3, { shiftKey: true });
      // last selected rows are now rows 3, 4
      await dragRow(1, 3);

      expect(getEvaluatedCell(model, "A2").value).toBe("a2");
      expect(getEvaluatedCell(model, "A3").value).toBe("a3");
      expect(getEvaluatedCell(model, "A4").value).toBe("a4");
    });
  });

  test("Can select a column within a merge", async () => {
    merge(model, "B1:C1");
    await selectColumn("A");
    await selectColumn("B", { shiftKey: true });
    expect(model.getters.getActiveCols()).toEqual(new Set([0, 1]));
    await selectColumn("C", { shiftKey: true });
    expect(model.getters.getActiveCols()).toEqual(new Set([0, 1, 2]));
  });

  test("Can select a row within a merge", async () => {
    merge(model, "B2:B3");
    await selectRow(0);
    await selectRow(1, { shiftKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 1]));
    await selectRow(2, { shiftKey: true });
    expect(model.getters.getActiveRows()).toEqual(new Set([0, 1, 2]));
  });
});
