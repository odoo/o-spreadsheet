import { Model } from "../../src/model";
import { makeTestFixture, GridParent, nextTick } from "../helpers";
import { simulateClick, triggerMouseEvent } from "../dom_helper";

const COLUMN_D = { x: 340, y: 10 };
const ROW_5 = { x: 30, y: 100 };
const OUTSIDE_CM = { x: 50, y: 50 };

let fixture: HTMLElement;
let model: Model;

beforeEach(async () => {
  fixture = makeTestFixture();
  model = new Model();
  const parent = new GridParent(model);
  await parent.mount(fixture);
  model.workbook.viewport = { left: 0, top: 0, right: 9, bottom: 9 };
});

afterEach(() => {
  fixture.remove();
});

function simulateContextMenu(selector: string, coord: { x: number; y: number }) {
  const target = document.querySelector(selector)! as HTMLElement;
  triggerMouseEvent(selector, "mousedown", coord.x, coord.y, { button: 1, bubbles: true });
  target.focus();
  triggerMouseEvent(selector, "mouseup", coord.x, coord.y, { button: 1, bubbles: true });
  triggerMouseEvent(selector, "contextmenu", coord.x, coord.y, { button: 1, bubbles: true });
}
describe("Context Menu add/remove row/col", () => {
  test("can open contextmenu for columns then click elsewhere to close it", async () => {
    expect(fixture.querySelector(".o-context-menu")).toBeFalsy();
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    expect(model.getters.getActiveXc()).toBe("D1");
    await nextTick();
    expect(fixture.querySelector(".o-context-menu")).toBeTruthy();
    simulateClick("canvas", OUTSIDE_CM.x, OUTSIDE_CM.y);
    await nextTick();
    expect(fixture.querySelector(".o-context-menu")).toBeFalsy();
  });

  test("can open contextmenu for rows then click elsewhere to close it", async () => {
    expect(fixture.querySelector(".o-context-menu")).toBeFalsy();
    simulateContextMenu(".o-row-resizer", ROW_5);
    expect(model.getters.getActiveXc()).toBe("A5");
    await nextTick();
    expect(fixture.querySelector(".o-context-menu")).toBeTruthy();
    simulateClick("canvas", OUTSIDE_CM.x, OUTSIDE_CM.y);
    await nextTick();
    expect(fixture.querySelector(".o-context-menu")).toBeFalsy();
  });

  test("can clear cols with contextmenu", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    model.dispatch = jest.fn(command => "COMPLETED");
    simulateClick(".o-context-menu div[data-name='clear_column']");
    expect(model.dispatch).toHaveBeenCalledWith({
      type: "DELETE_CONTENT",
      target: [
        {
          top: 0,
          bottom: model.workbook.rows.length - 1,
          left: 3,
          right: 3
        }
      ],
      sheet: model.workbook.activeSheet.name
    });
  });

  test("can clear row with contextmenu", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    model.dispatch = jest.fn(command => "COMPLETED");
    simulateClick(".o-context-menu div[data-name='clear_row']");
    expect(model.dispatch).toHaveBeenCalledWith({
      type: "DELETE_CONTENT",
      target: [
        {
          top: 4,
          bottom: 4,
          left: 0,
          right: model.workbook.cols.length - 1
        }
      ],
      sheet: model.workbook.activeSheet.name
    });
  });

  test("can delete cols with contextmenu", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    model.dispatch = jest.fn(command => "COMPLETED");
    simulateClick(".o-context-menu div[data-name='delete_column']");
    expect(model.dispatch).toHaveBeenCalledWith({
      type: "REMOVE_COLUMNS",
      columns: [3],
      sheet: model.workbook.activeSheet.name
    });
  });

  test("can delete rows with contextmenu", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    model.dispatch = jest.fn(command => "COMPLETED");
    simulateClick(".o-context-menu div[data-name='delete_row']");
    expect(model.dispatch).toHaveBeenCalledWith({
      type: "REMOVE_ROWS",
      rows: [4],
      sheet: model.workbook.activeSheet.name
    });
  });

  test("can add before cols with contextmenu", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    model.dispatch = jest.fn(command => "COMPLETED");
    simulateClick(".o-context-menu div[data-name='add_column_before']");
    expect(model.dispatch).toHaveBeenCalledWith({
      type: "ADD_COLUMNS",
      position: "before",
      column: 3,
      quantity: 1,
      sheet: model.workbook.activeSheet.name
    });
  });

  test("can add before rows with contextmenu", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    model.dispatch = jest.fn(command => "COMPLETED");
    simulateClick(".o-context-menu div[data-name='add_row_before']");
    expect(model.dispatch).toHaveBeenCalledWith({
      type: "ADD_ROWS",
      position: "before",
      row: 4,
      quantity: 1,
      sheet: model.workbook.activeSheet.name
    });
  });

  test("can add after cols with contextmenu", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    model.dispatch = jest.fn(command => "COMPLETED");
    simulateClick(".o-context-menu div[data-name='add_column_after']");
    expect(model.dispatch).toHaveBeenCalledWith({
      type: "ADD_COLUMNS",
      position: "after",
      column: 3,
      quantity: 1,
      sheet: model.workbook.activeSheet.name
    });
  });

  test("can add after rows with contextmenu", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    model.dispatch = jest.fn(command => "COMPLETED");
    simulateClick(".o-context-menu div[data-name='add_row_after']");
    expect(model.dispatch).toHaveBeenCalledWith({
      type: "ADD_ROWS",
      position: "after",
      row: 4,
      quantity: 1,
      sheet: model.workbook.activeSheet.name
    });
  });
});
