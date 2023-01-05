import { App } from "@odoo/owl";
import { Model } from "../../src";
import { Spreadsheet } from "../../src/components";
import { DEFAULT_CELL_HEIGHT } from "../../src/constants";
import { args, functionRegistry } from "../../src/functions";
import { toZone } from "../../src/helpers";
import { OPEN_CF_SIDEPANEL_ACTION } from "../../src/registries";
import {
  addRows,
  createChart,
  createSheet,
  freezeRows,
  selectCell,
  setCellContent,
} from "../test_helpers/commands_helpers";
import {
  clickCell,
  getElComputedStyle,
  rightClickCell,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import { getCellContent } from "../test_helpers/getters_helpers";
import {
  makeTestFixture,
  mountSpreadsheet,
  nextTick,
  restoreDefaultFunctions,
  startGridComposition,
  toRangesData,
  typeInComposerGrid,
  typeInComposerTopBar,
} from "../test_helpers/helpers";
import { mockChart } from "./__mocks__/chart";

jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

let fixture: HTMLElement;
let parent: Spreadsheet;
let model: Model;
let app: App;

describe("Simple Spreadsheet Component", () => {
  // default model and env
  beforeEach(async () => {
    fixture = makeTestFixture();
    ({ app, model, parent } = await mountSpreadsheet(fixture, {
      model: new Model({ sheets: [{ id: "sh1" }] }),
    }));
  });

  afterEach(() => {
    app.destroy();
    fixture.remove();
  });

  test("simple rendering snapshot", async () => {
    expect(fixture.querySelector(".o-spreadsheet")).toMatchSnapshot();
  });

  test("focus is properly set, initially and after switching sheet", async () => {
    expect(document.activeElement!.tagName).toEqual("INPUT");
    document.querySelector(".o-add-sheet")!.dispatchEvent(new Event("click"));
    await nextTick();
    expect(document.querySelectorAll(".o-sheet").length).toBe(2);
    expect(document.activeElement!.tagName).toEqual("INPUT");
    await simulateClick(document.querySelectorAll(".o-sheet")[1]);
    expect(document.activeElement!.tagName).toEqual("INPUT");
  });

  describe("Use of env in a function", () => {
    let env;
    beforeAll(() => {
      functionRegistry.add("GETACTIVESHEET", {
        description: "Get the name of the current sheet",
        compute: function () {
          env = this.env;
          return "Sheet";
        },
        args: args(``),
        returns: ["STRING"],
      });
    });

    afterAll(() => {
      restoreDefaultFunctions();
    });

    test("Can use  an external dependency in a function", () => {
      const model = new Model({ sheets: [{ id: 1 }] }, { external: { env: { myKey: [] } } });
      setCellContent(model, "A1", "=GETACTIVESHEET()");
      expect(getCellContent(model, "A1")).toBe("Sheet");
      expect(env).toMatchObject({ myKey: [] });
    });

    test("Can use an external dependency in a function at model start", async () => {
      await mountSpreadsheet(fixture, {
        model: new Model(
          {
            version: 2,
            sheets: [
              {
                name: "Sheet1",
                colNumber: 26,
                rowNumber: 100,
                cells: {
                  A1: { content: "=GETACTIVESHEET()" },
                },
                conditionalFormats: [],
              },
            ],
            activeSheet: "Sheet1",
          },
          { external: { env: { myKey: [] } } }
        ),
      });
      expect(env).toMatchObject({ myKey: [] });
    });
  });

  test("Clipboard is in spreadsheet env", () => {
    expect(parent.env.clipboard["clipboard"]).toBe(navigator.clipboard);
  });

  test("typing opens composer after toolbar clicked", async () => {
    await simulateClick(`div[title="Bold"]`);
    expect(document.activeElement).not.toBeNull();
    document.activeElement?.dispatchEvent(new InputEvent("input", { data: "d", bubbles: true }));
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("editing");
    expect(model.getters.getCurrentContent()).toBe("d");
  });

  test("can open/close search with ctrl+h", async () => {
    await nextTick();
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "H", ctrlKey: true, bubbles: true })
    );
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "H", ctrlKey: true, bubbles: true })
    );
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(0);
  });

  test("can open/close search with ctrl+f", async () => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F", ctrlKey: true, bubbles: true })
    );
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
    await nextTick();
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F", ctrlKey: true, bubbles: true })
    );
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(0);
  });

  test("Z-indexes of the various spreadsheet components", async () => {
    const getZIndex = (selector: string) => Number(getElComputedStyle(selector, "zIndex")) || 0;
    mockChart();
    const gridZIndex = getZIndex(".o-grid");
    const vScrollbarZIndex = getZIndex(".o-scrollbar.vertical");
    const hScrollbarZIndex = getZIndex(".o-scrollbar.horizontal");
    const scrollbarCornerZIndex = getZIndex(".o-scrollbar.corner");

    await rightClickCell(model, "A1");
    const contextMenuZIndex = getZIndex(".o-popover");

    await typeInComposerGrid("=A1:B2");
    const gridComposerZIndex = getZIndex("div.o-grid-composer");
    const highlighZIndex = getZIndex(".o-highlight");

    triggerMouseEvent(".o-tool.o-dropdown-button.o-with-color", "click");
    await nextTick();
    const colorPickerZIndex = getZIndex("div.o-color-picker");

    createChart(model, {}, "thisIsAnId");
    model.dispatch("SELECT_FIGURE", { id: "thisIsAnId" });
    await nextTick();
    const figureZIndex = getZIndex(".o-figure-wrapper");
    const figureAnchorZIndex = getZIndex(".o-anchor");

    expect(gridZIndex).toBeLessThan(highlighZIndex);
    expect(highlighZIndex).toBeLessThan(figureZIndex);
    expect(figureZIndex).toBeLessThan(vScrollbarZIndex);
    expect(vScrollbarZIndex).toEqual(hScrollbarZIndex);
    expect(hScrollbarZIndex).toEqual(scrollbarCornerZIndex);
    expect(scrollbarCornerZIndex).toBeLessThan(gridComposerZIndex);
    expect(gridComposerZIndex).toBeLessThan(colorPickerZIndex);
    expect(colorPickerZIndex).toBeLessThan(contextMenuZIndex);
    expect(contextMenuZIndex).toBeLessThan(figureAnchorZIndex);
  });

  test("Keydown is ineffective in dashboard mode", async () => {
    const spreadsheetKeyDown = jest.spyOn(parent, "onKeydown");
    const spreadsheetDiv = fixture.querySelector(".o-spreadsheet")!;
    spreadsheetDiv.dispatchEvent(new KeyboardEvent("keydown", { key: "H", ctrlKey: true }));
    expect(spreadsheetKeyDown).toHaveBeenCalled();
    jest.clearAllMocks();
    parent.model.updateMode("dashboard");
    await nextTick();
    spreadsheetDiv.dispatchEvent(new KeyboardEvent("keydown", { key: "H", ctrlKey: true }));
    expect(spreadsheetKeyDown).not.toHaveBeenCalled();
  });
});

test("Can instantiate a spreadsheet with a given client id-name", async () => {
  const client = { id: "alice", name: "Alice" };
  fixture = makeTestFixture();
  ({ app, parent, model } = await mountSpreadsheet(fixture, {
    model: new Model({}, { client }),
  }));
  expect(model.getters.getClient()).toEqual(client);
  app.destroy();
  fixture.remove();
});

test("Spreadsheet detects frozen panes that exceed the limit size at start", async () => {
  const notifyUser = jest.fn();
  fixture = makeTestFixture();
  const model = new Model({ sheets: [{ panes: { xSplit: 12, ySplit: 50 } }] });
  ({ app, parent } = await mountSpreadsheet(fixture, { model }, { notifyUser }));
  expect(notifyUser).toHaveBeenCalled();
  app.destroy();
  fixture.remove();
});

test("Warn user only once when the viewport is too small for its frozen panes", async () => {
  const notifyUser = jest.fn();
  fixture = makeTestFixture();
  ({ app, parent, model } = await mountSpreadsheet(fixture, undefined, { notifyUser }));
  expect(notifyUser).not.toHaveBeenCalled();
  freezeRows(model, 51);
  await nextTick();
  expect(notifyUser).toHaveBeenCalledTimes(1);
  //dispatching commands that do not alter the viewport/pane status and rerendering won't notify
  addRows(model, "after", 0, 1);
  await nextTick();
  expect(notifyUser).toHaveBeenCalledTimes(1);

  // resetting the status - the panes no longer exceed limit size
  freezeRows(model, 3);
  await nextTick();
  expect(notifyUser).toHaveBeenCalledTimes(1);

  // dispatching that makes the panes exceed the limit size in viewport notifies again
  freezeRows(model, 51);
  await nextTick();
  expect(notifyUser).toHaveBeenCalledTimes(2);
  app.destroy();
  fixture.remove();
});

describe("Composer interactions", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    ({ app, model, parent } = await mountSpreadsheet(fixture, {
      model: new Model({ sheets: [{ id: "sh1" }] }),
    }));
  });

  afterEach(() => {
    app.destroy();
    fixture.remove();
  });
  test("type in grid composer adds text to topbar composer", async () => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await nextTick();
    const gridComposer = document.querySelector(".o-grid .o-composer");
    const topBarComposer = document.querySelector(".o-spreadsheet-topbar .o-composer");
    expect(document.activeElement).toBe(gridComposer);
    await typeInComposerGrid("text");
    expect(topBarComposer!.textContent).toBe("text");
    expect(gridComposer!.textContent).toBe("text");
  });

  test("type in topbar composer adds text to grid composer", async () => {
    triggerMouseEvent(".o-spreadsheet-topbar .o-composer", "click");
    await nextTick();
    const topBarComposer = document.querySelector(".o-spreadsheet-topbar .o-composer");
    const gridComposer = document.querySelector(".o-grid .o-composer");
    expect(topBarComposer).not.toBeNull();
    expect(document.activeElement).toBe(topBarComposer);
    expect(gridComposer).not.toBeNull();
    await typeInComposerTopBar("text");
    await nextTick();
    expect(topBarComposer!.textContent).toBe("text");
    expect(gridComposer!.textContent).toBe("text");
  });

  test("start typing in topbar composer then continue in grid composer", async () => {
    triggerMouseEvent(".o-spreadsheet-topbar .o-composer", "click");
    await nextTick();
    const topBarComposer = document.querySelector(".o-spreadsheet-topbar .o-composer");
    const gridComposer = document.querySelector(".o-grid .o-composer");

    // Type in top bar composer
    await typeInComposerTopBar("from topbar");
    expect(topBarComposer!.textContent).toBe("from topbar");
    expect(gridComposer!.textContent).toBe("from topbar");

    // Focus grid composer and type
    triggerMouseEvent(".o-grid .o-composer", "click");
    await nextTick();
    await typeInComposerGrid("from grid");
    expect(topBarComposer!.textContent).toBe("from topbarfrom grid");
    expect(gridComposer!.textContent).toBe("from topbarfrom grid");
  });

  test("top bar composer display active cell content", async () => {
    setCellContent(model, "A2", "Hello");
    selectCell(model, "A2");
    await nextTick();
    const topBarComposer = document.querySelector(".o-spreadsheet-topbar .o-composer");
    expect(topBarComposer!.textContent).toBe("Hello");
  });

  test("top bar composer displays formatted date cell content", async () => {
    setCellContent(model, "A2", "10/10/2021");
    selectCell(model, "A2");
    await nextTick();
    const topBarComposer = document.querySelector(".o-spreadsheet-topbar .o-composer");
    expect(topBarComposer!.textContent).toBe("10/10/2021");
    // Focus top bar composer
    triggerMouseEvent(".o-spreadsheet-topbar .o-composer", "click");
    expect(topBarComposer!.textContent).toBe("10/10/2021");
  });

  test("autocomplete disappear when grid composer is blurred", async () => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await nextTick();
    const topBarComposer = document.querySelector(".o-spreadsheet-topbar .o-composer")!;
    await typeInComposerGrid("=SU");
    await nextTick();
    expect(fixture.querySelector(".o-grid .o-autocomplete-dropdown")).not.toBeNull();
    topBarComposer.dispatchEvent(new Event("click"));
    await nextTick();
    expect(fixture.querySelector(".o-grid .o-autocomplete-dropdown")).toBeNull();
  });

  test("focus top bar composer does not resize grid composer when autocomplete is displayed", async () => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await nextTick();
    const topBarComposer = document.querySelector(".o-spreadsheet-topbar .o-composer")!;
    const gridComposerContainer = document.querySelector(".o-grid-composer")! as HTMLElement;
    const spy = jest.spyOn(gridComposerContainer.style, "width", "set");
    await typeInComposerGrid("=SU");
    await nextTick();
    topBarComposer.dispatchEvent(new Event("click"));
    await nextTick();
    expect(document.activeElement).toBe(topBarComposer);
    expect(spy).not.toHaveBeenCalled();
  });

  test("selecting ranges multiple times in topbar bar does not resize grid composer", async () => {
    triggerMouseEvent(".o-spreadsheet-topbar .o-composer", "click");
    await nextTick();
    const gridComposerContainer = document.querySelector(".o-grid-composer")! as HTMLElement;
    // Type in top bar composer
    await typeInComposerTopBar("=");
    const spy = jest.spyOn(gridComposerContainer.style, "width", "set");
    await nextTick();
    selectCell(model, "B2");
    await nextTick();
    selectCell(model, "B2");
    await nextTick();
    expect(spy).not.toHaveBeenCalled();
  });

  test("The spreadsheet does not render after onbeforeunload", async () => {
    window.dispatchEvent(new Event("beforeunload", { bubbles: true }));
    await nextTick();
    createSheet(model, {});
    await nextTick();
    const sheets = document.querySelectorAll(".o-all-sheets .o-sheet");
    expect(sheets).toHaveLength(model.getters.getSheetIds().length - 1);
  });

  test("Notify ui correctly with type notification correctly use notifyUser in the env", async () => {
    const raiseError = jest.fn();
    const fixture = makeTestFixture();
    const model = new Model();
    const { app } = await mountSpreadsheet(fixture, { model }, { raiseError });
    await app.mount(fixture);
    model["config"].notifyUI({ type: "ERROR", text: "hello" });
    expect(raiseError).toHaveBeenCalledWith("hello");
    fixture.remove();
    app.destroy();
  });
});

describe("Composer / selectionInput interactions", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    ({ app, model, parent } = await mountSpreadsheet(fixture, {
      model: new Model({ sheets: [{ id: "sh1" }] }),
    }));
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      sheetId,
      ranges: toRangesData(sheetId, "B2:C4"),
      cf: {
        id: "42",
        rule: {
          type: "CellIsRule",
          operator: "Equal",
          values: ["1"],
          style: { bold: true },
        },
      },
    });
    // input some stuff in B2
    setCellContent(model, "B2", "=A1");
  });

  afterEach(() => {
    app.destroy();
    fixture.remove();
  });

  test("Switching from selection input to composer should update the highlihts", async () => {
    //open cf sidepanel
    selectCell(model, "B2");
    OPEN_CF_SIDEPANEL_ACTION(parent.env);
    await nextTick();
    await simulateClick(".o-selection-input input");

    expect(model.getters.getHighlights().map((h) => h.zone)).toEqual([toZone("B2:C4")]);
    expect(document.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(0);

    // select Composer
    await simulateClick(".o-spreadsheet-topbar .o-composer");

    expect(model.getters.getHighlights().map((h) => h.zone)).toEqual([toZone("A1")]);
    expect(document.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(1);
  });
  test.each(["A", "="])(
    "Switching from grid composer to selection input should update the highlights and hide the highlight components",
    async (composerContent) => {
      selectCell(model, "B2");
      OPEN_CF_SIDEPANEL_ACTION(parent.env);
      await nextTick();

      await startGridComposition(composerContent);
      expect(document.querySelectorAll(".o-grid-composer")).toHaveLength(1);

      // focus selection input
      await simulateClick(".o-selection-input input");

      expect(document.querySelectorAll(".o-grid-composer")).toHaveLength(0);
    }
  );

  test("Switching from composer to selection input should update the highlights and hide the highlight components", async () => {
    selectCell(model, "B2");
    OPEN_CF_SIDEPANEL_ACTION(parent.env);
    await nextTick();

    await simulateClick(".o-spreadsheet-topbar .o-composer");
    expect(model.getters.getHighlights().map((h) => h.zone)).toEqual([toZone("A1")]);
    expect(document.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(1);

    //open cf sidepanel
    await simulateClick(".o-selection-input input");

    expect(model.getters.getHighlights().map((h) => h.zone)).toEqual([toZone("B2:C4")]);
    expect(document.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(0);
  });

  test("Switching from composer to focusing a figure should resubscribe grid_selection", async () => {
    mockChart();
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
        labelRange: "Sheet1!A2:A4",
        type: "bar",
      },
      "1"
    );
    await typeInComposerTopBar("=");
    await simulateClick(".o-figure");
    await clickCell(model, "D1");
    expect(model.getters.getSelectedZones()).toEqual([toZone("D1")]);
  });

  test("Selecting a range should not scroll the viewport to the current Grid selection", async () => {
    const { top, bottom, left, right } = model.getters.getActiveMainViewport();
    await typeInComposerTopBar("=");
    // scroll
    fixture
      .querySelector(".o-grid")!
      .dispatchEvent(new WheelEvent("wheel", { deltaY: 3 * DEFAULT_CELL_HEIGHT }));
    await nextTick();
    const scrolledViewport = model.getters.getActiveMainViewport();
    expect(scrolledViewport).toMatchObject({
      left,
      right,
      top: top + 3,
      bottom: bottom + 3,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      offsetY: 3 * DEFAULT_CELL_HEIGHT,
      offsetScrollbarY: 3 * DEFAULT_CELL_HEIGHT,
    });
    await clickCell(model, "E5");
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1")]);
    expect(model.getters.getActiveMainViewport()).toMatchObject(scrolledViewport);
  });
});
