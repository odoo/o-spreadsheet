import { Spreadsheet } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { range, zoneToXc } from "../../src/helpers";
import { Mode, Model } from "../../src/model";
import {
  activateSheet,
  createSheet,
  deleteRows,
  hideColumns,
  hideRows,
  selectColumn,
  selectRow,
  setSelection,
} from "../test_helpers/commands_helpers";
import {
  click,
  getElStyle,
  keyDown,
  scrollGrid,
  setInputValueAndTrigger,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import { getSelectionAnchorCellXc } from "../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick, spyDispatch } from "../test_helpers/helpers";

const COLUMN_D = { x: 340, y: 10 };
const ROW_5 = { x: 30, y: 100 };
const OUTSIDE_CM = { x: 50, y: 50 };

let fixture: HTMLElement;
let model: Model;
let parent: Spreadsheet;

beforeEach(async () => {
  ({ parent, model, fixture } = await mountSpreadsheet());
});

function simulateContextMenu(selector: string, coord: { x: number; y: number }) {
  const target = document.querySelector(selector)! as HTMLElement;
  triggerMouseEvent(selector, "pointerdown", coord.x, coord.y, { button: 1, bubbles: true });
  target.focus();
  triggerMouseEvent(selector, "pointerup", coord.x, coord.y, { button: 1, bubbles: true });
  triggerMouseEvent(selector, "contextmenu", coord.x, coord.y, { button: 1, bubbles: true });
}
describe("Context Menu add/remove row/col", () => {
  test("can open contextmenu for columns then click elsewhere to close it", async () => {
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    expect(getSelectionAnchorCellXc(model)).toBe("D1");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeTruthy();
    await simulateClick(".o-grid-overlay", OUTSIDE_CM.x, OUTSIDE_CM.y);
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
  });

  test("can open contextmenu for rows then click elsewhere to close it", async () => {
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
    simulateContextMenu(".o-row-resizer", ROW_5);
    expect(getSelectionAnchorCellXc(model)).toBe("A5");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeTruthy();
    await simulateClick(".o-grid-overlay", OUTSIDE_CM.x, OUTSIDE_CM.y);
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
  });

  test("can clear cols with contextmenu", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    const dispatch = spyDispatch(parent);
    simulateClick(".o-menu div[data-name='clear_column']");
    expect(dispatch).toHaveBeenCalledWith("DELETE_CONTENT", {
      target: [
        {
          top: 0,
          bottom: model.getters.getNumberRows(model.getters.getActiveSheetId()) - 1,
          left: 3,
          right: 3,
        },
      ],
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can clear row with contextmenu", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    const dispatch = spyDispatch(parent);
    simulateClick(".o-menu div[data-name='clear_row']");
    expect(dispatch).toHaveBeenCalledWith("DELETE_CONTENT", {
      target: [
        {
          top: 4,
          bottom: 4,
          left: 0,
          right: model.getters.getNumberCols(model.getters.getActiveSheetId()) - 1,
        },
      ],
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can delete cols with contextmenu", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();

    const dispatch = spyDispatch(parent);
    simulateClick(".o-menu div[data-name='delete_column']");
    expect(dispatch).toHaveBeenCalledWith("REMOVE_COLUMNS_ROWS", {
      elements: [3],
      dimension: "COL",
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("cannot delete nor hide all cols with contextmenu", async () => {
    setSelection(model, [zoneToXc(model.getters.getSheetZone(model.getters.getActiveSheetId()))]);
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    expect(fixture.querySelector(".o-menu div[data-name='delete_column']")).toBeNull();
    expect(fixture.querySelector(".o-menu div[data-name='hide_columns']")).toBeNull();
  });

  test("cannot delete nor hide all non-hidden cols with contextmenu", async () => {
    const sheetZone = model.getters.getSheetZone(model.getters.getActiveSheetId());
    setSelection(model, [zoneToXc({ ...sheetZone, left: sheetZone.left + 1 })]);
    hideColumns(model, ["A"]);
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    expect(fixture.querySelector(".o-menu div[data-name='delete_column']")).toBeNull();
    expect(fixture.querySelector(".o-menu div[data-name='hide_columns']")).toBeNull();
  });

  test("can delete rows with contextmenu", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    const dispatch = spyDispatch(parent);
    simulateClick(".o-menu div[data-name='delete_row']");
    expect(dispatch).toHaveBeenCalledWith("REMOVE_COLUMNS_ROWS", {
      elements: [4],
      dimension: "ROW",
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("cannot delete nor hide all rows with contextmenu", async () => {
    setSelection(model, [zoneToXc(model.getters.getSheetZone(model.getters.getActiveSheetId()))]);
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    expect(fixture.querySelector(".o-menu div[data-name='delete_row']")).toBeNull();
    expect(fixture.querySelector(".o-menu div[data-name='hide_rows']")).toBeNull();
  });

  test("cannot delete nor hide all non-hidden rows with contextmenu", async () => {
    const sheetZone = model.getters.getSheetZone(model.getters.getActiveSheetId());
    setSelection(model, [zoneToXc({ ...sheetZone, top: sheetZone.top + 1 })]);
    hideRows(model, [0]);
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    expect(fixture.querySelector(".o-menu div[data-name='delete_row']")).toBeNull();
    expect(fixture.querySelector(".o-menu div[data-name='hide_rows']")).toBeNull();
  });

  test("can add before cols with contextmenu", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    const dispatch = spyDispatch(parent);
    simulateClick(".o-menu div[data-name='add_column_before']");
    expect(dispatch).toHaveBeenCalledWith("ADD_COLUMNS_ROWS", {
      position: "before",
      dimension: "COL",
      base: 3,
      quantity: 1,
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can add before rows with contextmenu", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    const dispatch = spyDispatch(parent);
    simulateClick(".o-menu div[data-name='add_row_before']");
    expect(dispatch).toHaveBeenCalledWith("ADD_COLUMNS_ROWS", {
      position: "before",
      base: 4,
      dimension: "ROW",
      quantity: 1,
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can add after cols with contextmenu", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    const dispatch = spyDispatch(parent);
    simulateClick(".o-menu div[data-name='add_column_after']");
    expect(dispatch).toHaveBeenCalledWith("ADD_COLUMNS_ROWS", {
      position: "after",
      dimension: "COL",
      base: 3,
      quantity: 1,
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can add after rows with contextmenu", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    const dispatch = spyDispatch(parent);
    simulateClick(".o-menu div[data-name='add_row_after']");
    expect(dispatch).toHaveBeenCalledWith("ADD_COLUMNS_ROWS", {
      position: "after",
      base: 4,
      dimension: "ROW",
      quantity: 1,
      sheetId: model.getters.getActiveSheetId(),
    });
  });
});

describe("Context Menu hide col/row", () => {
  test("can hide column", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    const dispatch = spyDispatch(parent);
    simulateClick(".o-menu div[data-name='hide_columns']");
    expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
      elements: [3],
      sheetId: model.getters.getActiveSheetId(),
      dimension: "COL",
    });
  });
  test("can unhide column", async () => {
    model.dispatch("HIDE_COLUMNS_ROWS", {
      sheetId: model.getters.getActiveSheetId(),
      elements: [2], // COL_C
      dimension: "COL",
    });
    selectColumn(model, 1, "overrideSelection");
    selectColumn(model, 3, "updateAnchor");
    const NEW_COL_D = { x: COLUMN_D.x - DEFAULT_CELL_WIDTH, y: COLUMN_D.y };
    simulateContextMenu(".o-col-resizer", NEW_COL_D);
    await nextTick();
    const dispatch = spyDispatch(parent);
    simulateClick(".o-menu div[data-name='unhide_columns']");
    expect(dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
      elements: [1, 2, 3],
      sheetId: model.getters.getActiveSheetId(),
      dimension: "COL",
    });
  });
  test("can hide row", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    const dispatch = spyDispatch(parent);
    simulateClick(".o-menu div[data-name='hide_rows']");
    expect(dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
      elements: [4],
      sheetId: model.getters.getActiveSheetId(),
      dimension: "ROW",
    });
  });
  test("can unhide row", async () => {
    model.dispatch("HIDE_COLUMNS_ROWS", {
      sheetId: model.getters.getActiveSheetId(),
      elements: [3], // ROW_4
      dimension: "ROW",
    });
    selectRow(model, 2, "overrideSelection");
    selectRow(model, 4, "updateAnchor");
    const NEW_ROW_5 = { x: ROW_5.x, y: ROW_5.y - DEFAULT_CELL_HEIGHT };
    simulateContextMenu(".o-row-resizer", NEW_ROW_5);
    await nextTick();
    const dispatch = spyDispatch(parent);
    simulateClick(".o-menu div[data-name='unhide_rows']");
    expect(dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
      elements: [2, 3, 4],
      sheetId: model.getters.getActiveSheetId(),
      dimension: "ROW",
    });
  });
});

describe("Adding rows footer at the end of sheet", () => {
  test("won't show if the end of sheet doesn't show in the viewport", () => {
    const top = parseInt(getElStyle(".o-grid-add-rows", "top"));
    const { height } = model.getters.getSheetViewDimension();
    expect(top).toBeGreaterThan(height);
  });

  test("will show when the page is scrolled down to the end of sheet", async () => {
    const { height } = model.getters.getSheetViewDimension();
    await scrollGrid({ deltaY: 10000 });
    const top = parseInt(getElStyle(".o-grid-add-rows", "top"));
    expect(top).toBeLessThan(height);
  });

  test.each(["dashboard", "readonly"] as const)(
    "will not show in the %s mode",
    async (mode: Mode) => {
      model.updateMode(mode);
      await scrollGrid({ deltaY: 10000 });
      expect(fixture.querySelector(".o-grid-add-rows")).toBeFalsy();
    }
  );

  test("will be just below the last row, if the sheet is too short to scroll", async () => {
    const sheetId = model.getters.getActiveSheetId();
    const { height } = model.getters.getSheetViewDimension();
    const numberOfRows = model.getters.getNumberRows(sheetId);
    let top = parseInt(getElStyle(".o-grid-add-rows", "top"));
    expect(top).toBeGreaterThan(height);

    deleteRows(model, range(0, numberOfRows - 3)); // only leave 3 rows
    await nextTick();
    let end = model.getters.getRowDimensions(sheetId, 2).end;
    top = parseInt(getElStyle(".o-grid-add-rows", "top"));
    expect(top).toBeLessThan(height);
    expect(top).toEqual(end);

    deleteRows(model, range(0, 2));
    await nextTick();
    end = model.getters.getRowDimensions(sheetId, 0).end;
    top = parseInt(getElStyle(".o-grid-add-rows", "top"));
    expect(top).toEqual(end);
  });

  test("can add the specified number of rows at the end of sheet by clicking ADD button", async () => {
    await scrollGrid({ deltaY: 10000 });
    const sheetId = model.getters.getActiveSheetId();
    const numberOfRows = model.getters.getNumberRows(sheetId);
    const input = fixture.querySelector(".o-grid-add-rows input");
    setInputValueAndTrigger(input, "10");
    await click(fixture, ".o-grid-add-rows button");
    expect(model.getters.getNumberRows(sheetId)).toEqual(numberOfRows + 10);
  });

  test("can add the specified number of rows at the end of sheet via Enter key", async () => {
    await scrollGrid({ deltaY: 10000 });
    const sheetId = model.getters.getActiveSheetId();
    const numberOfRows = model.getters.getNumberRows(sheetId);
    const input = fixture.querySelector(".o-grid-add-rows input")! as HTMLInputElement;
    setInputValueAndTrigger(input, "10");
    input.focus();
    await keyDown({ key: "Enter" });
    expect(model.getters.getNumberRows(sheetId)).toEqual(numberOfRows + 10);
  });

  test("cannot input a non-positive number", async () => {
    await scrollGrid({ deltaY: 10000 });
    const sheetId = model.getters.getActiveSheetId();
    const numberOfRows = model.getters.getNumberRows(sheetId);
    const input = fixture.querySelector(".o-grid-add-rows input")!;
    setInputValueAndTrigger(input, "0");
    await click(fixture, ".o-grid-add-rows button");
    expect(fixture.querySelector(".o-validation-error")).toBeTruthy();
    expect(model.getters.getNumberRows(sheetId)).toEqual(numberOfRows);
  });

  test("cannot input a number greater than 10000", async () => {
    await scrollGrid({ deltaY: 10000 });
    const sheetId = model.getters.getActiveSheetId();
    const numberOfRows = model.getters.getNumberRows(sheetId);
    const input = fixture.querySelector(".o-grid-add-rows input")!;
    setInputValueAndTrigger(input, "10001");
    await click(fixture, ".o-grid-add-rows button");
    expect(fixture.querySelector(".o-validation-error")).toBeTruthy();
    expect(model.getters.getNumberRows(sheetId)).toEqual(numberOfRows);
  });

  test("cannot input a string", async () => {
    await scrollGrid({ deltaY: 10000 });
    const sheetId = model.getters.getActiveSheetId();
    const numberOfRows = model.getters.getNumberRows(sheetId);
    const input = fixture.querySelector(".o-grid-add-rows input")!;
    setInputValueAndTrigger(input, "abc");
    await click(fixture, ".o-grid-add-rows button");
    expect(fixture.querySelector(".o-validation-error")).toBeTruthy();
    expect(model.getters.getNumberRows(sheetId)).toEqual(numberOfRows);
  });

  test("will scroll down to the new last row after adding new rows", async () => {
    await scrollGrid({ deltaY: 10000 });
    const input = fixture.querySelector(".o-grid-add-rows input");
    setInputValueAndTrigger(input, "1000");
    await click(fixture, ".o-grid-add-rows button");
    const sheetId = model.getters.getActiveSheetId();
    const numberOfRows = model.getters.getNumberRows(sheetId);
    expect(model.getters.getSheetViewVisibleRows()).toContain(numberOfRows - 1);
  });

  test("the input value will be the default value 100 after changing sheet", async () => {
    createSheet(model, { sheetId: "sheet2" });
    await scrollGrid({ deltaY: 10000 });
    const input = fixture.querySelector(".o-grid-add-rows input");
    setInputValueAndTrigger(input, "1000");
    activateSheet(model, "sheet2");
    await nextTick();
    expect(fixture.querySelector<HTMLInputElement>(".o-grid-add-rows input")!.value).toBe("100");
  });
});
