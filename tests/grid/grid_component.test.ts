import { Spreadsheet, TransportService } from "../../src";
import { ComposerStore } from "../../src/components/composer/composer/composer_store";
import { ComposerFocusStore } from "../../src/components/composer/composer_focus_store";
import { CellPopoverStore } from "../../src/components/popover";
import {
  BACKGROUND_GRAY_COLOR,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  MESSAGE_VERSION,
  SCROLLBAR_WIDTH,
} from "../../src/constants";
import { buildSheetLink, toCartesian, toHex, toZone, zoneToXc } from "../../src/helpers";
import { createEmptyWorkbookData } from "../../src/migrations/data";
import { Model } from "../../src/model";
import { Store } from "../../src/store_engine";
import { Align, ClipboardMIMEType, SpreadsheetChildEnv } from "../../src/types";
import { FileStore } from "../__mocks__/mock_file_store";
import { MockTransportService } from "../__mocks__/transport_service";
import { MockClipboardData, getClipboardEvent } from "../test_helpers/clipboard";
import {
  copy,
  createChart,
  createSheet,
  createTable,
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
  setCellContent,
  setCellFormat,
  setSelection,
  setStyle,
  updateFilter,
  updateTableConfig,
} from "../test_helpers/commands_helpers";
import {
  clickCell,
  doubleClick,
  edgeScrollDelay,
  getElComputedStyle,
  gridMouseEvent,
  hoverCell,
  keyDown,
  rightClickCell,
  scrollGrid,
  simulateClick,
  triggerMouseEvent,
  triggerTouchEvent,
  triggerWheelEvent,
} from "../test_helpers/dom_helper";
import {
  getActiveSheetFullScrollInfo,
  getCell,
  getCellContent,
  getCellText,
  getClipboardVisibleZones,
  getEvaluatedCell,
  getSelectionAnchorCellXc,
  getStyle,
} from "../test_helpers/getters_helpers";
import { mockChart, mountSpreadsheet, nextTick, typeInComposerGrid } from "../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../test_helpers/mock_helpers";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("../__mocks__/content_editable_helper")
);

function getVerticalScroll(): number {
  const scrollbar = fixture.querySelector(".o-scrollbar.vertical") as HTMLElement;
  return scrollbar.scrollTop;
}

function getHorizontalScroll(): number {
  const scrollbar = fixture.querySelector(".o-scrollbar.horizontal") as HTMLElement;
  return scrollbar.scrollLeft;
}

const mockGridPosition = { x: 40, y: 40 };
mockGetBoundingClientRect({
  "o-grid": () => mockGridPosition,
});

let fixture: HTMLElement;
let model: Model;
let env: SpreadsheetChildEnv;
let parent: Spreadsheet;
let composerStore: Store<ComposerStore>;
let composerFocusStore: Store<ComposerFocusStore>;

jest.useFakeTimers();

describe("Grid component", () => {
  beforeEach(async () => {
    ({ parent, model, fixture, env } = await mountSpreadsheet());
    composerStore = env.getStore(ComposerStore);
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
    await nextTick();
    expect(getHorizontalScroll()).toBe(50);
    expect(getVerticalScroll()).toBe(30);
    triggerTouchEvent(grid, "touchmove", { clientX: 80, clientY: 100, identifier: 2 });
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

    triggerTouchEvent(grid, "touchstart", { clientX: 0, clientY: 150, identifier: 1 });
    // move down; we are at the top: ev not prevented
    triggerTouchEvent(grid, "touchmove", { clientX: 0, clientY: 120, identifier: 2 });
    expect(mockCallback).toBeCalledTimes(1);
    // move up:; we are not at the top: ev prevented
    triggerTouchEvent(grid, "touchmove", { clientX: 0, clientY: 150, identifier: 3 });
    expect(mockCallback).toBeCalledTimes(1);
    // move up again but we are at the stop: ev not prevented
    triggerTouchEvent(grid, "touchmove", { clientX: 0, clientY: 150, identifier: 4 });
    expect(mockCallback).toBeCalledTimes(2);
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

    test("pressing BACKSPACE remove the content of a cell", async () => {
      setCellContent(model, "A1", "test");
      await nextTick();
      keyDown({ key: "Backspace" });
      expect(getSelectionAnchorCellXc(model)).toBe("A1");
      expect(composerStore.editionMode).toBe("inactive");
      expect(getCellContent(model, "A1")).toBe("");
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
      expect(getCell(model, "A1")!.style).toBeDefined();
      keyDown({ key: "z", ctrlKey: true });
      expect(getCell(model, "A1")).toBeUndefined();
      await nextTick();
      keyDown({ ...redoKey, bubbles: true });
      expect(getCell(model, "A1")!.style).toBeDefined();
    });

    test("can undo/redo with keyboard (uppercase version)", async () => {
      setStyle(model, "A1", { fillColor: "red" });
      expect(getCell(model, "A1")!.style).toBeDefined();
      keyDown({ key: "Z", ctrlKey: true });
      expect(getCell(model, "A1")).toBeUndefined();
      await nextTick();
      keyDown({ key: "Y", ctrlKey: true });
      expect(getCell(model, "A1")!.style).toBeDefined();
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
      expect(getCell(model, "A1")!.style).not.toBeDefined();
      await keyDown({ key: "B", ctrlKey: true });
      expect(getCell(model, "A1")!.style).toEqual({ bold: true });
      expect(getStyle(model, "A1")).toEqual({ bold: true });
      await keyDown({ key: "B", ctrlKey: true });
      expect(getCell(model, "A1")!.style).toEqual({ bold: false });
      expect(getStyle(model, "A1")).toEqual({});
    });

    test("toggle Italic with Ctrl+I", async () => {
      setCellContent(model, "A1", "hello");
      expect(getCell(model, "A1")!.style).toBeUndefined();
      await keyDown({ key: "I", ctrlKey: true });
      expect(getCell(model, "A1")!.style).toEqual({ italic: true });
      expect(getStyle(model, "A1")).toEqual({ italic: true });
      await keyDown({ key: "I", ctrlKey: true });
      expect(getCell(model, "A1")!.style).toEqual({ italic: false });
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
      expect(getCell(model, "A1")!.style).toBeUndefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "L", ctrlKey: true, shiftKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCell(model, "A1")!.style).toEqual({ align: "left" });
    });

    test("set center align with Ctrl+SHIFT+E", async () => {
      setCellContent(model, "A1", "hello");
      expect(getCell(model, "A1")!.style).toBeUndefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "E", ctrlKey: true, shiftKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCell(model, "A1")!.style).toEqual({ align: "center" });
    });

    test("set right align with Ctrl+SHIFT+R", async () => {
      setCellContent(model, "A1", "hello");
      expect(getCell(model, "A1")!.style).toBeUndefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "R", ctrlKey: true, shiftKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCell(model, "A1")!.style).toEqual({ align: "right" });
    });

    test("clean formatting with CTRL+SHIFT+<", async () => {
      const style = { fillColor: "red", align: "right" as Align, bold: true };
      setCellContent(model, "A1", "hello");
      setStyle(model, "A1", style);
      expect(getCell(model, "A1")!.style).toEqual(style);
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "<", ctrlKey: true, shiftKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCell(model, "A1")!.style).toBeUndefined();
    });

    test("clean formatting with CTRL+<", async () => {
      const style = { fillColor: "red", align: "right" as Align, bold: true };
      setCellContent(model, "A1", "hello");
      setStyle(model, "A1", style);
      expect(getCell(model, "A1")!.style).toEqual(style);
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "<", ctrlKey: true, bubbles: true })
      );
      await nextTick();
      expect(getCell(model, "A1")!.style).toBeUndefined();
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
      expect(composerStore.highlights[0]?.zone).toEqual(toZone("B2:B4"));
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

    test("pressing Ctrl+K opens the link editor", async () => {
      await keyDown({ key: "k", ctrlKey: true });
      expect(fixture.querySelector(".o-link-editor")).not.toBeNull();
    });

    test("Filter icon is correctly rendered", async () => {
      createTable(model, "B2:C3");
      await nextTick();

      const icons = fixture.querySelectorAll(".o-grid-cell-icon");
      expect(icons).toHaveLength(2);
      const top = `${DEFAULT_CELL_HEIGHT * 2 - GRID_ICON_EDGE_LENGTH - GRID_ICON_MARGIN}px`;
      const leftA = `${DEFAULT_CELL_WIDTH * 2 - GRID_ICON_EDGE_LENGTH - GRID_ICON_MARGIN}px`;
      const leftB = `${DEFAULT_CELL_WIDTH * 3 - GRID_ICON_EDGE_LENGTH - GRID_ICON_MARGIN}px`;
      expect((icons[0] as HTMLElement).style["_values"]).toEqual({ top, left: leftA });
      expect((icons[1] as HTMLElement).style["_values"]).toEqual({ top, left: leftB });
    });

    test("Filter icon change when filter is active", async () => {
      createTable(model, "A1:A2");
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

    test("Filter icon changes color on high contrast background", async () => {
      createTable(model, "A1:A2");
      updateTableConfig(model, "A1", { styleId: "None" });
      await nextTick();
      const icon = fixture.querySelector(".o-grid .o-filter-icon");
      expect(icon?.classList).not.toContain(".o-high-contrast");

      updateTableConfig(model, "A1", { styleId: "TableStyleLight8" });
      await nextTick();
      expect(icon?.classList).toContain("o-high-contrast");

      setStyle(model, "A1", { fillColor: "#fff" });
      await nextTick();
      expect(icon?.classList).not.toContain(".o-high-contrast");
    });

    test("Clicking on a filter icon correctly open context menu", async () => {
      createTable(model, "A1:A2");
      await nextTick();
      await simulateClick(".o-filter-icon");
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
    test("can paste format with mouse once", async () => {
      setCellContent(model, "B2", "b2");
      selectCell(model, "B2");
      setStyle(model, "B2", { bold: true });
      model.dispatch("ACTIVATE_PAINT_FORMAT", { persistent: false });
      gridMouseEvent(model, "pointerdown", "C8");
      expect(getCell(model, "C8")).toBeUndefined();
      gridMouseEvent(model, "pointerup", "C8");
      expect(getCell(model, "C8")!.style).toEqual({ bold: true });

      gridMouseEvent(model, "pointerdown", "D8");
      expect(getCell(model, "D8")).toBeUndefined();
      gridMouseEvent(model, "pointerup", "D8");
      expect(getCell(model, "D8")).toBeUndefined();
    });

    test("can keep the paint format mode persistently", async () => {
      setCellContent(model, "B2", "b2");
      selectCell(model, "B2");
      setStyle(model, "B2", { bold: true });
      model.dispatch("ACTIVATE_PAINT_FORMAT", { persistent: true });
      gridMouseEvent(model, "pointerdown", "C8");
      expect(getCell(model, "C8")).toBeUndefined();
      gridMouseEvent(model, "pointerup", "C8");
      expect(getCell(model, "C8")!.style).toEqual({ bold: true });

      gridMouseEvent(model, "pointerdown", "D8");
      expect(getCell(model, "D8")).toBeUndefined();
      gridMouseEvent(model, "pointerup", "D8");
      expect(getCell(model, "D8")!.style).toEqual({ bold: true });
    });

    test("can paste format with key", async () => {
      setCellContent(model, "B2", "b2");
      selectCell(model, "B2");
      setStyle(model, "B2", { bold: true });
      model.dispatch("ACTIVATE_PAINT_FORMAT", { persistent: false });
      expect(getCell(model, "C2")).toBeUndefined();
      keyDown({ key: "ArrowRight" });
      expect(getCell(model, "C2")!.style).toEqual({ bold: true });
    });

    test("can exit the paint format mode via ESC key", async () => {
      setCellContent(model, "B2", "b2");
      selectCell(model, "B2");
      setStyle(model, "B2", { bold: true });
      model.dispatch("ACTIVATE_PAINT_FORMAT", { persistent: false });
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
      model.dispatch("ACTIVATE_PAINT_FORMAT", { persistent: true });
      setStyle(model, "B2", { bold: false });

      gridMouseEvent(model, "pointerdown", "D8");
      expect(getCell(model, "D8")).toBeUndefined();
      gridMouseEvent(model, "pointerup", "D8");
      expect(getCell(model, "D8")!.style).toEqual({ bold: true });
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
    jest.restoreAllMocks();
  });
});

describe("Multi User selection", () => {
  let transportService: TransportService;
  beforeEach(async () => {
    transportService = new MockTransportService();

    model = new Model({}, { transportService });
    ({ parent, fixture } = await mountSpreadsheet({ model }));
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
    expect(getActiveSheetFullScrollInfo(model)).toMatchObject({
      scrollX: 0,
      scrollbarScrollX: 0,
      scrollY: 1196,
      scrollbarScrollY: 1200,
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
    expect(getActiveSheetFullScrollInfo(model)).toMatchObject({
      scrollX: 192,
      scrollbarScrollX: 200,
      scrollY: 0,
      scrollbarScrollY: 0,
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
      left: 1,
      right: 11,
    });
    expect(getActiveSheetFullScrollInfo(model)).toMatchObject({
      scrollX: 96,
      scrollbarScrollX: 96,
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

  test("Move selection vertically (bottom to to) through pane division does not reset the scroll", async () => {
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
      left: 1,
      right: 11,
    });
    expect(getActiveSheetFullScrollInfo(model)).toMatchObject({
      scrollX: 96,
      scrollbarScrollX: 96,
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
    jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 800);
    jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 650);
    // force a triggering of all resizeObservers to ensure the grid is resized
    //@ts-ignore
    window.resizers.resize();
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
    triggerWheelEvent(document.activeElement!, {
      deltaY: width - viewportWidth + HEADER_WIDTH,
      shiftKey: true,
    });
    const viewport = model.getters.getActiveMainViewport();
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    await clickCell(model, "Y1", { shiftKey: true });
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
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

  test("Scroll bars have background color", () => {
    // Without background color, elements could be displayed above the scrollbars placeholders
    const getColor = (selector: string) => toHex(getElComputedStyle(selector, "background"));

    expect(getColor(".o-scrollbar.corner")).toBeSameColorAs(BACKGROUND_GRAY_COLOR);
    expect(getColor(".o-scrollbar.horizontal")).toBeSameColorAs(BACKGROUND_GRAY_COLOR);
    expect(getColor(".o-scrollbar.vertical")).toBeSameColorAs(BACKGROUND_GRAY_COLOR);
  });
});

describe("Copy paste keyboard shortcut", () => {
  let clipboardData: MockClipboardData;
  let sheetId: string;

  beforeEach(async () => {
    clipboardData = new MockClipboardData();
    ({ parent, model, fixture } = await mountSpreadsheet());
    sheetId = model.getters.getActiveSheetId();
    composerStore = parent.env.getStore(ComposerStore);
    composerFocusStore = parent.env.getStore(ComposerFocusStore);
  });

  test("Default paste is prevented when handled by the grid", async () => {
    clipboardData.setText("Excalibur");
    const pasteEvent = getClipboardEvent("paste", clipboardData);
    document.body.dispatchEvent(pasteEvent);
    expect(pasteEvent.defaultPrevented).toBeTruthy();
  });

  test("Can paste from OS", async () => {
    selectCell(model, "A1");
    clipboardData.setText("Excalibur");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    expect(getCellContent(model, "A1")).toEqual("Excalibur");
  });
  test("Can copy/paste cells", async () => {
    setCellContent(model, "A1", "things");
    selectCell(model, "A1");
    document.body.dispatchEvent(getClipboardEvent("copy", clipboardData));
    expect(clipboardData.content).toEqual({ "text/plain": "things", "text/html": "things" });
    selectCell(model, "A2");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    expect(getCellContent(model, "A2")).toEqual("things");
  });

  test("Can cut/paste cells", async () => {
    setCellContent(model, "A1", "things");
    selectCell(model, "A1");
    document.body.dispatchEvent(getClipboardEvent("cut", clipboardData));
    expect(clipboardData.content).toEqual({ "text/plain": "things", "text/html": "things" });
    selectCell(model, "A2");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    expect(getCellContent(model, "A1")).toEqual("");
    expect(getCellContent(model, "A2")).toEqual("things");
  });

  test("cut zone gets cleared on paste if content/style is altered after cut", async () => {
    setCellContent(model, "A1", "things");
    setStyle(model, "A1", { bold: true });
    selectCell(model, "A1");
    document.body.dispatchEvent(getClipboardEvent("cut", clipboardData));
    setCellContent(model, "A1", "new content");
    setStyle(model, "A1", { bold: false });
    selectCell(model, "A2");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    expect(getCellContent(model, "A2")).toEqual("things");
    expect(getStyle(model, "A2")).toEqual({ bold: true });
    expect(getCell(model, "A1")).toBe(undefined);
  });

  test("Cut of a formula cell, and enabling showFormulas should return content", async () => {
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    setCellContent(model, "A1", "1");
    setCellFormat(model, "A1", "m/d/yyyy");
    document.body.dispatchEvent(getClipboardEvent("cut", clipboardData));
    expect(clipboardData.getData(ClipboardMIMEType.PlainText)).toEqual(getCellContent(model, "A1"));
    model.dispatch("SET_FORMULA_VISIBILITY", { show: false });
    selectCell(model, "A2");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    expect(getCellContent(model, "A2")).toEqual("12/31/1899");
  });

  test("Cut of a formula cell, or non-formula cell with showFormulas should return its formattedValue", async () => {
    setCellContent(model, "A1", "1");
    setCellFormat(model, "A1", "m/d/yyyy");
    document.body.dispatchEvent(getClipboardEvent("cut", clipboardData));
    expect(clipboardData.getData(ClipboardMIMEType.PlainText)).toEqual(
      getEvaluatedCell(model, "A1").formattedValue
    );
    selectCell(model, "A2");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    expect(getCellContent(model, "A2")).toEqual("12/31/1899");

    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    setCellContent(model, "B1", "1");
    selectCell(model, "B1");
    document.body.dispatchEvent(getClipboardEvent("cut", clipboardData));
    expect(clipboardData.getData(ClipboardMIMEType.PlainText)).toEqual(
      getEvaluatedCell(model, "B1").formattedValue
    );
    model.dispatch("SET_FORMULA_VISIBILITY", { show: false });
    selectCell(model, "B2");
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    expect(getCellContent(model, "B2")).toEqual("1");
  });

  test("can paste as value with CTRL+SHIFT+V", async () => {
    const content = "things";
    setCellContent(model, "A1", content);
    setStyle(model, "A1", { fillColor: "red", align: "right", bold: true });
    selectCell(model, "A1");
    document.body.dispatchEvent(getClipboardEvent("copy", clipboardData));
    // Fake OS clipboard should have the same content
    // to make paste come from spreadsheet clipboard
    // which support paste as values
    parent.env.clipboard.writeText(content);
    selectCell(model, "A2");
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "V", ctrlKey: true, bubbles: true, shiftKey: true })
    );
    await nextTick();

    expect(getCellContent(model, "A2")).toEqual(content);
    expect(getCell(model, "A2")!.style).toBeUndefined();
  });

  test("can copy and paste above cell(s) using CTRL+D", async () => {
    setCellContent(model, "B1", "b1");
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    keyDown({ key: "D", ctrlKey: true });
    expect(model.dispatch("COPY_PASTE_CELLS_ABOVE")).toBeSuccessfullyDispatched();

    setCellContent(model, "C1", "c1");
    setCellContent(model, "D1", "d1");
    setSelection(model, ["B2:D2"]);
    keyDown({ key: "D", ctrlKey: true });
    expect(model.dispatch("COPY_PASTE_CELLS_ABOVE")).toBeSuccessfullyDispatched();
  });

  test("can copy and paste cell(s) on left using CTRL+R", async () => {
    setCellContent(model, "A1", "a1");
    setCellContent(model, "B1", "b1");
    selectCell(model, "B1");
    keyDown({ key: "R", ctrlKey: true });
    expect(model.dispatch("COPY_PASTE_CELLS_ON_LEFT")).toBeSuccessfullyDispatched();

    setCellContent(model, "A2", "a2");
    setCellContent(model, "A3", "a3");
    setSelection(model, ["B1:B3"]);
    keyDown({ key: "R", ctrlKey: true });
    expect(model.dispatch("COPY_PASTE_CELLS_ON_LEFT")).toBeSuccessfullyDispatched();
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
    createTable(model, "A1:A2");
    selectCell(model, "A1");
    copy(model, "A1");
    selectCell(model, "A2");
    await nextTick();
    await simulateClick(".o-filter-icon");
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
    createChart(model, { type: "bar" }, "chartId");
    model.dispatch("SELECT_FIGURE", { id: "chartId" });
    document.body.dispatchEvent(getClipboardEvent("copy", clipboardData));
    expect(clipboardData.content).toEqual({ "text/plain": "\t" });
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    expect(model.getters.getChartIds(sheetId)).toHaveLength(2);
  });

  test("Can cut/paste chart", async () => {
    selectCell(model, "A1");
    createChart(model, { type: "bar" }, "chartId");
    model.dispatch("SELECT_FIGURE", { id: "chartId" });
    document.body.dispatchEvent(getClipboardEvent("cut", clipboardData));
    expect(clipboardData.content).toEqual({ "text/plain": "\t" });
    document.body.dispatchEvent(getClipboardEvent("paste", clipboardData));
    expect(model.getters.getChartIds(sheetId)).toHaveLength(1);
    expect(model.getters.getChartIds(sheetId)[0]).not.toEqual("chartId");
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
    expect(composerFocusStore.gridComposerFocus).toBe("contentFocus");

    composerStore.stopEdition();
    await nextTick();
    expect(composerFocusStore.gridComposerFocus).toBe("inactive");

    // double click A2 - still in a non empty cell (in merge)
    triggerMouseEvent(
      ".o-grid-overlay",
      "dblclick",
      0.5 * DEFAULT_CELL_WIDTH,
      1.5 * DEFAULT_CELL_HEIGHT
    );
    await nextTick();
    expect(composerFocusStore.gridComposerFocus).toBe("contentFocus");

    composerStore.stopEdition();
    await nextTick();
    expect(composerFocusStore.gridComposerFocus).toBe("inactive");

    // double click B2
    triggerMouseEvent(
      ".o-grid-overlay",
      "dblclick",
      1.5 * DEFAULT_CELL_WIDTH,
      1.5 * DEFAULT_CELL_HEIGHT
    );
    await nextTick();
    expect(composerFocusStore.gridComposerFocus).toBe("cellFocus");
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
