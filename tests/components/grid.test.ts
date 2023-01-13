import { App } from "@odoo/owl";
import { Spreadsheet, TransportService } from "../../src";
import { ChartJsComponent } from "../../src/components/figures/chart/chartJs/chartjs";
import {
  BACKGROUND_GRAY_COLOR,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  FILTER_ICON_EDGE_LENGTH,
  FILTER_ICON_MARGIN,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  MESSAGE_VERSION,
  SCROLLBAR_WIDTH,
} from "../../src/constants";
import { toCartesian, toHex, toZone, zoneToXc } from "../../src/helpers";
import { Model } from "../../src/model";
import { chartComponentRegistry } from "../../src/registries";
import {
  createChart,
  createFilter,
  createSheet,
  freezeColumns,
  freezeRows,
  hideColumns,
  hideRows,
  merge,
  selectCell,
  setCellContent,
  setSelection,
  updateFilter,
} from "../test_helpers/commands_helpers";
import {
  clickCell,
  edgeScrollDelay,
  getElComputedStyle,
  gridMouseEvent,
  hoverCell,
  rightClickCell,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import {
  getCell,
  getCellContent,
  getCellText,
  getSelectionAnchorCellXc,
  getStyle,
} from "../test_helpers/getters_helpers";
import {
  makeTestFixture,
  MockClipboard,
  mountSpreadsheet,
  nextTick,
  Touch,
} from "../test_helpers/helpers";
import { MockTransportService } from "../__mocks__/transport_service";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

function getVerticalScroll(): number {
  const scrollbar = fixture.querySelector(".o-scrollbar.vertical") as HTMLElement;
  return scrollbar.scrollTop;
}

function getHorizontalScroll(): number {
  const scrollbar = fixture.querySelector(".o-scrollbar.horizontal") as HTMLElement;
  return scrollbar.scrollLeft;
}

let fixture: HTMLElement;
let model: Model;
let parent: Spreadsheet;
let app: App;

chartComponentRegistry.add("bar", ChartJsComponent);

jest.useFakeTimers();

beforeEach(async () => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("Grid component", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    ({ app, parent, model } = await mountSpreadsheet(fixture));
  });

  afterEach(() => {
    app.destroy();
    fixture.remove();
  });

  test("simple rendering snapshot", async () => {
    expect(fixture.querySelector(".o-grid")).toMatchSnapshot();
  });

  test("can render a sheet with a merge", async () => {
    const sheet1 = model.getters.getSheetIds()[0];
    merge(model, "B2:B3", sheet1);
    expect(fixture.querySelector(".o-grid-overlay")).not.toBeNull();
  });

  test("scrollbars thickness should be set", async () => {
    expect(getElComputedStyle(".o-scrollbar.horizontal", "height")).toBe(`${SCROLLBAR_WIDTH}px`);
    expect(getElComputedStyle(".o-scrollbar.vertical", "width")).toBe(`${SCROLLBAR_WIDTH}px`);
  });

  test("can click on a cell to select it", async () => {
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    await clickCell(model, "C8");
    expect(getSelectionAnchorCellXc(model)).toBe("C8");
  });

  test("can click on resizer, then move selection with keyboard", async () => {
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    triggerMouseEvent(".o-overlay", "click", 300, 20);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    expect(getSelectionAnchorCellXc(model)).toBe("A2");
  });

  test("can shift-click on a cell to update selection", async () => {
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    await clickCell(model, "C8", { shiftKey: true });
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

  test("Can touch the grid to move it", async () => {
    const grid = fixture.querySelector(".o-grid-overlay")!;
    expect(getHorizontalScroll()).toBe(0);
    expect(getVerticalScroll()).toBe(0);
    grid.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [
          new Touch({
            clientX: 150,
            clientY: 150,
            identifier: 1,
            target: grid,
          }),
        ],
      })
    );
    grid.dispatchEvent(
      new TouchEvent("touchmove", {
        touches: [
          new Touch({
            clientX: 100,
            clientY: 120,
            identifier: 2,
            target: grid,
          }),
        ],
      })
    );
    await nextTick();
    expect(getHorizontalScroll()).toBe(50);
    expect(getVerticalScroll()).toBe(30);
    grid.dispatchEvent(
      new TouchEvent("touchmove", {
        touches: [
          new Touch({
            clientX: 80,
            clientY: 100,
            identifier: 2,
            target: grid,
          }),
        ],
      })
    );
    await nextTick();
    expect(getHorizontalScroll()).toBe(70);
    expect(getVerticalScroll()).toBe(50);
  });
  test("Event is stopped if not at the top", async () => {
    const grid = fixture.querySelector(".o-grid-overlay")!;
    expect(getHorizontalScroll()).toBe(0);
    expect(getVerticalScroll()).toBe(0);

    const mockCallback = jest.fn(() => {});
    fixture.addEventListener("touchmove", mockCallback);

    grid.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [
          new Touch({
            clientX: 0,
            clientY: 150,
            identifier: 1,
            target: grid,
          }),
        ],
      })
    );
    // move down; we are at the top: ev not prevented
    grid.dispatchEvent(
      new TouchEvent("touchmove", {
        cancelable: true,
        bubbles: true,
        touches: [
          new Touch({
            clientX: 0,
            clientY: 120,
            identifier: 2,
            target: grid,
          }),
        ],
      })
    );
    expect(mockCallback).toBeCalledTimes(1);
    // move up:; we are not at the top: ev prevented
    grid.dispatchEvent(
      new TouchEvent("touchmove", {
        cancelable: true,
        bubbles: true,
        touches: [
          new Touch({
            clientX: 0,
            clientY: 150,
            identifier: 3,
            target: grid,
          }),
        ],
      })
    );
    expect(mockCallback).toBeCalledTimes(1);
    // move up again but we are at the stop: ev not prevented
    grid.dispatchEvent(
      new TouchEvent("touchmove", {
        cancelable: true,
        bubbles: true,
        touches: [
          new Touch({
            clientX: 0,
            clientY: 150,
            identifier: 4,
            target: grid,
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
      document
        .querySelector(".o-grid")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
      expect(model.getters.getEditionMode()).toBe("editing");
    });

    test("pressing ENTER in edit mode stop editing and move one cell down", async () => {
      model.dispatch("START_EDITION", { text: "a" });
      await nextTick();
      fixture
        .querySelector("div.o-composer")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(getSelectionAnchorCellXc(model)).toBe("A2");
      expect(model.getters.getEditionMode()).toBe("inactive");
      expect(getCellContent(model, "A1")).toBe("a");
    });

    test("pressing BACKSPACE remove the content of a cell", async () => {
      setCellContent(model, "A1", "test");
      await nextTick();
      fixture
        .querySelector("div.o-grid")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace" }));
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
      expect(model.getters.getEditionMode()).toBe("inactive");
      expect(getCellContent(model, "A1")).toBe("");
    });

    test("pressing shift+ENTER in edit mode stop editing and move one cell up", async () => {
      selectCell(model, "A2");
      expect(getSelectionAnchorCellXc(model)).toBe("A2");
      model.dispatch("START_EDITION", { text: "a" });
      await nextTick();
      fixture
        .querySelector("div.o-composer")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }));
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
      expect(model.getters.getEditionMode()).toBe("inactive");
      expect(getCellContent(model, "A2")).toBe("a");
    });

    test("pressing shift+ENTER in edit mode in top row stop editing and stay on same cell", async () => {
      model.dispatch("START_EDITION", { text: "a" });
      await nextTick();
      fixture
        .querySelector("div.o-composer")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }));
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
      expect(model.getters.getEditionMode()).toBe("inactive");
      expect(getCellContent(model, "A1")).toBe("a");
    });

    test("pressing TAB move to next cell", async () => {
      document
        .querySelector(".o-grid")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      expect(getSelectionAnchorCellXc(model)).toBe("B1");
    });

    test("pressing shift+TAB move to previous cell", async () => {
      selectCell(model, "B1");
      expect(getSelectionAnchorCellXc(model)).toBe("B1");
      document
        .querySelector(".o-grid")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }));
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
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

    test("can loop through the selection with CTRL+A", async () => {
      function pressCtrlA() {
        document.activeElement!.dispatchEvent(
          new KeyboardEvent("keydown", { key: "A", ctrlKey: true, bubbles: true })
        );
      }

      setCellContent(model, "A1", "3");
      setCellContent(model, "A2", "3");

      pressCtrlA();
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A1:A2");

      pressCtrlA();
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.getSelectedZone()).toEqual(model.getters.getSheetZone(sheetId));

      pressCtrlA();
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A1");
    });

    test("toggle bold with Ctrl+B", async () => {
      setCellContent(model, "A1", "hello");
      expect(getCell(model, "A1")!.style).not.toBeDefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "B", ctrlKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCell(model, "A1")!.style).toEqual({ bold: true });
      expect(getStyle(model, "A1")).toEqual({ bold: true });
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "B", ctrlKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCell(model, "A1")!.style).toEqual({ bold: false });
      expect(getStyle(model, "A1")).toEqual({ bold: false });
    });

    test("toggle Italic with Ctrl+I", async () => {
      setCellContent(model, "A1", "hello");
      expect(getCell(model, "A1")!.style).toBeUndefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "I", ctrlKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCell(model, "A1")!.style).toEqual({ italic: true });
      expect(getStyle(model, "A1")).toEqual({ italic: true });
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "I", ctrlKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCell(model, "A1")!.style).toEqual({ italic: false });
      expect(getStyle(model, "A1")).toEqual({ italic: false });
    });

    test("can automatically sum with ALT+=", async () => {
      setCellContent(model, "B2", "2");
      selectCell(model, "B5");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true })
      );
      await nextTick();
      expect(document.activeElement).toBe(document.querySelector(".o-grid-composer .o-composer"));
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
      expect(model.getters.getEditionMode()).toBe("selecting");
      expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
      expect(model.getters.getCurrentContent()).toBe("=SUM()");
    });

    test("can automatically sum multiple zones in an empty sheet with ALT+=", () => {
      setSelection(model, ["A1:B2", "C4:C6"]);
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true })
      );
      expect(model.getters.getEditionMode()).toBe("selecting");
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
      expect(model.getters.getEditionMode()).toBe("selecting");
      expect(model.getters.getCurrentContent()).toBe("=SUM()");
    });

    test("automatic sum opens composer if selection is one merge even if it's not empty", () => {
      setCellContent(model, "A2", "2");
      merge(model, "A2:A3");
      selectCell(model, "A2");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true })
      );
      expect(model.getters.getEditionMode()).toBe("selecting");
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

    test("pressing Ctrl+K opens the link editor", async () => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
      );
      await nextTick();
      expect(fixture.querySelector(".o-link-editor")).not.toBeNull();
    });

    test("Filter icon is correctly rendered", async () => {
      createFilter(model, "B2:C3");
      await nextTick();

      const icons = fixture.querySelectorAll(".o-filter-icon");
      expect(icons).toHaveLength(2);
      const centerIngOffset = (DEFAULT_CELL_HEIGHT - FILTER_ICON_EDGE_LENGTH) / 2;
      const top = `${
        DEFAULT_CELL_HEIGHT * 2 - FILTER_ICON_EDGE_LENGTH + HEADER_HEIGHT - centerIngOffset
      }px`;
      const leftA = `${
        DEFAULT_CELL_WIDTH * 2 - FILTER_ICON_EDGE_LENGTH + HEADER_WIDTH - FILTER_ICON_MARGIN - 1
      }px`;
      const leftB = `${
        DEFAULT_CELL_WIDTH * 3 - FILTER_ICON_EDGE_LENGTH + HEADER_WIDTH - FILTER_ICON_MARGIN - 1
      }px`;
      expect((icons[0] as HTMLElement).style["_values"]).toEqual({ top, left: leftA });
      expect((icons[1] as HTMLElement).style["_values"]).toEqual({ top, left: leftB });
    });

    test("Filter icon change when filter is active", async () => {
      createFilter(model, "A1:A2");
      await nextTick();
      const grid = fixture.querySelector(".o-grid")!;
      expect(grid.querySelectorAll(".filter-icon")).toHaveLength(1);
      expect(grid.querySelectorAll(".filter-icon-active")).toHaveLength(0);

      updateFilter(model, "A1", ["5"]);
      await nextTick();
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.isFilterActive({ sheetId, ...toCartesian("A1") })).toBeTruthy();
      expect(grid.querySelectorAll(".filter-icon")).toHaveLength(0);
      expect(grid.querySelectorAll(".filter-icon-active")).toHaveLength(1);
    });

    test("Clicking on a filter icon correctly open context menu", async () => {
      createFilter(model, "A1:A2");
      await nextTick();
      await simulateClick(".o-filter-icon");
      expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(1);
    });
  });

  describe("Grid Scroll", () => {
    async function scrollGrid(args: { deltaY?: number; shiftKey?: boolean }) {
      fixture.querySelector(".o-grid")!.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: args.deltaY || 0,
          shiftKey: args.shiftKey,
          deltaMode: 0,
          bubbles: true,
        })
      );
      await nextTick();
    }

    test("Can scroll vertically", async () => {
      await scrollGrid({ deltaY: 1000 });
      expect(getVerticalScroll()).toBe(1000);
      expect(getHorizontalScroll()).toBe(0);
    });

    test("Can scroll horizontally using shift key", async () => {
      await scrollGrid({ deltaY: 1500, shiftKey: true });
      expect(getVerticalScroll()).toBe(0);
      expect(getHorizontalScroll()).toBe(1500);
    });

    test("Scrolling the grid remove hover popover", async () => {
      setCellContent(model, "A10", "=1/0");
      await hoverCell(model, "A10", 400);
      expect(fixture.querySelector(".o-error-tooltip")).not.toBeNull();
      await scrollGrid({ deltaY: 100 });
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.isVisibleInViewport({ sheetId, col: 0, row: 9 })).toBe(true);
      expect(fixture.querySelector(".o-error-tooltip")).toBeNull();
    });

    test("Scrolling the grid remove persistent popovers if the cell is outside the viewport", async () => {
      model.dispatch("OPEN_CELL_POPOVER", {
        col: 0,
        row: 0,
        popoverType: "LinkEditor",
      });
      await nextTick();
      expect(fixture.querySelector(".o-link-editor")).not.toBeNull();
      await scrollGrid({ deltaY: DEFAULT_CELL_HEIGHT });
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.isVisibleInViewport({ sheetId, col: 0, row: 0 })).toBe(false);
      expect(fixture.querySelector(".o-link-editor")).toBeNull();
    });

    test("Scrolling the grid don't remove persistent popovers if the cell is inside the viewport", async () => {
      model.dispatch("OPEN_CELL_POPOVER", {
        col: 0,
        row: 0,
        popoverType: "LinkEditor",
      });
      await nextTick();
      expect(fixture.querySelector(".o-link-editor")).not.toBeNull();
      await scrollGrid({ deltaY: DEFAULT_CELL_HEIGHT - 5 });
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.isVisibleInViewport({ sheetId, col: 0, row: 0 })).toBe(true);
      expect(fixture.querySelector(".o-link-editor")).not.toBeNull();
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
      model.dispatch("ACTIVATE_PAINT_FORMAT");
      gridMouseEvent(model, "mousedown", "C8");
      expect(getCell(model, "C8")).toBeUndefined();
      gridMouseEvent(model, "mouseup", "C8");
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
      model.dispatch("ACTIVATE_PAINT_FORMAT");
      expect(getCell(model, "C2")).toBeUndefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      );
      expect(getCell(model, "C2")!.style).toEqual({ bold: true });
    });
    test("closing contextmenu focuses the grid", async () => {
      await rightClickCell(model, "B2");
      await simulateClick(".o-menu div[data-name='add_row_before']");
      expect(fixture.querySelector(".o-menu div[data-name='add_row_before']")).toBeFalsy();
      expect(document.activeElement).toBe(fixture.querySelector(".o-grid>input"));
    });
  });
});

describe("Multi User selection", () => {
  let transportService: TransportService;
  beforeEach(async () => {
    transportService = new MockTransportService();
    fixture = makeTestFixture();
    model = new Model({}, { transportService });
    ({ app, parent } = await mountSpreadsheet(fixture, { model }));
  });

  afterEach(() => {
    app.destroy();
    fixture.remove();
  });

  test("Do not render multi user selection with invalid sheet", async () => {
    transportService.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: { id: "david", name: "David", position: { sheetId: "invalid", col: 1, row: 1 } },
    });
    await nextTick();
    expect(document.querySelectorAll(".o-client-tag")).toHaveLength(0);
  });

  test("Do not render multi user selection with invalid col", async () => {
    const sheetId = model.getters.getActiveSheetId();
    transportService.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: {
        id: "david",
        name: "David",
        position: { sheetId: sheetId, col: model.getters.getNumberCols(sheetId), row: 1 },
      },
    });
    await nextTick();
    expect(document.querySelectorAll(".o-client-tag")).toHaveLength(0);
  });

  test("Do not render multi user selection with invalid row", async () => {
    const sheetId = model.getters.getActiveSheetId();
    transportService.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: {
        id: "david",
        name: "David",
        position: { sheetId: sheetId, col: 1, row: model.getters.getNumberRows(sheetId) },
      },
    });
    await nextTick();
    expect(document.querySelectorAll(".o-client-tag")).toHaveLength(0);
  });
});

describe("error tooltip", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    ({ app, parent, model } = await mountSpreadsheet(fixture));
  });

  afterEach(() => {
    jest.useRealTimers();
    app.destroy();
  });

  test("can display error on A1", async () => {
    setCellContent(model, "A1", "=1/0");
    await hoverCell(model, "A1", 400);
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
  });

  test("don't display error on #N/A", async () => {
    Date.now = jest.fn(() => 0);
    setCellContent(model, "A1", "=NA()");
    await nextTick();
    gridMouseEvent(model, "mousemove", "A1");
    Date.now = jest.fn(() => 500);
    jest.advanceTimersByTime(300);
    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).toBeNull();
  });

  test("Display error on #N/A 'non-silent' ", async () => {
    Date.now = jest.fn(() => 0);
    setCellContent(model, "A1", "=VLOOKUP(6,A1:A2,B2:B4)");
    await nextTick();
    gridMouseEvent(model, "mousemove", "A1");
    Date.now = jest.fn(() => 500);
    jest.advanceTimersByTime(300);
    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
  });

  test("can display error tooltip", async () => {
    setCellContent(model, "C8", "=1/0");
    await hoverCell(model, "C8", 200);
    expect(document.querySelector(".o-error-tooltip")).toBeNull();
    await hoverCell(model, "C8", 400);
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
    expect(document.querySelector(".o-error-tooltip")?.parentElement).toMatchSnapshot();
    await hoverCell(model, "C7", 200);
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
    await hoverCell(model, "C7", 400);
    expect(document.querySelector(".o-error-tooltip")).toBeNull();
  });

  test("can display error when move on merge", async () => {
    merge(model, "C1:C8");
    setCellContent(model, "C1", "=1/0");
    await hoverCell(model, "C8", 400);
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
  });

  test("composer content is set when clicking on merged cell (not top left)", async () => {
    merge(model, "C1:C8");
    setCellContent(model, "C1", "Hello");
    await nextTick();
    await clickCell(model, "C8");
    expect(model.getters.getCurrentContent()).toBe("Hello");
  });

  test("Wheel events on error tooltip are scrolling the grid", async () => {
    setCellContent(model, "C1", "=0/0");
    await hoverCell(model, "C1", 400);
    const ev = new WheelEvent("wheel", { deltaY: 300, deltaX: 300, deltaMode: 0, bubbles: true });
    document.querySelector(".o-error-tooltip")!.dispatchEvent(ev);
    await nextTick();
    expect(getVerticalScroll()).toBe(300);
    expect(getHorizontalScroll()).toBe(300);
  });
});

describe("Events on Grid update viewport correctly", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    ({ app, parent, model } = await mountSpreadsheet(fixture));
  });
  afterEach(() => {
    app.destroy();
    fixture.remove();
  });
  test("Vertical scroll", async () => {
    fixture.querySelector(".o-grid")!.dispatchEvent(new WheelEvent("wheel", { deltaY: 1200 }));
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 52,
      bottom: 94,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      offsetX: 0,
      offsetScrollbarX: 0,
      offsetY: 1196,
      offsetScrollbarY: 1200,
    });
  });
  test("Horizontal scroll", async () => {
    fixture
      .querySelector(".o-grid")!
      .dispatchEvent(new WheelEvent("wheel", { deltaY: 200, shiftKey: true }));
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 2,
      right: 12,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      offsetX: 192,
      offsetScrollbarX: 200,
      offsetY: 0,
      offsetScrollbarY: 0,
    });
  });
  test("Move selection with keyboard", async () => {
    await clickCell(model, "I1");
    expect(getSelectionAnchorCellXc(model)).toBe("I1");
    const viewport = model.getters.getActiveMainViewport();
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(getSelectionAnchorCellXc(model)).toBe("J1");
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(getSelectionAnchorCellXc(model)).toBe("K1");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      ...viewport,
      left: 1,
      right: 11,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      offsetX: 96,
      offsetScrollbarX: 96,
    });
  });
  test("Move selection horizontally (left to right) through pane division resets the scroll", async () => {
    freezeColumns(model, 3);
    document.activeElement!.dispatchEvent(
      // scroll completely to the right
      new WheelEvent("wheel", {
        deltaX: 0,
        deltaY: 4 * DEFAULT_CELL_WIDTH,
        shiftKey: true,
        deltaMode: 0,
        bubbles: true,
      })
    );
    await clickCell(model, "C1");
    expect(model.getters.getActiveMainViewport().left).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().offsetX).toEqual(4 * DEFAULT_CELL_WIDTH);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: false, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("D1"));
    expect(model.getters.getActiveMainViewport().left).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().offsetX).toEqual(0);
  });

  test("Move selection horizontally (right to left) through pane division does not reset the scroll", async () => {
    freezeColumns(model, 3);
    document.activeElement!.dispatchEvent(
      // scroll completely to the right
      new WheelEvent("wheel", {
        deltaX: 0,
        deltaY: 4 * DEFAULT_CELL_WIDTH,
        shiftKey: true,
        deltaMode: 0,
        bubbles: true,
      })
    );
    await clickCell(model, "H1");
    expect(model.getters.getActiveMainViewport().left).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().offsetX).toEqual(4 * DEFAULT_CELL_WIDTH);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", shiftKey: false, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("G1"));
    expect(model.getters.getActiveMainViewport().left).toEqual(6);
    expect(model.getters.getActiveSheetScrollInfo().offsetX).toEqual(3 * DEFAULT_CELL_WIDTH);
    document.activeElement!.dispatchEvent(
      // scroll completely to the right
      new WheelEvent("wheel", {
        deltaX: 0,
        deltaY: -4 * DEFAULT_CELL_WIDTH,
        shiftKey: true,
        deltaMode: 0,
        bubbles: true,
      })
    );
    await clickCell(model, "D1");
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", shiftKey: false, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("C1"));
    expect(model.getters.getActiveMainViewport().left).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().offsetX).toEqual(0);
  });

  test("Move selection vertically (top to bottom) through pane division resets the scroll", async () => {
    freezeRows(model, 3);
    document.activeElement!.dispatchEvent(
      // scroll completely to the right
      new WheelEvent("wheel", {
        deltaX: 0,
        deltaY: 4 * DEFAULT_CELL_HEIGHT,
        shiftKey: false,
        deltaMode: 0,
        bubbles: true,
      })
    );
    await clickCell(model, "A3");
    expect(model.getters.getActiveMainViewport().top).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().offsetY).toEqual(4 * DEFAULT_CELL_HEIGHT);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: false, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("A4"));
    expect(model.getters.getActiveMainViewport().top).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().offsetY).toEqual(0);
  });

  test("Move selection vertically (bottom to to) through pane division does not reset the scroll", async () => {
    freezeRows(model, 3);
    document.activeElement!.dispatchEvent(
      // scroll completely to the right
      new WheelEvent("wheel", {
        deltaX: 0,
        deltaY: 4 * DEFAULT_CELL_HEIGHT,
        shiftKey: false,
        deltaMode: 0,
        bubbles: true,
      })
    );
    await clickCell(model, "A8");
    expect(model.getters.getActiveMainViewport().top).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().offsetY).toEqual(4 * DEFAULT_CELL_HEIGHT);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", shiftKey: false, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("A7"));
    expect(model.getters.getActiveMainViewport().top).toEqual(6);
    expect(model.getters.getActiveSheetScrollInfo().offsetY).toEqual(3 * DEFAULT_CELL_HEIGHT);
    document.activeElement!.dispatchEvent(
      // scroll completely to the right
      new WheelEvent("wheel", {
        deltaX: 0,
        deltaY: -4 * DEFAULT_CELL_HEIGHT,
        shiftKey: false,
        deltaMode: 0,
        bubbles: true,
      })
    );
    await clickCell(model, "A4");
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", shiftKey: false, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("A3"));
    expect(model.getters.getActiveMainViewport().top).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().offsetY).toEqual(0);
  });

  test("Alter selection with keyboard", async () => {
    await clickCell(model, "I1");
    expect(getSelectionAnchorCellXc(model)).toBe("I1");
    const viewport = model.getters.getActiveMainViewport();
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("I1:J1"));
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("I1:K1"));
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      ...viewport,
      left: 1,
      right: 11,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      offsetX: 96,
      offsetScrollbarX: 96,
    });
  });

  test("Alter selection horizontally (left to right) through pane division resets the scroll", async () => {
    freezeColumns(model, 3);
    document.activeElement!.dispatchEvent(
      // scroll completely to the right
      new WheelEvent("wheel", {
        deltaX: 0,
        deltaY: 4 * DEFAULT_CELL_WIDTH,
        shiftKey: true,
        deltaMode: 0,
        bubbles: true,
      })
    );
    await clickCell(model, "C1");
    expect(model.getters.getActiveMainViewport().left).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().offsetX).toEqual(4 * DEFAULT_CELL_WIDTH);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("C1:D1"));
    expect(model.getters.getActiveMainViewport().left).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().offsetX).toEqual(0);
  });

  test("Alter selection horizontally (right to left) through pane division does not reset the scroll", async () => {
    freezeColumns(model, 3);
    document.activeElement!.dispatchEvent(
      // scroll completely to the right
      new WheelEvent("wheel", {
        deltaX: 0,
        deltaY: 4 * DEFAULT_CELL_WIDTH,
        shiftKey: true,
        deltaMode: 0,
        bubbles: true,
      })
    );
    await clickCell(model, "H1");
    expect(model.getters.getActiveMainViewport().left).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().offsetX).toEqual(4 * DEFAULT_CELL_WIDTH);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", shiftKey: true, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("G1:H1"));
    expect(model.getters.getActiveMainViewport().left).toEqual(6);
    expect(model.getters.getActiveSheetScrollInfo().offsetX).toEqual(3 * DEFAULT_CELL_WIDTH);
    document.activeElement!.dispatchEvent(
      // scroll completely to the right
      new WheelEvent("wheel", {
        deltaX: 0,
        deltaY: -4 * DEFAULT_CELL_WIDTH,
        shiftKey: true,
        deltaMode: 0,
        bubbles: true,
      })
    );
    await clickCell(model, "D1");
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", shiftKey: true, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("C1:D1"));
    expect(model.getters.getActiveMainViewport().left).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().offsetX).toEqual(0);
  });

  test("Alter selection vertically (top to bottom) through pane division resets the scroll", async () => {
    freezeRows(model, 3);
    document.activeElement!.dispatchEvent(
      // scroll completely to the right
      new WheelEvent("wheel", {
        deltaX: 0,
        deltaY: 4 * DEFAULT_CELL_HEIGHT,
        shiftKey: false,
        deltaMode: 0,
        bubbles: true,
      })
    );
    await clickCell(model, "A3");
    expect(model.getters.getActiveMainViewport().top).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().offsetY).toEqual(4 * DEFAULT_CELL_HEIGHT);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("A3:A4"));
    expect(model.getters.getActiveMainViewport().top).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().offsetY).toEqual(0);
  });

  test("Alter selection vertically (bottom to to) through pane division does not reset the scroll", async () => {
    freezeRows(model, 3);
    document.activeElement!.dispatchEvent(
      // scroll completely to the right
      new WheelEvent("wheel", {
        deltaX: 0,
        deltaY: 4 * DEFAULT_CELL_HEIGHT,
        shiftKey: false,
        deltaMode: 0,
        bubbles: true,
      })
    );
    await clickCell(model, "A8");
    expect(model.getters.getActiveMainViewport().top).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().offsetY).toEqual(4 * DEFAULT_CELL_HEIGHT);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", shiftKey: true, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("A7:A8"));
    expect(model.getters.getActiveMainViewport().top).toEqual(6);
    expect(model.getters.getActiveSheetScrollInfo().offsetY).toEqual(3 * DEFAULT_CELL_HEIGHT);
    document.activeElement!.dispatchEvent(
      // scroll completely to the left
      new WheelEvent("wheel", {
        deltaX: 0,
        deltaY: -4 * DEFAULT_CELL_HEIGHT,
        shiftKey: false,
        deltaMode: 0,
        bubbles: true,
      })
    );
    await clickCell(model, "A4");
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", shiftKey: true, bubbles: true })
    );
    expect(model.getters.getSelectedZone()).toEqual(toZone("A3:A4"));
    expect(model.getters.getActiveMainViewport().top).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().offsetY).toEqual(0);
  });

  test("Scroll viewport then alter selection with keyboard from penultimate cell to last cell does not shift viewport", async () => {
    await simulateClick(".o-grid-overlay"); // gain focus on grid element
    const { width } = model.getters.getMainViewportRect();
    const { width: viewportWidth } = model.getters.getSheetViewDimensionWithHeaders();
    document.activeElement!.dispatchEvent(
      // scroll completely to the right
      new WheelEvent("wheel", {
        deltaY: width - viewportWidth,
        deltaX: 0,
        shiftKey: true,
        deltaMode: 0,
        bubbles: true,
      })
    );
    const viewport = model.getters.getActiveMainViewport();
    selectCell(model, "Y1");
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true })
    );
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
  });

  test("A resize of the grid DOM element impacts the viewport", async () => {
    expect(model.getters.getSheetViewDimension()).toMatchObject({
      width: 1000 - SCROLLBAR_WIDTH,
      height: 1000 - SCROLLBAR_WIDTH,
    });
    // mock a resizing of the grid DOM element. can occur if resizing the browser or opening the sidePanel
    jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 800);
    jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 650);
    // force a rerendering to pass through patched() of the Grid component.
    parent.render(true);
    await nextTick();

    expect(model.getters.getSheetViewDimension()).toMatchObject({
      width: 800,
      height: 650,
    });
  });

  test("Scroll viewport then alter selection with mouse from penultimate cell to last cell does not shift viewport", async () => {
    await simulateClick(".o-grid-overlay"); // gain focus on grid element
    const { width } = model.getters.getMainViewportRect();
    const { width: viewportWidth } = model.getters.getSheetViewDimensionWithHeaders();
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
    const viewport = model.getters.getActiveMainViewport();
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    await clickCell(model, "Y1", { shiftKey: true });
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
  });

  test("resize event handler is removed", () => {
    app.destroy();
    window.dispatchEvent(new Event("resize"));
  });
});

describe("Edge-Scrolling on mouseMove in selection", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    fixture = makeTestFixture();
    ({ app, parent, model } = await mountSpreadsheet(fixture));
  });

  afterEach(() => {
    app.destroy();
    fixture.remove();
  });

  test("Can edge-scroll horizontally", async () => {
    const { width, height } = model.getters.getSheetViewDimension();
    const y = height / 2;
    triggerMouseEvent(".o-grid-overlay", "mousedown", width / 2, y);
    triggerMouseEvent(".o-grid-overlay", "mousemove", 1.5 * width, y);
    const advanceTimer = edgeScrollDelay(0.5 * width, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-grid-overlay", "mouseup", 1.5 * width, y);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 6,
      right: 16,
      top: 0,
      bottom: 42,
    });

    triggerMouseEvent(".o-grid-overlay", "mousedown", width / 2, y);
    triggerMouseEvent(".o-grid-overlay", "mousemove", -0.5 * width, y);
    const advanceTimer2 = edgeScrollDelay(0.5 * width, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-grid-overlay", "mouseup", -0.5 * width, y);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 3,
      right: 13,
      top: 0,
      bottom: 42,
    });
  });

  test("Can edge-scroll vertically", async () => {
    const { width, height } = model.getters.getSheetViewDimensionWithHeaders();
    const x = width / 2;
    triggerMouseEvent(".o-grid-overlay", "mousedown", x, height / 2);
    triggerMouseEvent(".o-grid-overlay", "mousemove", x, 1.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * height, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-grid-overlay", "mouseup", x, 1.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 6,
      bottom: 48,
    });

    triggerMouseEvent(".o-grid-overlay", "mousedown", x, height / 2);
    triggerMouseEvent(".o-grid-overlay", "mousemove", x, -0.5 * height);
    const advanceTimer2 = edgeScrollDelay(0.5 * height, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-grid-overlay", "mouseup", x, -0.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 3,
      bottom: 45,
    });
  });

  test("Scroll bars have background color", () => {
    // Without background color, elements could be displayed above the scrollbars placeholders
    const getColor = (selector: string) => toHex(getElComputedStyle(selector, "background"));

    expect(getColor(".o-scrollbar.corner")).toEqual(toHex(BACKGROUND_GRAY_COLOR));
    expect(getColor(".o-scrollbar.horizontal")).toEqual(toHex(BACKGROUND_GRAY_COLOR));
    expect(getColor(".o-scrollbar.vertical")).toEqual(toHex(BACKGROUND_GRAY_COLOR));
  });
});

describe("Copy paste keyboard shortcut", () => {
  let clipboard: MockClipboard;
  let sheetId: string;

  async function getClipboardEvent(type: "copy" | "paste" | "cut") {
    const event = new Event(type, { bubbles: true });
    const content = await clipboard.readText();
    //@ts-ignore
    event.clipboardData = {
      getData: () => content,
      setData: async (format: string, data: string) => {
        await clipboard.writeText(data);
      },
      types: ["text/plain"],
    };
    return event;
  }

  beforeEach(async () => {
    clipboard = new MockClipboard();
    Object.defineProperty(navigator, "clipboard", {
      get() {
        return clipboard;
      },
      configurable: true,
    });
    fixture = makeTestFixture();
    ({ app, parent, model } = await mountSpreadsheet(fixture));
    sheetId = model.getters.getActiveSheetId();
  });

  afterEach(() => {
    app.destroy();
    fixture.remove();
  });

  test("Can copy/paste cells", async () => {
    setCellContent(model, "A1", "things");
    selectCell(model, "A1");
    document.body.dispatchEvent(await getClipboardEvent("copy"));
    selectCell(model, "A2");
    document.body.dispatchEvent(await getClipboardEvent("paste"));
    expect(getCellContent(model, "A2")).toEqual("things");
  });

  test("Can cut/paste cells", async () => {
    setCellContent(model, "A1", "things");
    selectCell(model, "A1");
    document.body.dispatchEvent(await getClipboardEvent("cut"));
    selectCell(model, "A2");
    document.body.dispatchEvent(await getClipboardEvent("paste"));
    expect(getCellContent(model, "A1")).toEqual("");
    expect(getCellContent(model, "A2")).toEqual("things");
  });

  test("Can copy/paste chart", async () => {
    selectCell(model, "A1");
    createChart(model, {}, "chartId");
    model.dispatch("SELECT_FIGURE", { id: "chartId" });
    document.body.dispatchEvent(await getClipboardEvent("copy"));
    document.body.dispatchEvent(await getClipboardEvent("paste"));
    expect(model.getters.getChartIds(sheetId)).toHaveLength(2);
  });

  test("Can cut/paste chart", async () => {
    selectCell(model, "A1");
    createChart(model, {}, "chartId");
    model.dispatch("SELECT_FIGURE", { id: "chartId" });
    document.body.dispatchEvent(await getClipboardEvent("cut"));
    document.body.dispatchEvent(await getClipboardEvent("paste"));
    expect(model.getters.getChartIds(sheetId)).toHaveLength(1);
    expect(model.getters.getChartIds(sheetId)[0]).not.toEqual("chartId");
  });
});
