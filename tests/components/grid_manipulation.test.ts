import { Model } from "../../src/model";
import { CommandResult } from "../../src/types/commands";
import { simulateClick, triggerMouseEvent } from "../test_helpers/dom_helper";
import { getActiveXc } from "../test_helpers/getters_helpers";
import { GridParent, makeTestFixture, nextTick } from "../test_helpers/helpers";

const COLUMN_D = { x: 340, y: 10 };
const ROW_5 = { x: 30, y: 100 };
const OUTSIDE_CM = { x: 50, y: 50 };

let fixture: HTMLElement;
let model: Model;
let parent: GridParent;

beforeEach(async () => {
  fixture = makeTestFixture();
  model = new Model();
  parent = new GridParent(model);
  await parent.mount(fixture);
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
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    expect(getActiveXc(model)).toBe("D1");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeTruthy();
    await simulateClick("canvas", OUTSIDE_CM.x, OUTSIDE_CM.y);
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
  });

  test("can open contextmenu for rows then click elsewhere to close it", async () => {
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
    simulateContextMenu(".o-row-resizer", ROW_5);
    expect(getActiveXc(model)).toBe("A5");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeTruthy();
    await simulateClick("canvas", OUTSIDE_CM.x, OUTSIDE_CM.y);
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
  });

  test("can clear cols with contextmenu", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='clear_column']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("DELETE_CONTENT", {
      target: [
        {
          top: 0,
          bottom: model.getters.getActiveSheet().rows.length - 1,
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
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='clear_row']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("DELETE_CONTENT", {
      target: [
        {
          top: 4,
          bottom: 4,
          left: 0,
          right: model.getters.getActiveSheet().cols.length - 1,
        },
      ],
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can delete cols with contextmenu", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='delete_column']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("REMOVE_COLUMNS", {
      columns: [3],
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can delete rows with contextmenu", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='delete_row']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("REMOVE_ROWS", {
      rows: [4],
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can add before cols with contextmenu", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='add_column_before']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_COLUMNS", {
      position: "before",
      column: 3,
      quantity: 1,
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can add before rows with contextmenu", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='add_row_before']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_ROWS", {
      position: "before",
      row: 4,
      quantity: 1,
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can add after cols with contextmenu", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='add_column_after']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_COLUMNS", {
      position: "after",
      column: 3,
      quantity: 1,
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can add after rows with contextmenu", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='add_row_after']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_ROWS", {
      position: "after",
      row: 4,
      quantity: 1,
      sheetId: model.getters.getActiveSheetId(),
    });
  });
});
