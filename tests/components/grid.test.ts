import { Spreadsheet, TransportService } from "../../src";
import { HEADER_WIDTH, MESSAGE_VERSION, SCROLLBAR_WIDTH } from "../../src/constants";
import { scrollDelay, toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import {
  createSheet,
  hideColumns,
  hideRows,
  merge,
  selectCell,
  setCellContent,
  setSelection,
} from "../test_helpers/commands_helpers";
import { simulateClick, triggerMouseEvent } from "../test_helpers/dom_helper";
import { getActiveXc, getCell, getCellContent, getCellText } from "../test_helpers/getters_helpers";
import { makeTestFixture, mountSpreadsheet, nextTick, Touch } from "../test_helpers/helpers";
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

let fixture: HTMLElement;
let model: Model;
let parent: Spreadsheet;

beforeEach(async () => {
  jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 1000);
  jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 1000);

  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("Grid component", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    parent = await mountSpreadsheet(fixture);
    model = parent.model;
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
    merge(model, "B2:B3", sheet1);
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
      // note: this behaviour is not like excel. Maybe someone will want to
      // change this
      parent.grid.el!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
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
      selectCell(model, "A2");
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
      parent.grid.el!.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      expect(getActiveXc(model)).toBe("B1");
    });

    test("pressing shift+TAB move to previous cell", async () => {
      selectCell(model, "B1");
      expect(getActiveXc(model)).toBe("B1");
      parent.grid.el!.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }));
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

    test("can automatically sum with ALT+=", async () => {
      setCellContent(model, "B2", "2");
      selectCell(model, "B5");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true })
      );
      await nextTick();
      expect(document.activeElement).toBe(parent.el?.querySelector(".o-grid-composer .o-composer"));
      expect(model.getters.getEditionMode()).toBe("editing");
      expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 10 });
      expect(model.getters.getCurrentContent()).toBe("=SUM(B2:B4)");
      expect(model.getters.getHighlights()[0]?.zone).toEqual(toZone("B2:B4"));
    });

    test("can automatically sum in an empty sheet with ALT+=", () => {
      selectCell(model, "B5");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true })
      );
      expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
      expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
      expect(model.getters.getCurrentContent()).toBe("=SUM()");
    });

    test("can automatically sum multiple zones in an empty sheet with ALT+=", () => {
      setSelection(model, ["A1:B2", "C4:C6"]);
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true })
      );
      expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
      expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
      expect(model.getters.getCurrentContent()).toBe("=SUM()");
    });

    test("automatically sum zoned xc is merged", () => {
      setCellContent(model, "B2", "2");
      merge(model, "B2:B4");
      selectCell(model, "B5");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true })
      );
      expect(model.getters.getCurrentContent()).toBe("=SUM(B2)");
    });

    test("automatically sum from merged cell", () => {
      setCellContent(model, "A1", "2");
      merge(model, "B1:B2");
      selectCell(model, "B2");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true })
      );
      expect(model.getters.getCurrentContent()).toBe("=SUM(A1)");
      model.dispatch("STOP_EDITION", { cancel: true });
      selectCell(model, "B1");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true })
      );
      expect(model.getters.getCurrentContent()).toBe("=SUM(A1)");
    });

    test("automatic sum does not open composer when multiple zones are summed", () => {
      setCellContent(model, "A1", "2");
      setCellContent(model, "B1", "2");
      setSelection(model, ["A2:B2"]);

      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true })
      );
      expect(model.getters.getEditionMode()).toBe("inactive");
      expect(getCellText(model, "A2")).toBe("=SUM(A1)");
      expect(getCellText(model, "B2")).toBe("=SUM(B1)");
    });

    test("automatic sum does not open composer with column full of data", () => {
      setCellContent(model, "A1", "2");
      setCellContent(model, "A2", "2");
      setSelection(model, ["A1:A2"]);

      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true })
      );
      expect(model.getters.getEditionMode()).toBe("inactive");
      expect(getCellText(model, "A3")).toBe("=SUM(A1:A2)");
    });

    test("automatic sum opens composer if selection is one cell even if it's not empty", () => {
      setCellContent(model, "A2", "2");
      selectCell(model, "A2");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true })
      );
      expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
      expect(model.getters.getCurrentContent()).toBe("=SUM()");
    });

    test("automatic sum opens composer if selection is one merge even if it's not empty", () => {
      setCellContent(model, "A2", "2");
      merge(model, "A2:A3");
      selectCell(model, "A2");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true })
      );
      expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
      expect(model.getters.getCurrentContent()).toBe("=SUM()");
    });

    test("Pressing CTRL+HOME moves you to first visible top-left cell", () => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", ctrlKey: true, bubbles: true })
      );
      expect(model.getters.getSelectedZone()).toEqual(toZone("A1"));
      hideRows(model, [0]);
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", ctrlKey: true, bubbles: true })
      );
      expect(model.getters.getSelectedZone()).toEqual(toZone("A2"));
    });
    test("Pressing CTRL+END moves you to last visible top-left cell", () => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", ctrlKey: true, bubbles: true })
      );
      expect(model.getters.getSelectedZone()).toEqual(toZone("Z100"));
      hideColumns(model, ["Z", "Y"]);
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", ctrlKey: true, bubbles: true })
      );
      expect(model.getters.getSelectedZone()).toEqual(toZone("X100"));
    });

    test("Pressing Ctrl+Space selects the columns of the selection", () => {
      setSelection(model, ["A1:C2"]);
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", ctrlKey: true, bubbles: true })
      );
      expect(model.getters.getSelectedZone()).toEqual(toZone("A1:C100"));
    });

    test("Pressing Shift+Space selects the rows of the selection", () => {
      setSelection(model, ["A1:C2"]);
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", shiftKey: true, bubbles: true })
      );
      expect(model.getters.getSelectedZone()).toEqual(toZone("A1:Z2"));
    });

    test("Pressing Ctrl+Shift+Space selects the whole sheet", () => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", ctrlKey: true, shiftKey: true, bubbles: true })
      );
      expect(model.getters.getSelectedZone()).toEqual(toZone("A1:Z100"));
    });

    test("Pressing Shift+PageDown activates the next sheet", () => {
      const sheetId = model.getters.getActiveSheetId();
      createSheet(model, { sheetId: "second", activate: true });
      createSheet(model, { sheetId: "third", position: 2 });

      expect(model.getters.getActiveSheetId()).toBe("second");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "PageDown", shiftKey: true, bubbles: true })
      );
      expect(model.getters.getActiveSheetId()).toBe("third");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "PageDown", shiftKey: true, bubbles: true })
      );
      expect(model.getters.getActiveSheetId()).toBe(sheetId);
    });
    test("Pressing Shift+PageUp activates the previous sheet", () => {
      const sheetId = model.getters.getActiveSheetId();
      createSheet(model, { sheetId: "second", activate: true });
      createSheet(model, { sheetId: "third", position: 2 });

      expect(model.getters.getActiveSheetId()).toBe("second");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "PageUp", shiftKey: true, bubbles: true })
      );
      expect(model.getters.getActiveSheetId()).toBe(sheetId);
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "PageUp", shiftKey: true, bubbles: true })
      );
      expect(model.getters.getActiveSheetId()).toBe("third");
    });
  });

  describe("paint format tool with grid selection", () => {
    test("can paste format with mouse", async () => {
      setCellContent(model, "B2", "b2");
      selectCell(model, "B2");
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
      selectCell(model, "B2");
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
  let transportService: TransportService;
  beforeEach(async () => {
    transportService = new MockTransportService();
    fixture = makeTestFixture();
    parent = await mountSpreadsheet(fixture, { transportService });
    model = parent.model;
  });

  test("Do not render multi user selection with invalid sheet", async () => {
    transportService.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: { id: "david", name: "David", position: { sheetId: "invalid", col: 1, row: 1 } },
    });
    await nextTick();
    expect(parent.el?.querySelectorAll(".o-client-tag")).toHaveLength(0);
    parent.destroy();
  });

  test("Do not render multi user selection with invalid col", async () => {
    const sheet = model.getters.getActiveSheet();
    transportService.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: {
        id: "david",
        name: "David",
        position: { sheetId: sheet.id, col: sheet.cols.length, row: 1 },
      },
    });
    await nextTick();
    expect(parent.el?.querySelectorAll(".o-client-tag")).toHaveLength(0);
    parent.destroy();
  });

  test("Do not render multi user selection with invalid row", async () => {
    const sheet = model.getters.getActiveSheet();
    transportService.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: {
        id: "david",
        name: "David",
        position: { sheetId: sheet.id, col: 1, row: sheet.rows.length },
      },
    });
    await nextTick();
    expect(parent.el?.querySelectorAll(".o-client-tag")).toHaveLength(0);
    parent.destroy();
  });
});

describe("error tooltip", () => {
  let intervalCb: Function;
  let currentTime = 0;

  beforeEach(async () => {
    currentTime = 0;
    parent = new Spreadsheet();
    model = parent.model;

    // TODO use jest mock timers
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

  afterEach(() => {
    parent.destroy();
  });

  test("can display error on A1", async () => {
    setCellContent(model, "A1", "=1/0");
    await nextTick();
    triggerMouseEvent("canvas", "mousemove", 80, 30); // A1

    currentTime = 500;
    intervalCb();
    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
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
    expect(document.querySelector(".o-error-tooltip")?.parentElement).toMatchSnapshot();

    // moving mouse await
    triggerMouseEvent("canvas", "mousemove", 100, 200);
    currentTime = 550;
    intervalCb();
    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).toBeNull();
  });

  test("can display error when move on merge", async () => {
    merge(model, "C1:C8");
    setCellContent(model, "C1", "=1/0");
    await nextTick();
    triggerMouseEvent("canvas", "mousemove", 300, 200); // C8

    currentTime = 500;
    intervalCb();
    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
  });

  test("composer content is set when clicking on merged cell (not top left)", async () => {
    merge(model, "C1:C8");
    setCellContent(model, "C1", "Hello");
    await nextTick();
    await simulateClick("canvas", 300, 200); // C8
    expect(model.getters.getCurrentContent()).toBe("Hello");
  });
});

describe("Events on Grid update viewport correctly", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    parent = await mountSpreadsheet(fixture);
    model = parent.model;
  });
  afterEach(() => {
    parent.destroy();
    fixture.remove();
  });
  test("Vertical scroll", async () => {
    fixture.querySelector(".o-grid")!.dispatchEvent(new WheelEvent("wheel", { deltaY: 1200 }));
    await nextTick();
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 52,
      bottom: 93,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: 1200,
    });
  });
  test("Horizontal scroll", async () => {
    fixture
      .querySelector(".o-grid")!
      .dispatchEvent(new WheelEvent("wheel", { deltaY: 200, shiftKey: true }));
    await nextTick();
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 41,
      left: 2,
      right: 11,
      offsetX: 200,
      offsetY: 0,
    });
  });
  test("Move selection with keyboard", async () => {
    await simulateClick("canvas", 750, 40); // H1
    expect(getActiveXc(model)).toBe("H1");
    const viewport = model.getters.getActiveViewport();
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(getActiveXc(model)).toBe("I1");
    expect(model.getters.getActiveViewport()).toMatchObject(viewport);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(getActiveXc(model)).toBe("J1");
    expect(model.getters.getActiveViewport()).toMatchObject({
      ...viewport,
      offsetX: 96,
      left: 1,
      right: 10,
    });
  });

  test("Alter selection with keyboard", async () => {
    await simulateClick("canvas", 750, 40); // H1
    expect(getActiveXc(model)).toBe("H1");
    const viewport = model.getters.getActiveViewport();
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("H1:I1"));
    expect(model.getters.getActiveViewport()).toMatchObject(viewport);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("H1:J1"));
    expect(model.getters.getActiveViewport()).toMatchObject({
      ...viewport,
      offsetX: 96,
      left: 1,
      right: 10,
    });
  });

  test("Scroll viewport then alter selection with keyboard from before last cell to last cell does not shift viewport", async () => {
    await simulateClick("canvas"); // gain focus on grid element
    const { width } = model.getters.getGridDimension(model.getters.getActiveSheet());
    const { width: viewportWidth } = model.getters.getViewportDimension();
    document.activeElement!.dispatchEvent(
      // scroll completely to the right
      new WheelEvent("wheel", {
        deltaY: width - viewportWidth + HEADER_WIDTH,
        deltaX: 0,
        shiftKey: true,
        deltaMode: 0,
        bubbles: true,
      })
    );
    const viewport = model.getters.getActiveViewport();
    selectCell(model, "Y1");
    await nextTick();
    expect(model.getters.getActiveViewport()).toMatchObject(viewport);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true })
    );
    await nextTick();
    expect(model.getters.getActiveViewport()).toMatchObject(viewport);
  });

  test("A resize of the grid DOM element impacts the viewport", async () => {
    expect(model.getters.getViewportDimension()).toMatchObject({
      width: 1000 - SCROLLBAR_WIDTH,
      height: 1000 - SCROLLBAR_WIDTH,
    });
    // mock a resizing of the grid DOM element. can occur if resizing the browser or opening the sidePanel
    jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 800);
    jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 650);
    // force a rerendering to pass through patched() of the Grid component.
    await parent.render();

    expect(model.getters.getViewportDimension()).toMatchObject({
      width: 800 - SCROLLBAR_WIDTH,
      height: 650 - SCROLLBAR_WIDTH,
    });
  });

  describe("Edge-Scrolling on mouseMove in selection", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    test("Can edge-scroll horizontally", async () => {
      const { width, height } = model.getters.getViewportDimension();
      const y = height / 2;
      triggerMouseEvent("canvas", "mousedown", width / 2, y);
      triggerMouseEvent("canvas", "mousemove", 1.5 * width, y);
      const advanceTimer = scrollDelay(0.5 * width) * 6 - 1;
      jest.advanceTimersByTime(advanceTimer);
      triggerMouseEvent("canvas", "mouseup", 1.5 * width, y);

      expect(model.getters.getActiveViewport()).toMatchObject({
        left: 6,
        right: 15,
        top: 0,
        bottom: 41,
      });

      triggerMouseEvent("canvas", "mousedown", width / 2, y);
      triggerMouseEvent("canvas", "mousemove", -0.5 * width, y);
      const advanceTimer2 = scrollDelay(0.5 * width) * 3 - 1;
      jest.advanceTimersByTime(advanceTimer2);
      triggerMouseEvent("canvas", "mouseup", -0.5 * width, y);

      expect(model.getters.getActiveViewport()).toMatchObject({
        left: 3,
        right: 12,
        top: 0,
        bottom: 41,
      });
    });

    test("Can edge-scroll vertically", () => {
      const { width, height } = model.getters.getViewportDimension();
      const x = width / 2;
      triggerMouseEvent("canvas", "mousedown", x, height / 2);
      triggerMouseEvent("canvas", "mousemove", x, 1.5 * height);
      const advanceTimer = scrollDelay(0.5 * height) * 6 - 1;
      jest.advanceTimersByTime(advanceTimer);
      triggerMouseEvent("canvas", "mouseup", x, 1.5 * height);

      expect(model.getters.getActiveViewport()).toMatchObject({
        left: 0,
        right: 9,
        top: 6,
        bottom: 47,
      });

      triggerMouseEvent("canvas", "mousedown", x, height / 2);
      triggerMouseEvent("canvas", "mousemove", x, -0.5 * height);
      const advanceTimer2 = scrollDelay(0.5 * height) * 3 - 1;
      jest.advanceTimersByTime(advanceTimer2);
      triggerMouseEvent("canvas", "mouseup", x, -0.5 * height);

      expect(model.getters.getActiveViewport()).toMatchObject({
        left: 0,
        right: 9,
        top: 3,
        bottom: 44,
      });
    });
  });

  test("resize event handler is removed", () => {
    parent.destroy();
    window.dispatchEvent(new Event("resize"));
  });
});
