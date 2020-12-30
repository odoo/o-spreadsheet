import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
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

jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 1000);
jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 1000);

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
    expect(parent.env.dispatch).toHaveBeenCalledWith("REMOVE_COLUMNS_ROWS", {
      elements: [3],
      dimension: "COL",
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can delete rows with contextmenu", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='delete_row']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("REMOVE_COLUMNS_ROWS", {
      elements: [4],
      dimension: "ROW",
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can add before cols with contextmenu", async () => {
    simulateContextMenu(".o-col-resizer", COLUMN_D);
    await nextTick();
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='add_column_before']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_COLUMNS_ROWS", {
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
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='add_row_before']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_COLUMNS_ROWS", {
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
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='add_column_after']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_COLUMNS_ROWS", {
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
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='add_row_after']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_COLUMNS_ROWS", {
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
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='hide_columns']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
      elements: [3],
      sheetId: model.getters.getActiveSheetId(),
      dimension: "COL",
    });
  });
  test("can unhide column", async () => {
    parent.env.dispatch("HIDE_COLUMNS_ROWS", {
      sheetId: parent.env.getters.getActiveSheetId(),
      elements: [2], // COL_C
      dimension: "COL",
    });
    parent.env.dispatch("SELECT_COLUMN", { index: 1 });
    parent.env.dispatch("SELECT_COLUMN", { index: 3, updateRange: true });
    const NEW_COL_D = { x: COLUMN_D.x - DEFAULT_CELL_WIDTH, y: COLUMN_D.y };
    simulateContextMenu(".o-col-resizer", NEW_COL_D);
    await nextTick();
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='unhide_columns']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
      elements: [1, 2, 3],
      sheetId: model.getters.getActiveSheetId(),
      dimension: "COL",
    });
  });
  test("can hide row", async () => {
    simulateContextMenu(".o-row-resizer", ROW_5);
    await nextTick();
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='hide_rows']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("HIDE_COLUMNS_ROWS", {
      elements: [4],
      sheetId: model.getters.getActiveSheetId(),
      dimension: "ROW",
    });
  });
  test("can unhide row", async () => {
    parent.env.dispatch("HIDE_COLUMNS_ROWS", {
      sheetId: parent.env.getters.getActiveSheetId(),
      elements: [3], // ROW_4
      dimension: "ROW",
    });
    parent.env.dispatch("SELECT_ROW", { index: 2 });
    parent.env.dispatch("SELECT_ROW", { index: 4, updateRange: true });
    const NEW_ROW_5 = { x: ROW_5.x, y: ROW_5.y - DEFAULT_CELL_HEIGHT };
    simulateContextMenu(".o-row-resizer", NEW_ROW_5);
    await nextTick();
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    simulateClick(".o-menu div[data-name='unhide_rows']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("UNHIDE_COLUMNS_ROWS", {
      elements: [2, 3, 4],
      sheetId: model.getters.getActiveSheetId(),
      dimension: "ROW",
    });
  });
});
