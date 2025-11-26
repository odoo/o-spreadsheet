import { getDataFilterIcon } from "@odoo/o-spreadsheet-engine/components/icons/icons";
import {
  DEFAULT_BORDER_DESC,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  FILTERS_COLOR,
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  MESSAGE_VERSION,
  MIN_CELL_TEXT_MARGIN,
  SCROLLBAR_WIDTH,
} from "@odoo/o-spreadsheet-engine/constants";
import { createEmptyWorkbookData } from "@odoo/o-spreadsheet-engine/migrations/data";
import { Model } from "@odoo/o-spreadsheet-engine/model";
import { ClipboardPlugin } from "@odoo/o-spreadsheet-engine/plugins/ui_stateful/clipboard";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { xmlEscape } from "@odoo/o-spreadsheet-engine/xlsx/helpers/xml_helpers";
import { Spreadsheet, TransportService } from "../../src";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { ComposerFocusStore } from "../../src/components/composer/composer_focus_store";
import { resetTimeoutDuration } from "../../src/components/helpers/touch_scroll_hook";
import { PaintFormatStore } from "../../src/components/paint_format_button/paint_format_store";
import { CellPopoverStore } from "../../src/components/popover";
import { buildSheetLink, toCartesian, toZone, zoneToXc } from "../../src/helpers";
import { handleCopyPasteResult } from "../../src/helpers/ui/paste_interactive";
import { Store } from "../../src/store_engine";
import { ClientFocusStore } from "../../src/stores/client_focus_store";
import { HighlightStore } from "../../src/stores/highlight_store";
import { NotificationStore } from "../../src/stores/notification_store";
import { Align, ClipboardMIMEType } from "../../src/types";
import { FileStore } from "../__mocks__/mock_file_store";
import { MockTransportService } from "../__mocks__/transport_service";
import { MockClipboardData, getClipboardEvent } from "../test_helpers/clipboard";
import {
  addIconCF,
  copy,
  createChart,
  createImage,
  createSheet,
  createTableWithFilter,
  cut,
  foldHeaderGroup,
  freezeColumns,
  freezeRows,
  groupHeaders,
  hideColumns,
  hideRows,
  merge,
  selectCell,
  selectColumn,
  selectHeader,
  selectRow,
  setBorders,
  setCellContent,
  setCellFormat,
  setSelection,
  setStyle,
  setViewportOffset,
  undo,
  updateFilter,
  updateTableConfig,
} from "../test_helpers/commands_helpers";
import {
  clickCell,
  clickGridIcon,
  doubleClick,
  edgeScrollDelay,
  getElComputedStyle,
  getGridIconEventPosition,
  gridMouseEvent,
  hoverCell,
  hoverGridIcon,
  keyDown,
  rightClickCell,
  scrollGrid,
  simulateClick,
  triggerMouseEvent,
  triggerTouchEvent,
  triggerWheelEvent,
} from "../test_helpers/dom_helper";
import {
  getBorder,
  getCell,
  getCellContent,
  getCellIcons,
  getCellStyle,
  getCellText,
  getClipboardVisibleZones,
  getEvaluatedCell,
  getSelectionAnchorCellXc,
  getStyle,
} from "../test_helpers/getters_helpers";
import {
  createEqualCF,
  flattenHighlightRange,
  getPlugin,
  mockChart,
  mountSpreadsheet,
  nextTick,
  spyModelDispatch,
  target,
  toRangesData,
  typeInComposerGrid,
} from "../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../test_helpers/mock_helpers";

jest.mock("../../src/helpers/figures/images/image_provider", () =>
  require("../__mocks__/mock_image_provider")
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
let env: SpreadsheetChildEnv;
let parent: Spreadsheet;
let composerStore: Store<CellComposerStore>;
let composerFocusStore: Store<ComposerFocusStore>;

jest.useFakeTimers();
mockChart();

describe("Grid component", () => {
  beforeEach(async () => {
    ({ parent, model, fixture, env } = await mountSpreadsheet());
    composerStore = env.getStore(CellComposerStore);
    composerFocusStore = env.getStore(ComposerFocusStore);
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

  test("can click on a partially vertically scrolled cell to select it", async () => {
    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT / 2);
    await nextTick();
    expect(model.getters.getVisibleRect(toZone("A1"))).toMatchObject({
      x: HEADER_WIDTH,
      y: HEADER_HEIGHT,
      width: DEFAULT_CELL_WIDTH,
      height: DEFAULT_CELL_HEIGHT / 2,
    });
    triggerMouseEvent(
      ".o-grid-overlay",
      "pointerdown",
      DEFAULT_CELL_WIDTH / 2,
      DEFAULT_CELL_HEIGHT * 0.75 // after row 1
    );
    await nextTick();
    expect(getSelectionAnchorCellXc(model)).toBe("A2");
    triggerMouseEvent(
      ".o-grid-overlay",
      "pointerdown",
      DEFAULT_CELL_WIDTH / 2,
      DEFAULT_CELL_HEIGHT * 0.25 // in row 1
    );
    await nextTick();
    expect(getSelectionAnchorCellXc(model)).toBe("A1");
    expect(model.getters.getVisibleRect(toZone("A1"))).toMatchObject({
      x: HEADER_WIDTH,
      y: HEADER_HEIGHT,
      width: DEFAULT_CELL_WIDTH,
      height: DEFAULT_CELL_HEIGHT,
    });
  });

  test("can click on a partially horizontally scrolled cell to select it", async () => {
    setViewportOffset(model, DEFAULT_CELL_WIDTH / 2, 0);
    await nextTick();
    expect(model.getters.getVisibleRect(toZone("A1"))).toMatchObject({
      x: HEADER_WIDTH,
      y: HEADER_HEIGHT,
      width: DEFAULT_CELL_WIDTH / 2,
      height: DEFAULT_CELL_HEIGHT,
    });
    triggerMouseEvent(
      ".o-grid-overlay",
      "pointerdown",
      DEFAULT_CELL_WIDTH * 0.75, // after col A
      DEFAULT_CELL_HEIGHT / 2
    );
    await nextTick();
    expect(getSelectionAnchorCellXc(model)).toBe("B1");
    triggerMouseEvent(
      ".o-grid-overlay",
      "pointerdown",
      DEFAULT_CELL_WIDTH * 0.25, // in col A
      DEFAULT_CELL_HEIGHT / 2
    );
    await nextTick();
    expect(getSelectionAnchorCellXc(model)).toBe("A1");
    expect(model.getters.getVisibleRect(toZone("A1"))).toMatchObject({
      x: HEADER_WIDTH,
      y: HEADER_HEIGHT,
      width: DEFAULT_CELL_WIDTH,
      height: DEFAULT_CELL_HEIGHT,
    });
  });

  test("can click on resizer, then move selection with keyboard", async () => {
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    triggerMouseEvent(".o-overlay", "click", 300, 20);
    keyDown({ key: "ArrowDown" });
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
    triggerTouchEvent(grid, "touchstart", { clientX: 150, clientY: 150, identifier: 1 });
    triggerTouchEvent(grid, "touchmove", { clientX: 100, clientY: 120, identifier: 2 });
    jest.advanceTimersByTime(10);
    await nextTick();
    expect(getHorizontalScroll()).toBe(50);
    expect(getVerticalScroll()).toBe(30);
    triggerTouchEvent(grid, "touchmove", { clientX: 80, clientY: 100, identifier: 2 });
    await nextTick();
    expect(getHorizontalScroll()).toBe(70);
    expect(getVerticalScroll()).toBe(50);
  });

  test("Event is stopped if not at the top when scrolling upwards", async () => {
    const grid = fixture.querySelector(".o-grid-overlay")!;
    expect(getHorizontalScroll()).toBe(0);
    expect(getVerticalScroll()).toBe(0);

    const mockCallback = jest.fn(() => {});
    fixture.addEventListener("touchmove", mockCallback);

    triggerTouchEvent(grid, "touchstart", { clientX: 0, clientY: 150, identifier: 1 });
    // move down; we are at the top: ev is prevented
    triggerTouchEvent(grid, "touchmove", { clientX: 0, clientY: 120, identifier: 2 });
    expect(mockCallback).toBeCalledTimes(0);
    jest.advanceTimersByTime(10);
    // move up:; we are not at the top: ev prevented
    triggerTouchEvent(grid, "touchmove", { clientX: 0, clientY: 150, identifier: 3 });
    expect(mockCallback).toBeCalledTimes(0);
    // move up again but we are at the stop: ev not prevented
    triggerTouchEvent(grid, "touchmove", { clientX: 0, clientY: 150, identifier: 4 });
    expect(mockCallback).toBeCalledTimes(1);
  });

  test("Event is stopped if not at the top when scrolling downwards", async () => {
    const grid = fixture.querySelector(".o-grid-overlay")!;
    const { maxOffsetY } = model.getters.getMaximumSheetOffset();
    expect(getHorizontalScroll()).toBe(0);
    expect(getVerticalScroll()).toBe(0);

    const mockCallback = jest.fn(() => {});
    fixture.addEventListener("touchmove", mockCallback);

    triggerTouchEvent(grid, "touchstart", { clientX: 0, clientY: maxOffsetY + 10, identifier: 1 });
    // move down, to scroll all the way down; ev is prevented
    triggerTouchEvent(grid, "touchmove", { clientX: 0, clientY: 10, identifier: 2 });
    expect(mockCallback).toBeCalledTimes(0);
    jest.advanceTimersByTime(10);
    // move down again, we are at the bottom: ev prevented
    triggerTouchEvent(grid, "touchmove", { clientX: 0, clientY: 0, identifier: 3 });
    expect(mockCallback).toBeCalledTimes(1);
  });

  test("Double clicking only opens composer when actually targetting grid overlay", async () => {
    // creating a child  node
    mockChart();
    createChart(model, { type: "bar" }, "chartId");
    await nextTick();
    await simulateClick(".o-figure", 0, 0);
    await nextTick();
    expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));
    // double click on child
    await doubleClick(fixture, ".o-figure");
    expect(composerStore.editionMode).toBe("inactive");
    expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));

    // double click on grid overlay
    await doubleClick(fixture, ".o-grid-overlay");
    expect(composerStore.editionMode).toBe("editing");
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer"));
  });

  test("Double clicking on gridOverlay opens composer in different edition modes", async () => {
    setCellContent(model, "A1", "things");
    merge(model, "A1:A2", model.getters.getActiveSheetId(), true);
    await nextTick();
    // double click A1
    triggerMouseEvent(
      ".o-grid-overlay",
      "dblclick",
      0.5 * DEFAULT_CELL_WIDTH,
      0.5 * DEFAULT_CELL_HEIGHT
    );
    await nextTick();
    expect(composerFocusStore.focusMode).toBe("contentFocus");

    composerStore.stopEdition();
    await nextTick();
    expect(composerFocusStore.focusMode).toBe("inactive");

    // double click A2 - still in a non empty cell (in merge)
    triggerMouseEvent(
      ".o-grid-overlay",
      "dblclick",
      0.5 * DEFAULT_CELL_WIDTH,
      1.5 * DEFAULT_CELL_HEIGHT
    );
    await nextTick();
    expect(composerFocusStore.focusMode).toBe("contentFocus");

    composerStore.stopEdition();
    await nextTick();
    expect(composerFocusStore.focusMode).toBe("inactive");

    // double click B2
    triggerMouseEvent(
      ".o-grid-overlay",
      "dblclick",
      1.5 * DEFAULT_CELL_WIDTH,
      1.5 * DEFAULT_CELL_HEIGHT
    );
    await nextTick();
    expect(composerFocusStore.focusMode).toBe("cellFocus");
  });

  test("Touch has an inertial scroll", async () => {
    const timeDelta = 100;
    const grid = fixture.querySelector(".o-grid-overlay")!;
    triggerTouchEvent(grid, "touchstart", { clientX: 0, clientY: 150 });
    triggerTouchEvent(grid, "touchmove", { clientX: 0, clientY: 150 });
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toBe(0);
    jest.advanceTimersByTime(timeDelta);
    triggerTouchEvent(grid, "touchmove", { clientX: 0, clientY: 120 });
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toBe(30);
    triggerTouchEvent(grid, "touchend", { clientX: 0, clientY: 120 });
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toBe(30);
    jest.advanceTimersByTime(timeDelta);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toBeGreaterThan(30);
    let previousScrollY = model.getters.getActiveSheetScrollInfo().scrollY;
    jest.advanceTimersByTime(timeDelta);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toBeGreaterThan(previousScrollY);
    previousScrollY = model.getters.getActiveSheetScrollInfo().scrollY;
    jest.advanceTimersByTime(timeDelta);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toBeGreaterThan(previousScrollY);
    previousScrollY = model.getters.getActiveSheetScrollInfo().scrollY;
    jest.advanceTimersByTime(timeDelta);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toBeGreaterThan(previousScrollY);
  });

  test("scroll inertia is reset after some time", async () => {
    const timeDelta = 100;
    const grid = fixture.querySelector(".o-grid-overlay")!;
    triggerTouchEvent(grid, "touchstart", { clientX: 0, clientY: 150 });
    triggerTouchEvent(grid, "touchmove", { clientX: 0, clientY: 150 });
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toBe(0);
    jest.advanceTimersByTime(timeDelta);
    triggerTouchEvent(grid, "touchmove", { clientX: 0, clientY: 120 });
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toBe(30);
    jest.advanceTimersByTime(resetTimeoutDuration + 1);
    triggerTouchEvent(grid, "touchend", { clientX: 0, clientY: 120 });
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toBe(30);
    jest.runOnlyPendingTimers();
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toBe(30);
  });

  test("Double clicking on an icon does not open the composer", async () => {
    createTableWithFilter(model, "A1:A2");
    await nextTick();

    const { x, y } = getGridIconEventPosition(model, "A1");
    triggerMouseEvent(".o-grid-overlay", "dblclick", x, y);
    await nextTick();

    expect(composerFocusStore.focusMode).toBe("inactive");
  });

  describe("keybindings", () => {
    test("pressing ENTER put current cell in edit mode", async () => {
      // note: this behaviour is not like excel. Maybe someone will want to
      // change this
      await keyDown({ key: "Enter" });
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
      expect(composerStore.editionMode).toBe("editing");
    });

    test("pressing ENTER in edit mode stop editing and move one cell down", async () => {
      await typeInComposerGrid("a");
      keyDown({ key: "Enter" });
      expect(getSelectionAnchorCellXc(model)).toBe("A2");
      expect(composerStore.editionMode).toBe("inactive");
      expect(getCellContent(model, "A1")).toBe("a");
    });

    test.each(["Backspace", "Delete"])("pressing %s remove the content of a cell", async (key) => {
      setCellContent(model, "A1", "test");
      const dispatch = spyModelDispatch(model);
      keyDown({ key });
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
      expect(composerStore.editionMode).toBe("inactive");
      expect(getCellContent(model, "A1")).toBe("");
      expect(dispatch).toHaveBeenCalledWith("DELETE_UNFILTERED_CONTENT", {
        sheetId: model.getters.getActiveSheetId(),
        target: target("A1"),
      });
    });

    test("pressing shift+ENTER in edit mode stop editing and move one cell up", async () => {
      selectCell(model, "A2");
      expect(getSelectionAnchorCellXc(model)).toBe("A2");
      await typeInComposerGrid("a");
      keyDown({ key: "Enter", shiftKey: true });
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
      expect(composerStore.editionMode).toBe("inactive");
      expect(getCellContent(model, "A2")).toBe("a");
    });

    test("pressing shift+ENTER in edit mode in top row stop editing and stay on same cell", async () => {
      await typeInComposerGrid("a");
      keyDown({ key: "Enter", shiftKey: true });
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
      expect(composerStore.editionMode).toBe("inactive");
      expect(getCellContent(model, "A1")).toBe("a");
    });

    test("pressing TAB move to next cell", async () => {
      await keyDown({ key: "Tab" });
      expect(getSelectionAnchorCellXc(model)).toBe("B1");
    });

    test("pressing shift+TAB move to previous cell", async () => {
      selectCell(model, "B1");
      expect(getSelectionAnchorCellXc(model)).toBe("B1");
      await keyDown({ key: "Tab", shiftKey: true });
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
    });

    test.each([
      { key: "F4", ctrlKey: false },
      { key: "Y", ctrlKey: true },
    ])("can undo/redo with keyboard CTRL+Z/%s", async (redoKey) => {
      setStyle(model, "A1", { fillColor: "red" });
      expect(getCellStyle(model, "A1")).toBeDefined();
      keyDown({ key: "z", ctrlKey: true });
      expect(getCell(model, "A1")).toBeUndefined();
      await nextTick();
      keyDown({ ...redoKey, bubbles: true });
      expect(getCellStyle(model, "A1")).toBeDefined();
    });

    test("can undo/redo with keyboard (uppercase version)", async () => {
      setStyle(model, "A1", { fillColor: "red" });
      expect(getCellStyle(model, "A1")).toBeDefined();
      keyDown({ key: "Z", ctrlKey: true });
      expect(getCell(model, "A1")).toBeUndefined();
      await nextTick();
      keyDown({ key: "Y", ctrlKey: true });
      expect(getCellStyle(model, "A1")).toBeDefined();
    });

    test("can loop through the selection with CTRL+A", async () => {
      function pressCtrlA() {
        keyDown({ key: "A", ctrlKey: true });
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
      expect(getCellStyle(model, "A1")).not.toBeDefined();
      await keyDown({ key: "B", ctrlKey: true });
      expect(getCellStyle(model, "A1")).toEqual({ bold: true });
      expect(getStyle(model, "A1")).toEqual({ bold: true });
      await keyDown({ key: "B", ctrlKey: true });
      expect(getCellStyle(model, "A1")).not.toBeDefined();
      expect(getStyle(model, "A1")).toEqual({});
    });

    test("toggle Italic with Ctrl+I", async () => {
      setCellContent(model, "A1", "hello");
      expect(getCellStyle(model, "A1")).toBeUndefined();
      await keyDown({ key: "I", ctrlKey: true });
      expect(getCellStyle(model, "A1")).toEqual({ italic: true });
      expect(getStyle(model, "A1")).toEqual({ italic: true });
      await keyDown({ key: "I", ctrlKey: true });
      expect(getCellStyle(model, "A1")).not.toBeDefined();
      expect(getStyle(model, "A1")).toEqual({});
    });

    test("open inserting image window with CTRL+O", async () => {
      const fileStore = new FileStore();
      const data = createEmptyWorkbookData();
      const { env } = await mountSpreadsheet({
        model: new Model(data, {
          external: { fileStore },
        }),
      });

      const requestImage = jest.spyOn(env.imageProvider!, "requestImage");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "O", ctrlKey: true, bubbles: true })
      );
      await nextTick();
      expect(requestImage).toHaveBeenCalled();
    });

    test("set left align with Ctrl+SHIFT+L", async () => {
      setCellContent(model, "A1", "hello");
      expect(getCellStyle(model, "A1")).toBeUndefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "L", ctrlKey: true, shiftKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCellStyle(model, "A1")).toEqual({ align: "left" });
    });

    test("set center align with Ctrl+SHIFT+E", async () => {
      setCellContent(model, "A1", "hello");
      expect(getCellStyle(model, "A1")).toBeUndefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "E", ctrlKey: true, shiftKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCellStyle(model, "A1")).toEqual({ align: "center" });
    });

    test("set right align with Ctrl+SHIFT+R", async () => {
      setCellContent(model, "A1", "hello");
      expect(getCellStyle(model, "A1")).toBeUndefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "R", ctrlKey: true, shiftKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCellStyle(model, "A1")).toEqual({ align: "right" });
    });

    test("clean formatting with CTRL+SHIFT+<", async () => {
      const style = { fillColor: "red", align: "right" as Align, bold: true };
      setCellContent(model, "A1", "hello");
      setStyle(model, "A1", style);
      expect(getCellStyle(model, "A1")).toEqual(style);
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "<", ctrlKey: true, shiftKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCellStyle(model, "A1")).toBeUndefined();
    });

    test("clean formatting with CTRL+<", async () => {
      const style = { fillColor: "red", align: "right" as Align, bold: true };
      setCellContent(model, "A1", "hello");
      setStyle(model, "A1", style);
      expect(getCellStyle(model, "A1")).toEqual(style);
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "<", ctrlKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCellStyle(model, "A1")).toBeUndefined();
    });

    test("open a web link with ALT+ENTER", async () => {
      const windowOpen = jest.spyOn(window, "open").mockImplementation();
      setCellContent(model, "A1", "[label](url.com)");
      selectCell(model, "A1");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", altKey: true, bubbles: true })
      );
      expect(windowOpen).toHaveBeenCalledWith("https://url.com", "_blank");
    });

    test("open a sheet link with ALT+ENTER", async () => {
      const sheetId = "42";
      createSheet(model, { sheetId });
      setCellContent(model, "A1", `[label](${buildSheetLink(sheetId)})`);
      expect(model.getters.getActiveSheetId()).not.toBe(sheetId);

      selectCell(model, "A1");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", altKey: true, bubbles: true })
      );
      expect(model.getters.getActiveSheetId()).toBe(sheetId);
    });

    test("can automatically sum with ALT+=", async () => {
      setCellContent(model, "B2", "2");
      selectCell(model, "B5");
      await keyDown({ key: "=", altKey: true });
      expect(document.activeElement).toBe(document.querySelector(".o-grid-composer .o-composer"));
      expect(composerStore.editionMode).toBe("editing");
      expect(composerStore.composerSelection).toEqual({ start: 5, end: 10 });
      expect(composerStore.currentContent).toBe("=SUM(B2:B4)");
      expect(composerStore.highlights[0]?.range.zone).toEqual(toZone("B2:B4"));
    });

    test("can automatically sum in an empty sheet with ALT+=", () => {
      selectCell(model, "B5");
      keyDown({ key: "=", altKey: true });
      expect(composerStore.editionMode).toBe("selecting");
      expect(composerStore.composerSelection).toEqual({ start: 5, end: 5 });
      expect(composerStore.currentContent).toBe("=SUM()");
    });

    test("can automatically sum multiple zones in an empty sheet with ALT+=", () => {
      setSelection(model, ["A1:B2", "C4:C6"]);
      keyDown({ key: "=", altKey: true });
      expect(composerStore.editionMode).toBe("selecting");
      expect(composerStore.composerSelection).toEqual({ start: 5, end: 5 });
      expect(composerStore.currentContent).toBe("=SUM()");
    });

    test("automatically sum zoned xc is merged", () => {
      setCellContent(model, "B2", "2");
      merge(model, "B2:B4");
      selectCell(model, "B5");
      keyDown({ key: "=", altKey: true });
      expect(composerStore.currentContent).toBe("=SUM(B2)");
    });

    test("automatically sum from merged cell", () => {
      setCellContent(model, "A1", "2");
      merge(model, "B1:B2");
      selectCell(model, "B2");
      keyDown({ key: "=", altKey: true });
      expect(composerStore.currentContent).toBe("=SUM(A1)");
      composerStore.cancelEdition();
      selectCell(model, "B1");
      keyDown({ key: "=", altKey: true });
      expect(composerStore.currentContent).toBe("=SUM(A1)");
    });

    test("automatic sum does not open composer when multiple zones are summed", () => {
      setCellContent(model, "A1", "2");
      setCellContent(model, "B1", "2");
      setSelection(model, ["A2:B2"]);

      keyDown({ key: "=", altKey: true });
      expect(composerStore.editionMode).toBe("inactive");
      expect(getCellText(model, "A2")).toBe("=SUM(A1)");
      expect(getCellText(model, "B2")).toBe("=SUM(B1)");
    });

    test("automatic sum does not open composer with column full of data", () => {
      setCellContent(model, "A1", "2");
      setCellContent(model, "A2", "2");
      setSelection(model, ["A1:A2"]);

      keyDown({ key: "=", altKey: true });
      expect(composerStore.editionMode).toBe("inactive");
      expect(getCellText(model, "A3")).toBe("=SUM(A1:A2)");
    });

    test("automatic sum opens composer if selection is one cell even if it's not empty", () => {
      setCellContent(model, "A2", "2");
      selectCell(model, "A2");
      keyDown({ key: "=", altKey: true });
      expect(composerStore.editionMode).toBe("selecting");
      expect(composerStore.currentContent).toBe("=SUM()");
    });

    test("automatic sum opens composer if selection is one merge even if it's not empty", () => {
      setCellContent(model, "A2", "2");
      merge(model, "A2:A3");
      selectCell(model, "A2");
      keyDown({ key: "=", altKey: true });
      expect(composerStore.editionMode).toBe("selecting");
      expect(composerStore.currentContent).toBe("=SUM()");
    });

    test("Pressing CTRL+HOME moves you to first visible top-left cell", () => {
      keyDown({ key: "Home", ctrlKey: true });
      expect(model.getters.getSelectedZone()).toEqual(toZone("A1"));
      hideRows(model, [0]);
      keyDown({ key: "Home", ctrlKey: true });
      expect(model.getters.getSelectedZone()).toEqual(toZone("A2"));
    });
    test("Pressing CTRL+END moves you to last visible top-left cell", () => {
      keyDown({ key: "End", ctrlKey: true });
      expect(model.getters.getSelectedZone()).toEqual(toZone("Z100"));
      hideColumns(model, ["Z", "Y"]);
      keyDown({ key: "End", ctrlKey: true });
      expect(model.getters.getSelectedZone()).toEqual(toZone("X100"));
    });

    test("Pressing Ctrl+Space selects the columns of the selection", () => {
      setSelection(model, ["A1:C2"]);
      keyDown({ key: " ", ctrlKey: true });
      expect(model.getters.getSelectedZone()).toEqual(toZone("A1:C100"));
    });

    test("Pressing Shift+Space selects the rows of the selection", () => {
      setSelection(model, ["A1:C2"]);
      keyDown({ key: " ", shiftKey: true });
      expect(model.getters.getSelectedZone()).toEqual(toZone("A1:Z2"));
    });

    test("Pressing Ctrl+Shift+Space selects the whole sheet", () => {
      keyDown({
        key: " ",
        ctrlKey: true,
        shiftKey: true,
      });
      expect(model.getters.getSelectedZone()).toEqual(toZone("A1:Z100"));
    });

    test("Pressing CTRL+ALT+= when a column is selected inserts a column left", () => {
      const activeSheetId = model.getters.getActiveSheetId();
      const numOfCols = model.getters.getNumberCols(activeSheetId);
      setCellContent(model, "A1", "hello");
      selectColumn(model, 0, "overrideSelection");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", ctrlKey: true, altKey: true, bubbles: true })
      );
      expect(model.getters.getNumberCols(activeSheetId)).toEqual(numOfCols + 1);
      expect(getSelectionAnchorCellXc(model)).toBe("B1");
      expect(getCellContent(model, "A1")).toBe("");
      expect(getCellContent(model, "B1")).toBe("hello");
    });

    test("Pressing CTRL+ALT+= when multiple columns are selected as one group inserts the same number of columns left", () => {
      const activeSheetId = model.getters.getActiveSheetId();
      const numOfCols = model.getters.getNumberCols(activeSheetId);
      setCellContent(model, "A1", "hello");
      selectColumn(model, 0, "overrideSelection");
      selectColumn(model, 1, "updateAnchor");
      selectColumn(model, 2, "updateAnchor");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", ctrlKey: true, altKey: true, bubbles: true })
      );
      expect(model.getters.getNumberCols(activeSheetId)).toEqual(numOfCols + 3);
      expect(getSelectionAnchorCellXc(model)).toBe("D1");
      expect(getCellContent(model, "A1")).toBe("");
      expect(getCellContent(model, "D1")).toBe("hello");
    });

    test("Pressing CTRL+ALT+= when multiple columns are selected as multiple groups won't insert columns left", () => {
      const activeSheetId = model.getters.getActiveSheetId();
      const numOfCols = model.getters.getNumberCols(activeSheetId);
      setCellContent(model, "A1", "hello");
      selectColumn(model, 0, "overrideSelection");
      selectColumn(model, 1, "newAnchor");
      selectColumn(model, 2, "newAnchor");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", ctrlKey: true, altKey: true, bubbles: true })
      );
      expect(model.getters.getNumberCols(activeSheetId)).toEqual(numOfCols);
    });

    test("Pressing CTRL+ALT+= when a row is selected inserts a row above", () => {
      const activeSheetId = model.getters.getActiveSheetId();
      const numOfRows = model.getters.getNumberRows(activeSheetId);
      setCellContent(model, "A1", "hello");
      selectRow(model, 0, "overrideSelection");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", ctrlKey: true, altKey: true, bubbles: true })
      );
      expect(model.getters.getNumberRows(activeSheetId)).toEqual(numOfRows + 1);
      expect(getSelectionAnchorCellXc(model)).toBe("A2");
      expect(getCellContent(model, "A1")).toBe("");
      expect(getCellContent(model, "A2")).toBe("hello");
    });

    test("Pressing CTRL+ALT+= when multiple rows are selected as one group inserts the same number of rows above", () => {
      const activeSheetId = model.getters.getActiveSheetId();
      const numOfRows = model.getters.getNumberRows(activeSheetId);
      setCellContent(model, "A1", "hello");
      selectRow(model, 0, "overrideSelection");
      selectRow(model, 1, "updateAnchor");
      selectRow(model, 2, "updateAnchor");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", ctrlKey: true, altKey: true, bubbles: true })
      );
      expect(model.getters.getNumberRows(activeSheetId)).toEqual(numOfRows + 3);
      expect(getSelectionAnchorCellXc(model)).toBe("A4");
      expect(getCellContent(model, "A1")).toBe("");
      expect(getCellContent(model, "A4")).toBe("hello");
    });

    test("Pressing CTRL+ALT+= when multiple rows are selected as multiple groups won't insert rows above", () => {
      const activeSheetId = model.getters.getActiveSheetId();
      const numOfRows = model.getters.getNumberRows(activeSheetId);
      setCellContent(model, "A1", "hello");
      selectRow(model, 0, "overrideSelection");
      selectRow(model, 1, "newAnchor");
      selectRow(model, 2, "newAnchor");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", ctrlKey: true, altKey: true, bubbles: true })
      );
      expect(model.getters.getNumberRows(activeSheetId)).toEqual(numOfRows);
    });

    test("Pressing CTRL+ALT+= when both row(s) and column(s) are selected will not work", () => {
      const activeSheetId = model.getters.getActiveSheetId();
      const numOfRows = model.getters.getNumberRows(activeSheetId);
      const numOfCols = model.getters.getNumberCols(activeSheetId);
      setCellContent(model, "A1", "hello");
      selectRow(model, 0, "overrideSelection");
      selectColumn(model, 2, "newAnchor");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "=", ctrlKey: true, altKey: true, bubbles: true })
      );
      expect(model.getters.getNumberRows(activeSheetId)).toEqual(numOfRows);
      expect(model.getters.getNumberCols(activeSheetId)).toEqual(numOfCols);
      expect(getSelectionAnchorCellXc(model)).toBe("C1");
      expect(getCellContent(model, "A1")).toBe("hello");
    });

    test("Pressing CTRL+ALT+- when a column is selected deletes this column", () => {
      const activeSheetId = model.getters.getActiveSheetId();
      const numOfCols = model.getters.getNumberCols(activeSheetId);
      setCellContent(model, "A1", "hello1");
      setCellContent(model, "B1", "hello2");
      setCellContent(model, "C1", "hello3");
      selectColumn(model, 1, "overrideSelection");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "-", ctrlKey: true, altKey: true, bubbles: true })
      );
      expect(model.getters.getNumberCols(activeSheetId)).toEqual(numOfCols - 1);
      expect(getCellContent(model, "A1")).toBe("hello1");
      expect(getCellContent(model, "B1")).toBe("hello3");
    });

    test("Pressing CTRL+ALT+- when multiple columns are selected deletes these column", () => {
      const activeSheetId = model.getters.getActiveSheetId();
      const numOfCols = model.getters.getNumberCols(activeSheetId);
      setCellContent(model, "A1", "hello1");
      setCellContent(model, "B1", "hello2");
      setCellContent(model, "C1", "hello3");
      selectColumn(model, 0, "overrideSelection");
      selectColumn(model, 2, "newAnchor");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "-", ctrlKey: true, altKey: true, bubbles: true })
      );
      expect(model.getters.getNumberCols(activeSheetId)).toEqual(numOfCols - 2);
      expect(getCellContent(model, "A1")).toBe("hello2");
    });

    test("Pressing CTRL+ALT+- when a row is selected deletes this row", () => {
      const activeSheetId = model.getters.getActiveSheetId();
      const numOfRows = model.getters.getNumberRows(activeSheetId);
      setCellContent(model, "A1", "hello1");
      setCellContent(model, "A2", "hello2");
      setCellContent(model, "A3", "hello3");
      selectRow(model, 1, "overrideSelection");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "-", ctrlKey: true, altKey: true, bubbles: true })
      );
      expect(model.getters.getNumberRows(activeSheetId)).toEqual(numOfRows - 1);
      expect(getCellContent(model, "A1")).toBe("hello1");
      expect(getCellContent(model, "A2")).toBe("hello3");
    });

    test("Pressing CTRL+ALT+- when multiple rows are selected deletes these rows", () => {
      const activeSheetId = model.getters.getActiveSheetId();
      const numOfRows = model.getters.getNumberRows(activeSheetId);
      setCellContent(model, "A1", "hello1");
      setCellContent(model, "A2", "hello2");
      setCellContent(model, "A3", "hello3");
      selectRow(model, 0, "overrideSelection");
      selectRow(model, 2, "newAnchor");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "-", ctrlKey: true, altKey: true, bubbles: true })
      );
      expect(model.getters.getNumberRows(activeSheetId)).toEqual(numOfRows - 2);
      expect(getCellContent(model, "A1")).toBe("hello2");
    });

    test("Pressing CTRL+ALT+- when both row(s) and column(s) are selected will not work", () => {
      const activeSheetId = model.getters.getActiveSheetId();
      const numOfRows = model.getters.getNumberRows(activeSheetId);
      const numOfCols = model.getters.getNumberCols(activeSheetId);
      setCellContent(model, "A1", "hello");
      selectRow(model, 0, "overrideSelection");
      selectColumn(model, 2, "newAnchor");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "-", ctrlKey: true, altKey: true, bubbles: true })
      );
      expect(model.getters.getNumberRows(activeSheetId)).toEqual(numOfRows);
      expect(model.getters.getNumberCols(activeSheetId)).toEqual(numOfCols);
      expect(getSelectionAnchorCellXc(model)).toBe("C1");
      expect(getCellContent(model, "A1")).toBe("hello");
    });

    test("Pressing Shift+PageDown activates the next sheet", () => {
      const sheetId = model.getters.getActiveSheetId();
      createSheet(model, { sheetId: "second", activate: true });
      createSheet(model, { sheetId: "third", position: 2 });

      expect(model.getters.getActiveSheetId()).toBe("second");
      keyDown({ key: "PageDown", shiftKey: true });
      expect(model.getters.getActiveSheetId()).toBe("third");
      keyDown({ key: "PageDown", shiftKey: true });
      expect(model.getters.getActiveSheetId()).toBe(sheetId);
    });
    test("Pressing Shift+PageUp activates the previous sheet", () => {
      const sheetId = model.getters.getActiveSheetId();
      createSheet(model, { sheetId: "second", activate: true });
      createSheet(model, { sheetId: "third", position: 2 });

      expect(model.getters.getActiveSheetId()).toBe("second");
      keyDown({ key: "PageUp", shiftKey: true });
      expect(model.getters.getActiveSheetId()).toBe(sheetId);
      keyDown({ key: "PageUp", shiftKey: true });
      expect(model.getters.getActiveSheetId()).toBe("third");
    });

    test("Pressing Shift+F11 insert a new sheet", () => {
      expect(model.getters.getSheetIds()).toHaveLength(1);
      keyDown({ key: "F11", shiftKey: true });
      const sheetIds = model.getters.getSheetIds();
      expect(sheetIds).toHaveLength(2);
      expect(model.getters.getActiveSheetId()).toBe(sheetIds[1]);
    });

    test("pressing Ctrl+K opens the link editor", async () => {
      await keyDown({ key: "k", ctrlKey: true });
      expect(fixture.querySelector(".o-link-editor")).not.toBeNull();
    });

    test("Filter icon is correctly rendered", () => {
      createTableWithFilter(model, "B2:C3");

      const y = DEFAULT_CELL_HEIGHT + 1 + MIN_CELL_TEXT_MARGIN + HEADER_HEIGHT; // +1 to skip grid lines
      const leftB =
        DEFAULT_CELL_WIDTH * 2 - GRID_ICON_EDGE_LENGTH - GRID_ICON_MARGIN + HEADER_WIDTH;
      const leftC =
        DEFAULT_CELL_WIDTH * 3 - GRID_ICON_EDGE_LENGTH - GRID_ICON_MARGIN + HEADER_WIDTH;

      const iconB = getCellIcons(model, "B2")[0];
      const rectB = model.getters.getCellIconRect(iconB, model.getters.getRect(toZone("B2")));
      expect(rectB).toMatchObject({ y, x: leftB });
      const iconC = getCellIcons(model, "C2")[0];
      const rectC = model.getters.getCellIconRect(iconC, model.getters.getRect(toZone("C2")));
      expect(rectC).toMatchObject({ y, x: leftC });
    });

    test("Filter icon changes when filter is active", () => {
      const activeFilterSVG = getDataFilterIcon(true, true, false);
      const inactiveFilterSVG = getDataFilterIcon(false, true, false);
      createTableWithFilter(model, "A1:A2");
      const sheetId = model.getters.getActiveSheetId();
      expect(getCellIcons(model, "A1")[0].svg).toEqual(inactiveFilterSVG);

      updateFilter(model, "A1", ["5"]);
      expect(model.getters.isFilterActive({ sheetId, ...toCartesian("A1") })).toBeTruthy();
      expect(getCellIcons(model, "A1")[0].svg).toEqual(activeFilterSVG);
    });

    test("Filter icon changes color on high contrast background", () => {
      createTableWithFilter(model, "A1:A2");
      updateTableConfig(model, "A1", { styleId: "None" });
      let icon = getCellIcons(model, "A1")[0];
      expect(icon?.svg?.paths[0].fillColor).toBe(FILTERS_COLOR);

      updateTableConfig(model, "A1", { styleId: "TableStyleLight8" });
      icon = getCellIcons(model, "A1")[0];
      expect(icon?.svg?.paths[0].fillColor).toBe("#defade");

      setStyle(model, "A1", { fillColor: "#fff" });
      icon = getCellIcons(model, "A1")[0];
      expect(icon?.svg?.paths[0].fillColor).toBe(FILTERS_COLOR);
    });

    test("Clicking on a filter icon correctly open context menu", async () => {
      createTableWithFilter(model, "A1:A2");
      await nextTick();
      await clickGridIcon(model, "A1");
      expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(1);
    });
  });

  describe("Grid Scroll", () => {
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

    test("A1 is not set as hovered by default when opening the spreadsheet without mouse events", async () => {
      setCellContent(model, "A1", "=1/0");
      jest.advanceTimersByTime(400);
      await nextTick();
      expect(fixture.querySelector(".o-error-tooltip")).toBeNull();
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
      const cellPopovers = env.getStore(CellPopoverStore);
      cellPopovers.open({ col: 0, row: 0 }, "LinkEditor");
      await nextTick();
      expect(fixture.querySelector(".o-link-editor")).not.toBeNull();
      await scrollGrid({ deltaY: DEFAULT_CELL_HEIGHT });
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.isVisibleInViewport({ sheetId, col: 0, row: 0 })).toBe(false);
      expect(fixture.querySelector(".o-link-editor")).toBeNull();
    });

    test("Scrolling the grid don't remove persistent popovers if the cell is inside the viewport", async () => {
      const cellPopovers = env.getStore(CellPopoverStore);
      cellPopovers.open({ col: 0, row: 0 }, "LinkEditor");
      await nextTick();
      expect(fixture.querySelector(".o-link-editor")).not.toBeNull();
      await scrollGrid({ deltaY: DEFAULT_CELL_HEIGHT - 5 });
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.isVisibleInViewport({ sheetId, col: 0, row: 0 })).toBe(true);
      expect(fixture.querySelector(".o-link-editor")).not.toBeNull();
    });
  });

  describe("paint format tool with grid selection", () => {
    let paintFormatStore: Store<PaintFormatStore>;
    let highlightStore: Store<HighlightStore>;

    beforeEach(() => {
      paintFormatStore = env.getStore(PaintFormatStore);
      highlightStore = env.getStore(HighlightStore);
    });

    test("can paste format and borders with mouse once", async () => {
      setCellContent(model, "B2", "b2");
      selectCell(model, "B2");
      setStyle(model, "B2", { bold: true });
      setBorders(model, "B2", { top: DEFAULT_BORDER_DESC });
      paintFormatStore.activate({ persistent: false });
      gridMouseEvent(model, "pointerdown", "C8");
      expect(getCell(model, "C8")).toBeUndefined();
      gridMouseEvent(model, "pointerup", "C8");
      expect(getCellStyle(model, "C8")).toEqual({ bold: true });
      expect(getBorder(model, "C8")).toEqual({ top: DEFAULT_BORDER_DESC });

      gridMouseEvent(model, "pointerdown", "D8");
      expect(getCell(model, "D8")).toBeUndefined();
      gridMouseEvent(model, "pointerup", "D8");
      expect(getCell(model, "D8")).toBeUndefined();
    });

    test("Paste format works with table style", () => {
      createTableWithFilter(model, "A1:B2", { styleId: "TableStyleLight11" });
      selectCell(model, "A1");
      paintFormatStore.activate({ persistent: false });
      gridMouseEvent(model, "pointerdown", "C8");
      gridMouseEvent(model, "pointerup", "C8");

      expect(getCellStyle(model, "C8")).toMatchObject({ fillColor: "#748747" });
    });

    test("Paste format works with conditional format", () => {
      const sheetId = model.getters.getActiveSheetId();
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF("1", { fillColor: "#0000FF" }, "cf2"),
        sheetId,
        ranges: toRangesData(sheetId, "A1"),
      });
      selectCell(model, "A1");
      paintFormatStore.activate({ persistent: false });
      gridMouseEvent(model, "pointerdown", "C8");
      gridMouseEvent(model, "pointerup", "C8");

      expect(model.getters.getConditionalFormats(sheetId)[0].ranges).toEqual(["A1", "C8"]);
    });

    test("Pasting format from merged cells applies merge and updates selection", () => {
      const sheetId = model.getters.getActiveSheetId();
      merge(model, "B1:B3");
      setSelection(model, ["B1:B3"]);

      expect(model.getters.getMerges(sheetId)).toMatchObject([toZone("B1:B3")]);
      expect(model.getters.getSelectedZones()).toMatchObject([toZone("B1:B3")]);

      paintFormatStore.activate({ persistent: false });

      gridMouseEvent(model, "pointerdown", "A1");
      gridMouseEvent(model, "pointerup", "A1");

      expect(model.getters.getSelectedZones()).toMatchObject([toZone("A1:A3")]);
      expect(model.getters.getMerges(sheetId)).toMatchObject([toZone("B1:B3"), toZone("A1:A3")]);
    });

    test("can keep the paint format mode persistently", async () => {
      setCellContent(model, "B2", "b2");
      selectCell(model, "B2");
      setStyle(model, "B2", { bold: true });
      paintFormatStore.activate({ persistent: true });
      gridMouseEvent(model, "pointerdown", "C8");
      expect(getCell(model, "C8")).toBeUndefined();
      gridMouseEvent(model, "pointerup", "C8");
      expect(getCellStyle(model, "C8")).toEqual({ bold: true });

      gridMouseEvent(model, "pointerdown", "D8");
      expect(getCell(model, "D8")).toBeUndefined();
      gridMouseEvent(model, "pointerup", "D8");
      expect(getCellStyle(model, "D8")).toEqual({ bold: true });
    });

    test("can paste format with key", async () => {
      setCellContent(model, "B2", "b2");
      selectCell(model, "B2");
      setStyle(model, "B2", { bold: true });
      paintFormatStore.activate({ persistent: false });
      expect(getCell(model, "C2")).toBeUndefined();
      keyDown({ key: "ArrowRight" });
      expect(getCellStyle(model, "C2")).toEqual({ bold: true });
    });

    test("can exit the paint format mode via ESC key", async () => {
      setCellContent(model, "B2", "b2");
      selectCell(model, "B2");
      setStyle(model, "B2", { bold: true });
      paintFormatStore.activate({ persistent: false });
      keyDown({ key: "Escape" });
      gridMouseEvent(model, "pointerdown", "C8");
      expect(getCell(model, "C8")).toBeUndefined();
      gridMouseEvent(model, "pointerup", "C8");
      expect(getCell(model, "C8")).toBeUndefined();
    });

    test("in persistent mode, updating the style of origin cell won't change the copied style", async () => {
      setCellContent(model, "B2", "b2");
      selectCell(model, "B2");
      setStyle(model, "B2", { bold: true });
      paintFormatStore.activate({ persistent: true });
      setStyle(model, "B2", { bold: false });

      gridMouseEvent(model, "pointerdown", "D8");
      expect(getCell(model, "D8")).toBeUndefined();
      gridMouseEvent(model, "pointerup", "D8");
      expect(getCellStyle(model, "D8")).toEqual({ bold: true });
    });

    test("zone to paint is highlighted", async () => {
      selectCell(model, "B2");
      paintFormatStore.activate({ persistent: false });
      expect(highlightStore.highlights.map(flattenHighlightRange)).toMatchObject([
        { zone: toZone("B2") },
      ]);

      paintFormatStore.cancel();
      expect(highlightStore.highlights).toEqual([]);
    });

    test("paint format does not destroy clipboard content", async () => {
      setCellContent(model, "A1", "hello");
      setStyle(model, "A1", { bold: true });
      copy(model, "A1");

      const clipboardContent = await model.getters.getClipboardTextAndImageContent();
      paintFormatStore.activate({ persistent: false });
      expect(await model.getters.getClipboardTextAndImageContent()).toEqual(clipboardContent);
    });

    test("can paint format after a cut", async () => {
      setCellContent(model, "B2", "b2");
      cut(model, "A1");
      selectCell(model, "B2");
      setStyle(model, "B2", { bold: true });
      paintFormatStore.activate({ persistent: false });
      expect(model.getters.isCutOperation());

      gridMouseEvent(model, "pointerdown", "D8");
      gridMouseEvent(model, "pointerup", "D8");
      expect(getCellStyle(model, "D8")).toEqual({ bold: true });
    });

    test("Paint format does a single history step", async () => {
      selectCell(model, "B2");
      setStyle(model, "B2", { bold: true });
      setBorders(model, "B2", { top: DEFAULT_BORDER_DESC });

      paintFormatStore.activate({ persistent: false });
      gridMouseEvent(model, "pointerdown", "D8");
      gridMouseEvent(model, "pointerup", "D8");

      expect(getStyle(model, "D8")).toEqual({ bold: true });
      expect(getBorder(model, "D8")).toEqual({ top: DEFAULT_BORDER_DESC });

      undo(model);
      expect(getStyle(model, "D8")).toEqual({});
      expect(getBorder(model, "D8")).toEqual(null);
    });
  });

  test("closing contextmenu focuses the grid", async () => {
    await rightClickCell(model, "B2");
    await simulateClick(".o-menu div[data-name='add_row_before']");
    expect(fixture.querySelector(".o-menu div[data-name='add_row_before']")).toBeFalsy();
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer"));
  });

  test("Duplicating sheet in the bottom bar focus the grid afterward", async () => {
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer"));

    // open and close sheet context menu
    await simulateClick(".o-spreadsheet-bottom-bar .o-all-sheets .o-sheet .o-icon");
    await simulateClick(".o-menu-item[title='Duplicate']");

    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer"));
  });

  test("Can open context menu with a keyboard input ", async () => {
    const mockGridPosition = {
      x: 40,
      y: 40,
      width: 1000 + HEADER_WIDTH,
      height: 1000 + HEADER_HEIGHT,
    };
    extendMockGetBoundingClientRect({
      "o-grid": () => mockGridPosition,
    });
    const selector = ".o-grid div.o-composer";
    const target = document.querySelector(selector)! as HTMLElement;
    target.focus();
    triggerMouseEvent(selector, "contextmenu", 0, 0, { button: 1, bubbles: true });
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeTruthy();
    const popover = fixture.querySelector<HTMLElement>(".o-popover")!;
    expect(parseInt(popover.style.left)).toBe(
      mockGridPosition.x + HEADER_WIDTH + DEFAULT_CELL_WIDTH
    );
    expect(parseInt(popover.style.top)).toBe(mockGridPosition.y + HEADER_HEIGHT);
  });

  test("Mac user use metaKey, not CtrlKey", async () => {
    const mockUserAgent = jest.spyOn(navigator, "userAgent", "get");
    mockUserAgent.mockImplementation(
      () => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0"
    );
    await keyDown({ key: "A", ctrlKey: true, bubbles: true });
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1"));
    await nextTick();
    await keyDown({ key: "A", metaKey: true, bubbles: true });
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1:Z100"));
    mockUserAgent.mockRestore();
  });

  test("Hovering an interactive icon changes the cursor", async () => {
    setCellContent(model, "A1", "5");
    addIconCF(model, "A1", ["3", "7"], "arrows");
    createTableWithFilter(model, "B1:B2");
    const overlay = fixture.querySelector<HTMLElement>(".o-grid-overlay")!;
    expect(overlay!.style.cursor).toBe("default");

    await hoverGridIcon(model, "B1");
    expect(overlay.style.cursor).toBe("pointer");

    await hoverGridIcon(model, "A1");
    expect(overlay.style.cursor).toBe("default");
  });
});

describe("Multi User selection", () => {
  let transportService: TransportService;
  beforeEach(async () => {
    transportService = new MockTransportService();

    model = new Model({}, { transportService });
    ({ parent, fixture, env } = await mountSpreadsheet({ model }));
  });

  test("Render collaborative user when hovering the position", async () => {
    const sheetId = model.getters.getActiveSheetId();
    transportService.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: { id: "david", name: "David", position: { sheetId, col: 1, row: 1 } },
    });
    await nextTick();
    expect(fixture.querySelector(".o-client-tag")).toBeNull();
    await hoverCell(model, "B2", 400);
    expect(document.querySelectorAll(".o-client-tag")).toHaveLength(1);
    expect(document.querySelector(".o-client-tag")?.textContent).toBe("David");
  });

  test("Do not render multi user selection with invalid sheet", async () => {
    transportService.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: { id: "david", name: "David", position: { sheetId: "invalid", col: 1, row: 1 } },
    });
    await nextTick();
    await hoverCell(model, "B2", 400);
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

  test("Render collaborative user when user is focused", async () => {
    const sheetId = model.getters.getActiveSheetId();
    const clientFocusStore = env.getStore(ClientFocusStore);
    clientFocusStore.focusClient("david");
    transportService.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: { id: "david", name: "David", position: { sheetId, col: 1, row: 1 } },
    });
    await nextTick();
    expect(document.querySelectorAll(".o-client-tag")).toHaveLength(1);
    expect(document.querySelector(".o-client-tag")?.textContent).toBe("David");
  });

  test("Jump to client switch to correct sheet", async () => {
    jest.useFakeTimers();
    const clientFocusStore = env.getStore(ClientFocusStore);
    createSheet(model, { sheetId: "AliceSheet", name: "Alice Sheet", position: 1 });
    createSheet(model, { sheetId: "BobSheet", name: "Bob Sheet", position: 2 });

    transportService.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: { id: "alice", name: "Alice", position: { sheetId: "AliceSheet", col: 5, row: 5 } },
    });

    transportService.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: { id: "bob", name: "Bob", position: { sheetId: "BobSheet", col: 20, row: 20 } },
    });

    clientFocusStore.jumpToClient("alice");
    await nextTick();

    expect(clientFocusStore.focusedClients).toContain("alice");
    expect(model.getters.getActiveSheetId()).toBe("AliceSheet");

    jest.advanceTimersByTime(3000 + 100);
    expect(clientFocusStore.focusedClients).not.toContain("alice");

    clientFocusStore.jumpToClient("bob");
    await nextTick();

    expect(clientFocusStore.focusedClients).toContain("bob");
    expect(model.getters.getActiveSheetId()).toBe("BobSheet");

    jest.advanceTimersByTime(3000 + 100);
    expect(clientFocusStore.focusedClients).not.toContain("bob");
  });

  test("Render collaborative user with commands", async () => {
    jest.useFakeTimers();
    const sheetId = model.getters.getActiveSheetId();
    const clientFocusStore = env.getStore(ClientFocusStore);
    transportService.sendMessage({
      type: "CLIENT_JOINED",
      version: MESSAGE_VERSION,
      client: { id: "david", name: "David", position: { sheetId, col: 1, row: 1 } },
    });

    clientFocusStore.showClientTag();
    await nextTick();
    expect(document.querySelectorAll(".o-client-tag")).toHaveLength(1);
    expect(document.querySelector(".o-client-tag")?.textContent).toBe("David");

    clientFocusStore.hideClientTag();
    await nextTick();
    expect(document.querySelectorAll(".o-client-tag")).toHaveLength(0);
  });
});

describe("Events on Grid update viewport correctly", () => {
  beforeEach(async () => {
    ({ parent, model, fixture } = await mountSpreadsheet());
  });

  test("Vertical scroll", async () => {
    triggerWheelEvent(".o-grid", { deltaY: 1200 });
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 52,
      bottom: 94,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: 1200,
    });
  });
  test("Horizontal scroll", async () => {
    triggerWheelEvent(".o-grid", { deltaY: 200, shiftKey: true });
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 2,
      right: 12,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 200,
      scrollY: 0,
    });
  });
  test("Move selection with keyboard", async () => {
    await clickCell(model, "I1");
    expect(getSelectionAnchorCellXc(model)).toBe("I1");
    const viewport = model.getters.getActiveMainViewport();
    keyDown({ key: "ArrowRight" });
    expect(getSelectionAnchorCellXc(model)).toBe("J1");
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    keyDown({ key: "ArrowRight" });
    expect(getSelectionAnchorCellXc(model)).toBe("K1");

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      ...viewport,
      // the viewport snapped to display K1 entirely
      left: 0,
      right: 10,
    });
    const sheetDim = model.getters.getSheetViewDimension();
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 11 * DEFAULT_CELL_WIDTH - sheetDim.width,
    });
  });
  test("Move selection horizontally (left to right) through pane division resets the scroll", async () => {
    freezeColumns(model, 3);
    triggerWheelEvent(document.activeElement!, { deltaY: 4 * DEFAULT_CELL_WIDTH, shiftKey: true });

    await clickCell(model, "C1");
    expect(model.getters.getActiveMainViewport().left).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toEqual(4 * DEFAULT_CELL_WIDTH);
    keyDown({ key: "ArrowRight", shiftKey: false });
    expect(model.getters.getSelectedZone()).toEqual(toZone("D1"));
    expect(model.getters.getActiveMainViewport().left).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toEqual(0);
  });

  test("Move selection horizontally (right to left) through pane division does not reset the scroll", async () => {
    freezeColumns(model, 3);
    triggerWheelEvent(document.activeElement!, { deltaY: 4 * DEFAULT_CELL_WIDTH, shiftKey: true });
    await clickCell(model, "H1");
    expect(model.getters.getSelectedZone()).toEqual(toZone("H1"));

    expect(model.getters.getActiveMainViewport().left).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toEqual(4 * DEFAULT_CELL_WIDTH);
    keyDown({ key: "ArrowLeft", shiftKey: false });
    expect(model.getters.getSelectedZone()).toEqual(toZone("G1"));
    expect(model.getters.getActiveMainViewport().left).toEqual(6);
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toEqual(3 * DEFAULT_CELL_WIDTH);
    triggerWheelEvent(document.activeElement!, { deltaY: -4 * DEFAULT_CELL_WIDTH, shiftKey: true });
    await clickCell(model, "D1");
    keyDown({ key: "ArrowLeft", shiftKey: false });
    expect(model.getters.getSelectedZone()).toEqual(toZone("C1"));
    expect(model.getters.getActiveMainViewport().left).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toEqual(0);
  });

  test("Move selection vertically (top to bottom) through pane division resets the scroll", async () => {
    freezeRows(model, 3);
    triggerWheelEvent(document.activeElement!, { deltaY: 4 * DEFAULT_CELL_HEIGHT });
    await clickCell(model, "A3");
    expect(model.getters.getActiveMainViewport().top).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toEqual(4 * DEFAULT_CELL_HEIGHT);
    keyDown({ key: "ArrowDown", shiftKey: false });
    expect(model.getters.getSelectedZone()).toEqual(toZone("A4"));
    expect(model.getters.getActiveMainViewport().top).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toEqual(0);
  });

  test("Move selection vertically (bottom to top) through pane division does not reset the scroll", async () => {
    freezeRows(model, 3);
    triggerWheelEvent(document.activeElement!, { deltaY: 4 * DEFAULT_CELL_HEIGHT });
    await clickCell(model, "A8");
    expect(model.getters.getActiveMainViewport().top).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toEqual(4 * DEFAULT_CELL_HEIGHT);
    keyDown({ key: "ArrowUp", shiftKey: false });
    expect(model.getters.getSelectedZone()).toEqual(toZone("A7"));
    expect(model.getters.getActiveMainViewport().top).toEqual(6);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toEqual(3 * DEFAULT_CELL_HEIGHT);
    triggerWheelEvent(document.activeElement!, { deltaY: -4 * DEFAULT_CELL_HEIGHT });
    await clickCell(model, "A4");
    keyDown({ key: "ArrowUp", shiftKey: false });
    expect(model.getters.getSelectedZone()).toEqual(toZone("A3"));
    expect(model.getters.getActiveMainViewport().top).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toEqual(0);
  });

  test("Alter selection with keyboard", async () => {
    await clickCell(model, "I1");
    expect(getSelectionAnchorCellXc(model)).toBe("I1");
    const viewport = model.getters.getActiveMainViewport();
    keyDown({ key: "ArrowRight", shiftKey: true });
    expect(model.getters.getSelectedZone()).toEqual(toZone("I1:J1"));
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    keyDown({ key: "ArrowRight", shiftKey: true });
    expect(model.getters.getSelectedZone()).toEqual(toZone("I1:K1"));
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      ...viewport,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 71,
    });
  });

  test("Alter selection horizontally (left to right) through pane division resets the scroll", async () => {
    freezeColumns(model, 3);
    triggerWheelEvent(document.activeElement!, { deltaY: 4 * DEFAULT_CELL_WIDTH, shiftKey: true });
    await clickCell(model, "C1");
    expect(model.getters.getActiveMainViewport().left).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toEqual(4 * DEFAULT_CELL_WIDTH);
    keyDown({ key: "ArrowRight", shiftKey: true });
    expect(model.getters.getSelectedZone()).toEqual(toZone("C1:D1"));
    expect(model.getters.getActiveMainViewport().left).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toEqual(0);
  });

  test("Alter selection horizontally (right to left) through pane division does not reset the scroll", async () => {
    freezeColumns(model, 3);
    triggerWheelEvent(document.activeElement!, { deltaY: 4 * DEFAULT_CELL_WIDTH, shiftKey: true });
    await clickCell(model, "H1");
    expect(model.getters.getActiveMainViewport().left).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toEqual(4 * DEFAULT_CELL_WIDTH);
    keyDown({ key: "ArrowLeft", shiftKey: true });
    expect(model.getters.getSelectedZone()).toEqual(toZone("G1:H1"));
    expect(model.getters.getActiveMainViewport().left).toEqual(6);
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toEqual(3 * DEFAULT_CELL_WIDTH);
    triggerWheelEvent(document.activeElement!, { deltaY: -4 * DEFAULT_CELL_WIDTH, shiftKey: true });
    await clickCell(model, "D1");
    keyDown({ key: "ArrowLeft", shiftKey: true });
    expect(model.getters.getSelectedZone()).toEqual(toZone("C1:D1"));
    expect(model.getters.getActiveMainViewport().left).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toEqual(0);
  });

  test("Alter selection vertically (top to bottom) through pane division resets the scroll", async () => {
    freezeRows(model, 3);
    triggerWheelEvent(document.activeElement!, { deltaY: 4 * DEFAULT_CELL_HEIGHT });
    await clickCell(model, "A3");
    expect(model.getters.getActiveMainViewport().top).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toEqual(4 * DEFAULT_CELL_HEIGHT);
    keyDown({ key: "ArrowDown", shiftKey: true });
    expect(model.getters.getSelectedZone()).toEqual(toZone("A3:A4"));
    expect(model.getters.getActiveMainViewport().top).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toEqual(0);
  });

  test("Alter selection vertically (bottom to to) through pane division does not reset the scroll", async () => {
    freezeRows(model, 3);
    triggerWheelEvent(document.activeElement!, { deltaY: 4 * DEFAULT_CELL_HEIGHT });
    await clickCell(model, "A8");
    expect(model.getters.getActiveMainViewport().top).toEqual(7);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toEqual(4 * DEFAULT_CELL_HEIGHT);
    keyDown({ key: "ArrowUp", shiftKey: true });
    expect(model.getters.getSelectedZone()).toEqual(toZone("A7:A8"));
    expect(model.getters.getActiveMainViewport().top).toEqual(6);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toEqual(3 * DEFAULT_CELL_HEIGHT);
    triggerWheelEvent(document.activeElement!, { deltaY: -4 * DEFAULT_CELL_HEIGHT });
    await clickCell(model, "A4");
    keyDown({ key: "ArrowUp", shiftKey: true });
    expect(model.getters.getSelectedZone()).toEqual(toZone("A3:A4"));
    expect(model.getters.getActiveMainViewport().top).toEqual(3);
    expect(model.getters.getActiveSheetScrollInfo().scrollY).toEqual(0);
  });

  test("Scroll viewport then alter selection with keyboard from penultimate cell to last cell does not shift viewport", async () => {
    await simulateClick(".o-grid-overlay"); // gain focus on grid element
    const { width } = model.getters.getMainViewportRect();
    const { width: viewportWidth } = model.getters.getSheetViewDimensionWithHeaders();
    triggerWheelEvent(document.activeElement!, { deltaY: width - viewportWidth, shiftKey: true });
    const viewport = model.getters.getActiveMainViewport();
    selectCell(model, "Y1");
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    await keyDown({ key: "ArrowRight", shiftKey: true });
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
  });

  test("A resize of the grid DOM element impacts the viewport", async () => {
    expect(model.getters.getSheetViewDimension()).toMatchObject({
      width: 1000 - SCROLLBAR_WIDTH,
      height: 1000 - SCROLLBAR_WIDTH,
    });
    // mock a resizing of the grid DOM element. can occur if resizing the browser or opening the sidePanel
    extendMockGetBoundingClientRect({
      "o-spreadsheet": () => ({ x: 0, y: 0, width: 800, height: 650 }),
      "o-grid": () => ({ x: 0, y: 0, width: 800, height: 650 }),
    });
    // force a triggering of all resizeObservers to ensure the grid is resized
    //@ts-ignore
    window.resizers.resize();
    await nextTick();

    expect(model.getters.getSheetViewDimension()).toMatchObject({
      width: 800 - HEADER_WIDTH - SCROLLBAR_WIDTH,
      height: 650 - HEADER_HEIGHT - SCROLLBAR_WIDTH,
    });
  });

  test("Scroll viewport then alter selection with mouse from penultimate cell to last cell does not shift viewport", async () => {
    await simulateClick(".o-grid-overlay"); // gain focus on grid element
    const { width } = model.getters.getMainViewportRect();
    const { width: viewportWidth } = model.getters.getSheetViewDimensionWithHeaders();
    triggerWheelEvent(document.activeElement!, {
      deltaY: width - viewportWidth + HEADER_WIDTH,
      shiftKey: true,
    });
    const viewport = model.getters.getActiveMainViewport();
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    await clickCell(model, "Y1", { shiftKey: true });
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
  });

  test("Partially scrolled (horizontally) cell becomes fully visible when selected with the keyboard", async () => {
    setViewportOffset(model, DEFAULT_CELL_WIDTH / 2, 0);
    await clickCell(model, "B1");
    await nextTick();
    expect(model.getters.getVisibleRect(toZone("A1"))).toMatchObject({
      x: HEADER_WIDTH,
      y: HEADER_HEIGHT,
      width: DEFAULT_CELL_WIDTH / 2,
      height: DEFAULT_CELL_HEIGHT,
    });
    await keyDown({ key: "ArrowLeft" });
    expect(model.getters.getVisibleRect(toZone("A1"))).toMatchObject({
      x: HEADER_WIDTH,
      y: HEADER_HEIGHT,
      width: DEFAULT_CELL_WIDTH,
      height: DEFAULT_CELL_HEIGHT,
    });
  });

  test("Partially scrolled (vertically) cell becomes fully visible when selected with the keyboard", async () => {
    const offset = Math.round(DEFAULT_CELL_HEIGHT / 2);
    setViewportOffset(model, 0, offset);
    await nextTick();
    await clickCell(model, "A2"); //++ cassé
    expect(model.getters.getSelectedZone()).toEqual(toZone("A2"));

    expect(model.getters.getVisibleRect(toZone("A1"))).toMatchObject({
      x: HEADER_WIDTH,
      y: HEADER_HEIGHT,
      width: DEFAULT_CELL_WIDTH,
      height: DEFAULT_CELL_HEIGHT - offset,
    });
    await keyDown({ key: "ArrowUp" });
    expect(model.getters.getVisibleRect(toZone("A1"))).toMatchObject({
      x: HEADER_WIDTH,
      y: HEADER_HEIGHT,
      width: DEFAULT_CELL_WIDTH,
      height: DEFAULT_CELL_HEIGHT,
    });
  });
});

describe("Edge-Scrolling on mouseMove in selection", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    ({ parent, model, fixture } = await mountSpreadsheet());
  });

  test("Can edge-scroll horizontally", async () => {
    const { width, height } = model.getters.getSheetViewDimension();
    const y = height / 2;
    triggerMouseEvent(".o-grid-overlay", "pointerdown", width / 2, y);
    triggerMouseEvent(".o-grid-overlay", "pointermove", 1.5 * width, y);
    const advanceTimer = edgeScrollDelay(0.5 * width, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-grid-overlay", "pointerup", 1.5 * width, y);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 6,
      right: 16,
      top: 0,
      bottom: 42,
    });

    triggerMouseEvent(".o-grid-overlay", "pointerdown", width / 2, y);
    triggerMouseEvent(".o-grid-overlay", "pointermove", -0.5 * width, y);
    const advanceTimer2 = edgeScrollDelay(0.5 * width, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-grid-overlay", "pointerup", -0.5 * width, y);

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
    triggerMouseEvent(".o-grid-overlay", "pointerdown", x, height / 2);
    triggerMouseEvent(".o-grid-overlay", "pointermove", x, 1.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * height, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-grid-overlay", "pointerup", x, 1.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 6,
      bottom: 48,
    });

    triggerMouseEvent(".o-grid-overlay", "pointerdown", x, height / 2);
    triggerMouseEvent(".o-grid-overlay", "pointermove", x, -0.5 * height);
    const advanceTimer2 = edgeScrollDelay(0.5 * height, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-grid-overlay", "pointerup", x, -0.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 3,
      bottom: 45,
    });
  });
});

describe("Copy paste keyboard shortcut", () => {
  let clipboardData: MockClipboardData;
  let sheetId: string;
  const fileStore = new FileStore();
  beforeEach(async () => {
    clipboardData = new MockClipboardData();
    ({ parent, model, fixture, env } = await mountSpreadsheet({
      model: new Model({}, { external: { fileStore } }),
    }));
    sheetId = model.getters.getActiveSheetId();
  });

  test("Default paste is prevented when handled by the grid", async () => {
    clipboardData.setText("Excalibur");
    const pasteEvent = getClipboardEvent("paste", clipboardData);
    document.body.dispatchEvent(pasteEvent);
    expect(pasteEvent.defaultPrevented).toBeTruthy();
  });

  test("Can paste from OS", async () => {
    clipboardData.setData(ClipboardMIMEType.PlainText, "Excalibur");
    selectCell(model, "A1");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    await nextTick();
    expect(getCellContent(model, "A1")).toEqual("Excalibur");
  });

  test("Can copy/paste cells", async () => {
    setCellContent(model, "A1", "things");
    selectCell(model, "A1");
    document.body.dispatchEvent(getClipboardEvent("copy", clipboardData));
    await nextTick();
    const clipboard = await parent.env.clipboard.read!();
    if (clipboard.status === "ok") {
      clipboardData.content = clipboard.content;
    }
    const clipboardContent = clipboardData.content;
    const cbPlugin = getPlugin(model, ClipboardPlugin);
    //@ts-ignore
    const clipboardHtmlData = JSON.stringify(cbPlugin.getSheetData());
    expect(clipboardContent).toMatchObject({
      "text/plain": "things",
      "text/html": `<div data-osheet-clipboard='${xmlEscape(clipboardHtmlData)}'>things</div>`,
    });
    selectCell(model, "A2");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    await nextTick();
    expect(getCellContent(model, "A2")).toEqual("things");
  });

  test("Can cut/paste cells", async () => {
    setCellContent(model, "A1", "things");
    selectCell(model, "A1");
    document.body.dispatchEvent(getClipboardEvent("cut", clipboardData));
    await nextTick();
    const clipboard = await parent.env.clipboard.read!();
    if (clipboard.status === "ok") {
      clipboardData.content = clipboard.content;
    }
    const clipboardContent = clipboardData.content;
    const cbPlugin = getPlugin(model, ClipboardPlugin);
    //@ts-ignore
    const clipboardHtmlData = JSON.stringify(cbPlugin.getSheetData());
    expect(clipboardContent).toMatchObject({
      "text/plain": "things",
      "text/html": `<div data-osheet-clipboard='${xmlEscape(clipboardHtmlData)}'>things</div>`,
    });
    selectCell(model, "A2");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    await nextTick();
    expect(getCellContent(model, "A1")).toEqual("");
    expect(getCellContent(model, "A2")).toEqual("things");
  });

  test("cut zone gets cleared on paste if content/style is altered after cut", async () => {
    setCellContent(model, "A1", "things");
    setStyle(model, "A1", { bold: true });
    selectCell(model, "A1");
    document.body.dispatchEvent(getClipboardEvent("cut", clipboardData));
    await nextTick();
    const clipboard = await parent.env.clipboard.read!();
    if (clipboard.status === "ok") {
      clipboardData.content = clipboard.content;
    }
    setCellContent(model, "A1", "new content");
    setStyle(model, "A1", { bold: false });
    selectCell(model, "A2");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    await nextTick();
    expect(getCellContent(model, "A2")).toEqual("things");
    expect(getStyle(model, "A2")).toEqual({ bold: true });
    expect(getCell(model, "A1")).toBe(undefined);
  });

  test("Cut of a formula cell, and enabling showFormulas should return content", async () => {
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    setCellContent(model, "A1", "1");
    setCellFormat(model, "A1", "m/d/yyyy");
    document.body.dispatchEvent(getClipboardEvent("cut", clipboardData));
    await nextTick();
    const clipboard = await parent.env.clipboard.read!();
    if (clipboard.status === "ok") {
      clipboardData.content = clipboard.content;
    }
    const clipboardContent = clipboardData.content;
    expect(clipboardContent[ClipboardMIMEType.PlainText]).toEqual(getCellContent(model, "A1"));
    model.dispatch("SET_FORMULA_VISIBILITY", { show: false });
    selectCell(model, "A2");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    await nextTick();
    expect(getCellContent(model, "A2")).toEqual("12/31/1899");
  });

  test("Cut of a formula cell, or non-formula cell with showFormulas should return its formattedValue", async () => {
    setCellContent(model, "A1", "1");
    setCellFormat(model, "A1", "m/d/yyyy");
    document.body.dispatchEvent(getClipboardEvent("cut", clipboardData));
    await nextTick();
    let clipboard = await parent.env.clipboard.read!();
    if (clipboard.status === "ok") {
      clipboardData.content = clipboard.content;
    }
    let clipboardContent = clipboardData.content;
    expect(clipboardContent[ClipboardMIMEType.PlainText]).toEqual(
      getEvaluatedCell(model, "A1").formattedValue
    );
    selectCell(model, "A2");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    await nextTick();
    expect(getCellContent(model, "A2")).toEqual("12/31/1899");

    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    setCellContent(model, "B1", "1");
    selectCell(model, "B1");
    document.body.dispatchEvent(getClipboardEvent("cut", clipboardData));
    await nextTick();
    clipboard = await parent.env.clipboard.read!();
    if (clipboard.status === "ok") {
      clipboardData.content = clipboard.content;
    }
    clipboardContent = clipboardData.content;
    expect(clipboardContent[ClipboardMIMEType.PlainText]).toEqual(
      getEvaluatedCell(model, "B1").formattedValue
    );
    model.dispatch("SET_FORMULA_VISIBILITY", { show: false });
    selectCell(model, "B2");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    await nextTick();
    expect(getCellContent(model, "B2")).toEqual("1");
  });

  test("can paste as value with CTRL+SHIFT+V", async () => {
    const content = "things";
    setCellContent(model, "A1", content);
    setStyle(model, "A1", { fillColor: "red", align: "right", bold: true });
    selectCell(model, "A1");
    const ev = getClipboardEvent("copy", clipboardData);
    document.body.dispatchEvent(ev);
    await nextTick();
    const clipboard = await parent.env.clipboard.read!();
    if (clipboard.status === "ok") {
      clipboardData.content = clipboard.content;
    }
    // Fake OS clipboard should have the same content
    // to make paste come from spreadsheet clipboard
    // which support paste as values
    parent.env.clipboard.write(clipboardData.content);
    selectCell(model, "A2");
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "V", ctrlKey: true, bubbles: true, shiftKey: true })
    );
    await nextTick();

    expect(getCellContent(model, "A2")).toEqual(content);
    expect(getCellStyle(model, "A2")).toBeUndefined();
  });

  test("can copy and paste above cell(s) using CTRL+D", async () => {
    setCellContent(model, "B1", "b1");
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    keyDown({ key: "D", ctrlKey: true });
    expect(getCell(model, "B2")?.content).toBe("b1");

    setCellContent(model, "B2", "b2");
    setCellContent(model, "C1", "c1");
    setCellContent(model, "D1", "d1");
    setSelection(model, ["B2:D2"]);
    keyDown({ key: "D", ctrlKey: true });
    expect(getCell(model, "B2")?.content).toBe("b1");
    expect(getCell(model, "C2")?.content).toBe("c1");
    expect(getCell(model, "D2")?.content).toBe("d1");
  });

  test("raise error if copied zone contains merged cells", () => {
    setCellContent(model, "A1", "a1");
    merge(model, "A2:A3");
    setSelection(model, ["A1:A3"]);
    handleCopyPasteResult(env, { type: "COPY_PASTE_CELLS_ON_ZONE" });
    const notificationStore = env.getStore(NotificationStore);
    expect(notificationStore.raiseError).toHaveBeenCalled();
  });

  test("can copy and paste cell(s) on left using CTRL+R", async () => {
    setCellContent(model, "A2", "a2");
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    keyDown({ key: "R", ctrlKey: true });
    expect(getCell(model, "B2")?.content).toBe("a2");

    setCellContent(model, "A3", "a3");
    setCellContent(model, "A4", "a4");
    setSelection(model, ["B2:B4"]);
    keyDown({ key: "R", ctrlKey: true });
    expect(getCell(model, "B2")?.content).toBe("a2");
    expect(getCell(model, "B3")?.content).toBe("a3");
    expect(getCell(model, "B4")?.content).toBe("a4");
  });

  test("can copy and paste cell(s) on zone using CTRL+ENTER", async () => {
    setCellContent(model, "A1", "a1");
    setSelection(model, ["A1:B2"]);
    keyDown({ key: "Enter", ctrlKey: true });
    expect(getCell(model, "A1")?.content).toBe("a1");
    expect(getCell(model, "A2")?.content).toBe("a1");
    expect(getCell(model, "B1")?.content).toBe("a1");
    expect(getCell(model, "B2")?.content).toBe("a1");
  });

  test("Alt+T -> Table", async () => {
    setSelection(model, ["A1:A5"]);
    await keyDown({ key: "T", altKey: true });
    expect(model.getters.getTable({ sheetId, row: 0, col: 0 })).toMatchObject({
      range: { zone: toZone("A1:A5") },
    });
  });

  test("Clipboard visible zones (copy) will be cleaned after hitting esc", async () => {
    setCellContent(model, "A1", "things");
    selectCell(model, "A1");
    copy(model, "A1");
    selectCell(model, "A2");
    expect(getClipboardVisibleZones(model).length).toBe(1);
    await keyDown({ key: "Escape" });
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("Clipboard visible zones (cut) will be cleaned after hitting esc", async () => {
    setCellContent(model, "A1", "things");
    selectCell(model, "A1");
    cut(model, "A1");
    selectCell(model, "A2");
    expect(getClipboardVisibleZones(model).length).toBe(1);
    await keyDown({ key: "Escape" });
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("When there is a opened cell popover, hitting esc key will only close the popover and not clean the clipboard visible zones", async () => {
    setCellContent(model, "A1", "things");
    createTableWithFilter(model, "A1:A2");
    selectCell(model, "A1");
    copy(model, "A1");
    selectCell(model, "A2");
    await nextTick();
    await clickGridIcon(model, "A1");
    expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(1);
    expect(getClipboardVisibleZones(model).length).toBe(1);
    await keyDown({ key: "Escape" });
    expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(0);
    expect(getClipboardVisibleZones(model).length).toBe(1);

    await keyDown({ key: "Escape" });
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("When there is a opened context menu, hitting esc key will only close the menu and not clean the clipboard visible zones", async () => {
    setCellContent(model, "A1", "things");
    copy(model, "A1");
    await rightClickCell(model, "A2");
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    expect(getClipboardVisibleZones(model).length).toBe(1);

    await keyDown({ key: "Escape" });
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    expect(getClipboardVisibleZones(model).length).toBe(1);
    await keyDown({ key: "Escape" });
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("Can copy/paste chart", async () => {
    selectCell(model, "A1");
    createChart(model, { type: "bar" }, "chartId", undefined, { figureId: "figureId" });
    model.dispatch("SELECT_FIGURE", { figureId: "figureId" });
    document.body.dispatchEvent(getClipboardEvent("copy", clipboardData));
    await nextTick();
    const clipboard = await parent.env.clipboard.read!();
    if (clipboard.status === "ok") {
      clipboardData.content = clipboard.content;
    }
    const clipboardContent = clipboardData.content;
    expect(clipboardContent).toMatchObject({
      "text/plain": "\t",
    });
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    await nextTick();
    expect(model.getters.getChartIds(sheetId)).toHaveLength(2);
  });

  test("Can cut/paste chart", async () => {
    selectCell(model, "A1");
    createChart(model, { type: "bar" }, "chartId", undefined, { figureId: "figureId" });
    model.dispatch("SELECT_FIGURE", { figureId: "figureId" });
    document.body.dispatchEvent(getClipboardEvent("cut", clipboardData));
    await nextTick();
    const clipboard = await parent.env.clipboard.read!();
    if (clipboard.status === "ok") {
      clipboardData.content = clipboard.content;
    }
    const clipboardContent = clipboardData.content;
    expect(clipboardContent).toMatchObject({
      "text/plain": "\t",
    });

    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    await nextTick();
    expect(model.getters.getChartIds(sheetId)).toHaveLength(1);
    expect(model.getters.getChartIds(sheetId)[0]).not.toEqual("chartId");
  });

  test.each<"cut" | "copy">(["copy", "cut"])(
    "%s a chart doesn't  push it in the clipboard",
    async (operation) => {
      mockChart();
      selectCell(model, "A1");
      createChart(model, { type: "bar" }, "chartId", undefined, { figureId: "figId" });
      model.dispatch("SELECT_FIGURE", { figureId: "figId" });
      document.body.dispatchEvent(getClipboardEvent(operation, clipboardData));
      await nextTick();
      const clipboard = await parent.env.clipboard.read!();
      if (clipboard.status !== "ok") {
        throw new Error("Clipboard read failed");
      }
      const clipboardContent = clipboard.content;

      const cbPlugin = getPlugin(model, ClipboardPlugin);
      //@ts-ignore
      const clipboardHtmlData = JSON.stringify(cbPlugin.getSheetData());

      expect(clipboardContent).toMatchObject({
        "text/plain": "\t",
        "text/html": `<div data-osheet-clipboard='${xmlEscape(clipboardHtmlData)}'>\t</div>`,
      });
    }
  );

  test.each<"cut" | "copy">(["copy", "cut"])(
    "%s an image pushes it in the clipboard as attachment",
    async (operation) => {
      selectCell(model, "A1");
      createImage(model, { figureId: "imageId" });
      model.dispatch("SELECT_FIGURE", { figureId: "imageId" });
      document.body.dispatchEvent(getClipboardEvent(operation, clipboardData));
      await nextTick();
      // copying to the clipboard might take more than one tick
      let clipboard = await parent.env.clipboard.read!();
      while (clipboard.status === "ok" && Object.keys(clipboard.content).length === 0) {
        await nextTick();
        clipboard = await parent.env.clipboard.read!();
      }
      if (clipboard.status !== "ok") {
        throw new Error("Clipboard read failed");
      }
      const clipboardContent = clipboard.content;

      const cbPlugin = getPlugin(model, ClipboardPlugin);
      //@ts-ignore
      const clipboardHtmlData = JSON.stringify(cbPlugin.getSheetData());
      //@ts-ignore
      const imgData = (await cbPlugin.readFileAsDataURL(
        new Blob([], { type: "image/png" })
      )) as string;

      expect(clipboardContent).toMatchObject({
        "text/plain": "\t",
        "text/html": `<div data-osheet-clipboard='${xmlEscape(
          clipboardHtmlData
        )}'><img src="${xmlEscape(imgData)}" /></div>`,
        "image/png": expect.any(Blob),
      });
    }
  );

  test("Paste an image from the clipboard uploads it on the server and adds it to the sheet", async () => {
    const image = new File(["image"], "image.png", { type: "image/png" });
    clipboardData.setData("image/png", image);
    selectCell(model, "A1");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    await nextTick();
    const figures = model.getters.getFigures(sheetId);
    expect(figures).toHaveLength(1);

    expect(model.getters.getFigure(sheetId, figures[0].id)).toMatchObject({});
  });

  test("Pasting an OS clipboard with both text and image will only paste the text", async () => {
    const image = new File(["image"], "image.png", { type: "image/png" });
    clipboardData.setData("image/png", image);
    clipboardData.setData(ClipboardMIMEType.PlainText, "Hi !");
    selectCell(model, "A1");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    await nextTick();

    expect(getCellContent(model, "A1")).toEqual("Hi !");
    expect(model.getters.getFigures(sheetId)).toHaveLength(0);
  });
});

describe("Header grouping shortcuts", () => {
  let sheetId: string;

  beforeEach(async () => {
    ({ parent, model, fixture } = await mountSpreadsheet());
    sheetId = model.getters.getActiveSheetId();
  });

  describe.each(["COL", "ROW"] as const)("With selected header", (dimension) => {
    test("ALT+SHIFT+ARROWRIGHT: group selected header", () => {
      selectHeader(model, dimension, 1, "overrideSelection");
      keyDown({ key: "ArrowRight", altKey: true, shiftKey: true });
      expect(model.getters.getHeaderGroups(sheetId, dimension)).toMatchObject([
        { start: 1, end: 1 },
      ]);
    });

    test("ALT+SHIFT+ARROWLEFT: ungroup selected header", () => {
      groupHeaders(model, dimension, 1, 1);
      selectHeader(model, dimension, 1, "overrideSelection");
      keyDown({ key: "ArrowLeft", altKey: true, shiftKey: true });
      expect(model.getters.getHeaderGroups(sheetId, dimension)).toMatchObject([]);
    });

    test("ALT+SHIFT+ARROWUP: fold selected header", () => {
      groupHeaders(model, dimension, 1, 1);
      selectHeader(model, dimension, 1, "overrideSelection");
      keyDown({ key: "ArrowUp", altKey: true, shiftKey: true });
      expect(model.getters.isGroupFolded(sheetId, dimension, 1, 1)).toBe(true);
    });

    test("ALT+SHIFT+ARROWDOWN: unfold selected header", () => {
      groupHeaders(model, dimension, 1, 1);
      foldHeaderGroup(model, dimension, 1, 1);
      selectHeader(model, dimension, 1, "overrideSelection");
      keyDown({ key: "ArrowDown", altKey: true, shiftKey: true });
      expect(model.getters.isGroupFolded(sheetId, dimension, 1, 1)).toBe(false);
    });
  });

  describe("With selected zone ", () => {
    test("ALT+SHIFT+ARROWRIGHT: open group context menu", async () => {
      setSelection(model, ["A1:B2"]);
      keyDown({ key: "ArrowRight", altKey: true, shiftKey: true });
      await nextTick();
      expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
      expect(fixture.querySelector('.o-menu-item[data-name="group_columns"]')).toBeTruthy();
      expect(fixture.querySelector('.o-menu-item[data-name="group_rows"]')).toBeTruthy();
    });

    test("ALT+SHIFT+ARROWLEFT: open ungroup context menu", async () => {
      setSelection(model, ["A1:B2"]);
      groupHeaders(model, "COL", 1, 2);
      groupHeaders(model, "ROW", 1, 2);
      keyDown({ key: "ArrowLeft", altKey: true, shiftKey: true });
      await nextTick();
      expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
      expect(fixture.querySelector('.o-menu-item[data-name="ungroup_columns"]')).toBeTruthy();
      expect(fixture.querySelector('.o-menu-item[data-name="ungroup_rows"]')).toBeTruthy();
    });

    test("ALT+SHIFT+ARROWUP: fold column and row groups", () => {
      setSelection(model, ["A1:B2"]);
      groupHeaders(model, "COL", 1, 2);
      groupHeaders(model, "ROW", 1, 2);
      keyDown({ key: "ArrowUp", altKey: true, shiftKey: true });
      expect(model.getters.isGroupFolded(sheetId, "COL", 1, 2)).toBe(true);
      expect(model.getters.isGroupFolded(sheetId, "ROW", 1, 2)).toBe(true);
    });

    test("ALT+SHIFT+ARROWDOWN: unfold column and row groups", () => {
      setSelection(model, ["A1:B2"]);
      groupHeaders(model, "COL", 1, 2);
      groupHeaders(model, "ROW", 1, 2);
      foldHeaderGroup(model, "COL", 1, 2);
      foldHeaderGroup(model, "ROW", 1, 2);
      keyDown({ key: "ArrowDown", altKey: true, shiftKey: true });
      expect(model.getters.isGroupFolded(sheetId, "COL", 1, 2)).toBe(false);
      expect(model.getters.isGroupFolded(sheetId, "ROW", 1, 2)).toBe(false);
    });
  });

  describe("With the whole sheet selected", () => {
    beforeEach(() => {
      const sheetSize = model.getters.getSheetZone(sheetId);
      setSelection(model, [zoneToXc(sheetSize)]);
    });

    test("ALT+SHIFT+ARROWUP: fold all groups", () => {
      groupHeaders(model, "COL", 1, 2);
      groupHeaders(model, "ROW", 1, 2);

      keyDown({ key: "ArrowUp", altKey: true, shiftKey: true });
      expect(model.getters.isGroupFolded(sheetId, "COL", 1, 2)).toBe(true);
      expect(model.getters.isGroupFolded(sheetId, "ROW", 1, 2)).toBe(true);
    });

    test("ALT+SHIFT+ARROWDOWN: unfold all groups", () => {
      groupHeaders(model, "COL", 1, 2);
      groupHeaders(model, "ROW", 1, 2);
      foldHeaderGroup(model, "COL", 1, 2);
      foldHeaderGroup(model, "ROW", 1, 2);

      keyDown({ key: "ArrowDown", altKey: true, shiftKey: true });
      expect(model.getters.isGroupFolded(sheetId, "COL", 1, 2)).toBe(false);
      expect(model.getters.isGroupFolded(sheetId, "ROW", 1, 2)).toBe(false);
    });
  });
});

describe("Can select de-select zones", () => {
  beforeEach(async () => {
    ({ parent, model, fixture } = await mountSpreadsheet());
  });
  test("Can select a zone", () => {
    gridMouseEvent(model, "pointerdown", "A1");
    gridMouseEvent(model, "pointermove", "C3");
    gridMouseEvent(model, "pointerup", "C3");
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1:C3")]);
  });

  test("Can de-select cell from selection", () => {
    gridMouseEvent(model, "pointerdown", "A1");
    gridMouseEvent(model, "pointermove", "C3");
    gridMouseEvent(model, "pointerup", "C3");
    expect(model.getters.getSelectedZones()).toEqual([{ left: 0, right: 2, top: 0, bottom: 2 }]);

    gridMouseEvent(model, "pointerdown", "B2", { ctrlKey: true });
    gridMouseEvent(model, "pointerup", "B2", { ctrlKey: true });
    expect(model.getters.getSelectedZones()).toEqual([
      toZone("A3:C3"),
      toZone("C2"),
      toZone("A2"),
      toZone("A1:C1"),
    ]);
  });

  test("Can select a zone and de-select a overlap zone", () => {
    gridMouseEvent(model, "pointerdown", "A1");
    gridMouseEvent(model, "pointermove", "D4");
    gridMouseEvent(model, "pointerup", "D4");
    expect(model.getters.getSelectedZones()).toEqual([{ left: 0, right: 3, top: 0, bottom: 3 }]);

    gridMouseEvent(model, "pointerdown", "B2", { ctrlKey: true });
    gridMouseEvent(model, "pointermove", "C3", { ctrlKey: true });
    gridMouseEvent(model, "pointerup", "C3", { ctrlKey: true });
    expect(model.getters.getSelectedZones()).toEqual([
      toZone("A4:D4"),
      toZone("D2:D3"),
      toZone("A2:A3"),
      toZone("A1:D1"),
    ]);
  });
});
