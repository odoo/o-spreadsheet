import { Grid } from "../../src/components/grid";
import { MESSAGE_VERSION } from "../../src/constants";
import { toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { setCellContent } from "../commands_helpers";
import { simulateClick, triggerMouseEvent } from "../dom_helper";
import { getActiveXc, getCell, getCellContent } from "../getters_helpers";
import { GridParent, makeTestFixture, nextTick, Touch } from "../helpers";
import { MockTransportService } from "../__mocks__/transport_service";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);
jest.mock("../../src/components/scrollbar", () => require("./__mocks__/scrollbar"));

function getVerticalScroll(): number {
  return (parent.grid as any).comp.vScrollbar.scroll;
}

function getHorizontalScroll(): number {
  return (parent.grid as any).comp.hScrollbar.scroll;
}

jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 1000);
jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 1000);

let fixture: HTMLElement;
let model: Model;
let parent: GridParent;

beforeEach(async () => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("Grid component", () => {
  beforeEach(async () => {
    model = new Model();
    parent = new GridParent(model);
    fixture = makeTestFixture();
    await parent.mount(fixture);
  });

  afterEach(() => {
    parent.destroy();
    fixture.remove();
  });

  test("simple rendering snapshot", async () => {
    expect(fixture.querySelector(".o-grid")).toMatchSnapshot();
  });

  test("can render a sheet with a merge", async () => {
    const sheet1 = model.getters.getVisibleSheets()[0];

    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("B2:B3") });

    expect(fixture.querySelector("canvas")).toBeDefined();
  });

  test("can click on a cell to select it", async () => {
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    expect(getActiveXc(model)).toBe("C8");
  });

  test("can click on resizer, then move selection with keyboard", async () => {
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    triggerMouseEvent(".o-overlay", "click", 300, 20);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    expect(getActiveXc(model)).toBe("A2");
  });

  test("can shift-click on a cell to update selection", async () => {
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    triggerMouseEvent("canvas", "mousedown", 300, 200, { shiftKey: true });
    expect(model.getters.getSelectedZones()[0]).toEqual({
      top: 0,
      left: 0,
      bottom: 7,
      right: 2,
    });
  });

  test("Can open the Conditional Format side panel", async () => {
    parent.env.openSidePanel("ConditionalFormatting");
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
  });

  test("Can touch the canvas to move it", async () => {
    const canvas = fixture.querySelector("canvas")!;
    expect(getHorizontalScroll()).toBe(0);
    expect(getVerticalScroll()).toBe(0);
    canvas.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [
          new Touch({
            clientX: 150,
            clientY: 150,
            identifier: 1,
            target: canvas,
          }),
        ],
      })
    );
    canvas.dispatchEvent(
      new TouchEvent("touchmove", {
        touches: [
          new Touch({
            clientX: 100,
            clientY: 120,
            identifier: 2,
            target: canvas,
          }),
        ],
      })
    );
    expect(getHorizontalScroll()).toBe(50);
    expect(getVerticalScroll()).toBe(30);
    canvas.dispatchEvent(
      new TouchEvent("touchmove", {
        touches: [
          new Touch({
            clientX: 80,
            clientY: 100,
            identifier: 2,
            target: canvas,
          }),
        ],
      })
    );
    expect(getHorizontalScroll()).toBe(70);
    expect(getVerticalScroll()).toBe(50);
  });
  test("Event is stopped if not at the top", async () => {
    const canvas = fixture.querySelector("canvas")!;
    expect(getHorizontalScroll()).toBe(0);
    expect(getVerticalScroll()).toBe(0);

    const mockCallback = jest.fn(() => {});
    fixture.addEventListener("touchmove", mockCallback);

    canvas.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [
          new Touch({
            clientX: 0,
            clientY: 150,
            identifier: 1,
            target: canvas,
          }),
        ],
      })
    );
    // move down; we are at the top: ev not prevented
    canvas.dispatchEvent(
      new TouchEvent("touchmove", {
        cancelable: true,
        bubbles: true,
        touches: [
          new Touch({
            clientX: 0,
            clientY: 120,
            identifier: 2,
            target: canvas,
          }),
        ],
      })
    );
    expect(mockCallback).toBeCalledTimes(1);
    // move up:; we are not at the top: ev prevented
    canvas.dispatchEvent(
      new TouchEvent("touchmove", {
        cancelable: true,
        bubbles: true,
        touches: [
          new Touch({
            clientX: 0,
            clientY: 150,
            identifier: 3,
            target: canvas,
          }),
        ],
      })
    );
    expect(mockCallback).toBeCalledTimes(1);
    // move up again but we are at the stop: ev not prevented
    canvas.dispatchEvent(
      new TouchEvent("touchmove", {
        cancelable: true,
        bubbles: true,
        touches: [
          new Touch({
            clientX: 0,
            clientY: 150,
            identifier: 4,
            target: canvas,
          }),
        ],
      })
    );
    expect(mockCallback).toBeCalledTimes(2);
  });

  describe("keybindings", () => {
    test("pressing ENTER put current cell in edit mode", async () => {
      // note: this behavious is not like excel. Maybe someone will want to
      // change this
      parent.grid.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(getActiveXc(model)).toBe("A1");
      expect(model.getters.getEditionMode()).toBe("editing");
    });

    test("pressing ENTER in edit mode stop editing and move one cell down", async () => {
      model.dispatch("START_EDITION", { text: "a" });
      await nextTick();
      fixture
        .querySelector("div.o-composer")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(getActiveXc(model)).toBe("A2");
      expect(model.getters.getEditionMode()).toBe("inactive");
      expect(getCellContent(model, "A1")).toBe("a");
    });

    test("pressing shift+ENTER in edit mode stop editing and move one cell up", async () => {
      model.dispatch("SELECT_CELL", { col: 0, row: 1 });
      expect(getActiveXc(model)).toBe("A2");
      model.dispatch("START_EDITION", { text: "a" });
      await nextTick();
      fixture
        .querySelector("div.o-composer")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }));
      expect(getActiveXc(model)).toBe("A1");
      expect(model.getters.getEditionMode()).toBe("inactive");
      expect(getCellContent(model, "A2")).toBe("a");
    });

    test("pressing shift+ENTER in edit mode in top row stop editing and stay on same cell", async () => {
      model.dispatch("START_EDITION", { text: "a" });
      await nextTick();
      fixture
        .querySelector("div.o-composer")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }));
      expect(getActiveXc(model)).toBe("A1");
      expect(model.getters.getEditionMode()).toBe("inactive");
      expect(getCellContent(model, "A1")).toBe("a");
    });

    test("pressing TAB move to next cell", async () => {
      parent.grid.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      expect(getActiveXc(model)).toBe("B1");
    });

    test("pressing shift+TAB move to previous cell", async () => {
      model.dispatch("SELECT_CELL", { col: 1, row: 0 });
      expect(getActiveXc(model)).toBe("B1");
      parent.grid.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }));
      expect(getActiveXc(model)).toBe("A1");
    });

    test("can undo/redo with keyboard", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [{ left: 0, right: 0, top: 0, bottom: 0 }],
        style: { fillColor: "red" },
      });
      expect(getCell(model, "A1")!.style).toBeDefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true })
      );
      expect(getCell(model, "A1")).toBeUndefined();
      await nextTick();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "y", ctrlKey: true, bubbles: true })
      );
      expect(getCell(model, "A1")!.style).toBeDefined();
    });

    test("can undo/redo with keyboard (uppercase version)", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [{ left: 0, right: 0, top: 0, bottom: 0 }],
        style: { fillColor: "red" },
      });
      expect(getCell(model, "A1")!.style).toBeDefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Z", ctrlKey: true, bubbles: true })
      );
      expect(getCell(model, "A1")).toBeUndefined();
      await nextTick();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Y", ctrlKey: true, bubbles: true })
      );
      expect(getCell(model, "A1")!.style).toBeDefined();
    });

    test("can select all the sheet with CTRL+A", async () => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "A", ctrlKey: true, bubbles: true })
      );
      expect(getActiveXc(model)).toBe("A1");
      expect(model.getters.getSelectedZones()[0]).toEqual({
        left: 0,
        top: 0,
        right: 25,
        bottom: 99,
      });
    });

    test("toggle bold with Ctrl+B", async () => {
      setCellContent(model, "A1", "hello");
      expect(getCell(model, "A1")!.style).not.toBeDefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "B", ctrlKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCell(model, "A1")!.style).toEqual({ bold: true });
      expect(model.getters.getCellStyle(model.getters.getActiveCell()!)).toEqual({ bold: true });
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "B", ctrlKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCell(model, "A1")!.style).toEqual({ bold: false });
      expect(model.getters.getCellStyle(model.getters.getActiveCell()!)).toEqual({ bold: false });
    });

    test("toggle Italic with Ctrl+I", async () => {
      setCellContent(model, "A1", "hello");
      expect(getCell(model, "A1")!.style).toBeUndefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "I", ctrlKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCell(model, "A1")!.style).toEqual({ italic: true });
      expect(model.getters.getCellStyle(model.getters.getActiveCell()!)).toEqual({ italic: true });
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "I", ctrlKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCell(model, "A1")!.style).toEqual({ italic: false });
      expect(model.getters.getCellStyle(model.getters.getActiveCell()!)).toEqual({ italic: false });
    });

    test("can save the sheet with CTRL+S", async () => {
      let saveContentCalled = false;
      parent.el!.addEventListener("save-requested", () => {
        saveContentCalled = true;
      });
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "S", ctrlKey: true, bubbles: true })
      );
      expect(saveContentCalled).toBe(true);
    });
  });

  describe("paint format tool with grid selection", () => {
    test("can paste format with mouse", async () => {
      setCellContent(model, "B2", "b2");
      model.dispatch("SELECT_CELL", { col: 1, row: 1 });
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
        style: { bold: true },
      });
      const target = [{ left: 1, top: 1, bottom: 1, right: 1 }];
      model.dispatch("ACTIVATE_PAINT_FORMAT", { target });
      triggerMouseEvent("canvas", "mousedown", 300, 200);
      expect(getCell(model, "C8")).toBeUndefined();
      triggerMouseEvent("body", "mouseup", 300, 200);
      expect(getCell(model, "C8")!.style).toEqual({ bold: true });
    });

    test("can paste format with key", async () => {
      setCellContent(model, "B2", "b2");
      model.dispatch("SELECT_CELL", { col: 1, row: 1 });
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
        style: { bold: true },
      });
      const target = [{ left: 1, top: 1, bottom: 1, right: 1 }];
      model.dispatch("ACTIVATE_PAINT_FORMAT", { target });
      expect(getCell(model, "C2")).toBeUndefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      );
      expect(getCell(model, "C2")!.style).toEqual({ bold: true });
    });
    test("Can scroll horizontally using shift key", async () => {
      const baseVertical = getVerticalScroll();
      const baseHorizontal = getHorizontalScroll();
      fixture
        .querySelector(".o-grid")!
        .dispatchEvent(new WheelEvent("wheel", { deltaY: 1500, shiftKey: true }));
      expect(getVerticalScroll()).toBe(baseVertical);
      expect(getHorizontalScroll()).toBe(baseHorizontal + 1500);
    });
  });
});

describe("Multi User selection", () => {
  test("Do not render multi user selection with invalid sheet", async () => {
    const transportService = new MockTransportService();
    const model = new Model({}, { transportService });
    const parent = new GridParent(model);
    await parent.mount(fixture);
    transportService.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: { id: "david", name: "David", position: { sheetId: "invalid", col: 1, row: 1 } },
    });
    await nextTick();
    parent.destroy();
  });
});

describe("error tooltip", () => {
  let intervalCb: Function;
  let currentTime = 0;

  beforeEach(async () => {
    currentTime = 0;
    model = new Model();
    parent = new GridParent(model);

    // mock setinterval and Date.now
    parent.env.browser.setInterval = ((cb) => {
      intervalCb = cb;
    }) as any;
    parent.env.browser.Date = {
      now() {
        return currentTime;
      },
    } as any;

    await parent.mount(fixture);
  });

  test("can display error tooltip", async () => {
    setCellContent(model, "C8", "=1/0");
    await nextTick();
    triggerMouseEvent("canvas", "mousemove", 300, 200);

    currentTime = 250;
    intervalCb();

    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).toBeNull();

    currentTime = 500;
    intervalCb();
    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
    expect(document.querySelector(".o-error-tooltip")).toMatchSnapshot();

    // moving mouse await
    triggerMouseEvent("canvas", "mousemove", 100, 200);
    currentTime = 550;
    intervalCb();
    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).toBeNull();
  });

  test("can display error when move on merge", async () => {
    const sheet = model.getters.getActiveSheetId();
    model.dispatch("ADD_MERGE", { sheetId: sheet, zone: toZone("C1:C8") });
    setCellContent(model, "C1", "=1/0");
    await nextTick();
    triggerMouseEvent("canvas", "mousemove", 300, 200); // C8

    currentTime = 500;
    intervalCb();
    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
  });

  test("composer content is set when clicking on merged cell (not top left)", async () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_MERGE", { sheetId, zone: toZone("C1:C8") });
    setCellContent(model, "C1", "Hello");
    await nextTick();
    await simulateClick("canvas", 300, 200); // C8
    expect(model.getters.getCurrentContent()).toBe("Hello");
  });
});

describe("multi sheet with different sizes", function () {
  beforeEach(async () => {
    model = new Model({
      sheets: [
        {
          name: "small",
          id: "small",
          colNumber: 2,
          rowNumber: 2,
          cells: {},
        },
        {
          name: "big",
          id: "big",
          colNumber: 5,
          rowNumber: 5,
          cells: {},
        },
      ],
    });
    parent = new GridParent(model);
    await parent.mount(fixture);
  });

  test("multiple sheets of different size render correctly", async () => {
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("small");
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: "small", sheetIdTo: "big" });
    await nextTick();
    model.dispatch("SELECT_CELL", { col: 4, row: 4 });
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: "big", sheetIdTo: "small" });
    await nextTick();
    expect((parent.grid.comp! as Grid)["viewport"]).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
      offsetX: 0,
      offsetY: 0,
    });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: "small", sheetIdTo: "big" });
    await nextTick();
    expect((parent.grid.comp! as Grid)["viewport"]).toMatchObject({
      top: 0,
      bottom: 4,
      left: 0,
      right: 4,
      offsetX: 0,
      offsetY: 0,
    });
  });

  test("deleting the row that has the active cell doesn't crash", async () => {
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("small");
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("REMOVE_COLUMNS", { columns: [1], sheetId: model.getters.getActiveSheetId() });
    await nextTick();
    expect((parent.grid.comp! as Grid)["viewport"]).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 0,
    });
    expect(model.getters.getActiveCell()).toBeUndefined();
  });
});
