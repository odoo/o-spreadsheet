import { Model, setDefaultSheetViewSize, Spreadsheet } from "../../src";
import { OPEN_CF_SIDEPANEL_ACTION } from "../../src/actions/menu_items_actions";
import { ComposerStore } from "../../src/components/composer/composer/composer_store";
import { DEBOUNCE_TIME, getDefaultSheetViewSize } from "../../src/constants";
import { functionRegistry } from "../../src/functions";
import { toZone } from "../../src/helpers";
import { HighlightStore } from "../../src/stores/highlight_store";
import { SpreadsheetChildEnv } from "../../src/types";
import {
  addRows,
  createChart,
  freezeRows,
  selectCell,
  setCellContent,
} from "../test_helpers/commands_helpers";
import {
  click,
  clickCell,
  getElComputedStyle,
  hoverCell,
  keyDown,
  rightClickCell,
  simulateClick,
} from "../test_helpers/dom_helper";
import { getCellContent } from "../test_helpers/getters_helpers";
import {
  doAction,
  mockChart,
  mountSpreadsheet,
  nextTick,
  restoreDefaultFunctions,
  startGridComposition,
  typeInComposerGrid,
  typeInComposerTopBar,
} from "../test_helpers/helpers";

jest.mock("../../src/components/composer/content_editable_helper.ts", () =>
  require("../__mocks__/content_editable_helper")
);

let fixture: HTMLElement;
let parent: Spreadsheet;
let model: Model;
let env: SpreadsheetChildEnv;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});
describe("Simple Spreadsheet Component", () => {
  test("simple rendering snapshot", async () => {
    ({ model, parent, fixture } = await mountSpreadsheet({
      model: new Model({ sheets: [{ id: "sh1" }] }),
    }));
    expect(fixture.querySelector(".o-spreadsheet")).toMatchSnapshot();
  });

  test("focus is properly set, initially and after switching sheet", async () => {
    ({ model, fixture } = await mountSpreadsheet({
      model: new Model({ sheets: [{ id: "sh1" }] }),
    }));
    const defaultComposer = fixture.querySelector(".o-grid div.o-composer");
    expect(document.activeElement).toBe(defaultComposer);
    document.querySelector(".o-add-sheet")!.dispatchEvent(new Event("click"));
    await nextTick();
    expect(document.querySelectorAll(".o-sheet").length).toBe(2);
    expect(document.activeElement).toBe(defaultComposer);
    await simulateClick(document.querySelectorAll(".o-sheet")[1]);
    expect(document.activeElement).toBe(defaultComposer);
  });

  describe("Use of env in a function", () => {
    beforeAll(() => {
      functionRegistry.add("GETACTIVESHEET", {
        description: "Get the name of the current sheet",
        compute: function () {
          env = this.env;
          return "Sheet";
        },
        args: [],
        returns: ["STRING"],
      });
    });

    afterAll(() => {
      restoreDefaultFunctions();
    });

    test("Can use  an external dependency in a function", () => {
      const model = new Model({ sheets: [{ id: 1 }] }, { custom: { env: { myKey: [] } } });
      setCellContent(model, "A1", "=GETACTIVESHEET()");
      expect(getCellContent(model, "A1")).toBe("Sheet");
      expect(env).toMatchObject({ myKey: [] });
    });

    test("Can use an external dependency in a function at model start", async () => {
      await mountSpreadsheet({
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
          { custom: { env: { myKey: [] } } }
        ),
      });
      expect(env).toMatchObject({ myKey: [] });
    });
  });

  test("Clipboard is in spreadsheet env", async () => {
    ({ env } = await mountSpreadsheet({
      model: new Model({ sheets: [{ id: "sh1" }] }),
    }));
    expect(env.clipboard!["clipboard"]).toBe(navigator.clipboard);
  });

  test("typing opens composer after toolbar clicked", async () => {
    ({ model, parent, fixture } = await mountSpreadsheet());
    const composerStore = parent.env.getStore(ComposerStore);
    await simulateClick(`span[title="Bold (Ctrl+B)"]`);
    expect(document.activeElement).not.toBeNull();
    await typeInComposerGrid("d");
    expect(composerStore.editionMode).toBe("editing");
    expect(composerStore.currentContent).toBe("d");
  });

  test("can open/close search with ctrl+h", async () => {
    ({ model, parent, fixture } = await mountSpreadsheet());
    await keyDown({ key: "H", ctrlKey: true });
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
    await keyDown({ key: "H", ctrlKey: true });
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(0);
  });

  test("can open/close search with ctrl+f", async () => {
    ({ model, parent, fixture } = await mountSpreadsheet());
    await keyDown({ key: "F", ctrlKey: true });
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
    await nextTick();
    await keyDown({ key: "F", ctrlKey: true });
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(0);
  });

  test("Mac user use metaKey, not CtrlKey", async () => {
    ({ model, parent, fixture } = await mountSpreadsheet({
      model: new Model({ sheets: [{ id: "sh1" }] }),
    }));
    const mockUserAgent = jest.spyOn(navigator, "userAgent", "get");
    mockUserAgent.mockImplementation(
      () => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0"
    );
    await keyDown({ key: "F", ctrlKey: true, bubbles: true });
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(0);
    await nextTick();
    await keyDown({ key: "F", metaKey: true, bubbles: true });
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
    jest.restoreAllMocks();
  });

  test("Z-indexes of the various spreadsheet components", async () => {
    jest.useFakeTimers();
    ({ model, fixture } = await mountSpreadsheet());
    const getZIndex = (selector: string) => Number(getElComputedStyle(selector, "zIndex")) || 0;
    mockChart();
    const gridZIndex = getZIndex(".o-grid");
    const vScrollbarZIndex = getZIndex(".o-scrollbar.vertical");
    const hScrollbarZIndex = getZIndex(".o-scrollbar.horizontal");
    const scrollbarCornerZIndex = getZIndex(".o-scrollbar.corner");

    const dropdownEL = fixture.querySelector(".o-menu-item-button[title='Vertical align']")!;
    await click(dropdownEL);
    const dropDownZIndex = getZIndex(".o-dropdown-content");

    setCellContent(model, "A1", "=SUM()");
    await nextTick();
    await hoverCell(model, "A1", 400);
    const gridPopoverZIndex = getZIndex(".o-popover");

    await rightClickCell(model, "A1");
    const popoverZIndex = getZIndex(".o-popover");

    await typeInComposerGrid("=A1:B2");
    const gridComposerZIndex = getZIndex("div.o-grid-composer");
    const highlighZIndex = getZIndex(".o-highlight");

    await typeInComposerTopBar("=SUM(A1,A2)");
    const topBarComposerZIndex = getZIndex(".o-topbar-composer");

    createChart(model, {}, "thisIsAnId");
    model.dispatch("SELECT_FIGURE", { id: "thisIsAnId" });
    await nextTick();
    const figureZIndex = getZIndex(".o-figure-wrapper");
    const figureAnchorZIndex = getZIndex(".o-fig-anchor");

    expect(gridZIndex).toBeLessThan(highlighZIndex);
    expect(highlighZIndex).toBeLessThan(figureZIndex);
    expect(figureZIndex).toBeLessThan(vScrollbarZIndex);
    expect(vScrollbarZIndex).toEqual(hScrollbarZIndex);
    expect(hScrollbarZIndex).toEqual(scrollbarCornerZIndex);
    expect(scrollbarCornerZIndex).toBeLessThan(gridComposerZIndex);
    expect(gridPopoverZIndex).toBeLessThan(gridComposerZIndex);
    expect(gridComposerZIndex).toBeLessThan(dropDownZIndex);
    expect(dropDownZIndex).toBeLessThan(topBarComposerZIndex);
    expect(topBarComposerZIndex).toBeLessThan(popoverZIndex);
    expect(popoverZIndex).toBeLessThan(figureAnchorZIndex);
    jest.useRealTimers();
  });

  test("Keydown is ineffective in dashboard mode", async () => {
    ({ model, parent, fixture } = await mountSpreadsheet());
    const spreadsheetKeyDown = jest.spyOn(parent, "onKeydown");
    // const spreadsheetDiv = fixture.querySelector(".o-spreadsheet")!;
    keyDown({ key: "H", ctrlKey: true });
    expect(spreadsheetKeyDown).toHaveBeenCalled();
    jest.clearAllMocks();
    model.updateMode("dashboard");
    await nextTick();
    keyDown({ key: "H", ctrlKey: true });
    expect(spreadsheetKeyDown).not.toHaveBeenCalled();
  });

  test("Insert a function properly sets the edition", async () => {
    ({ model, parent, fixture, env } = await mountSpreadsheet());
    const composerStore = env.getStore(ComposerStore);
    const spyStartEdition = jest.spyOn(composerStore, "startEdition");
    const spySetCurrentContent = jest.spyOn(composerStore, "setCurrentContent");
    doAction(["insert", "insert_function", "insert_function_sum"], env);
    expect(spyStartEdition).toHaveBeenCalledWith("=SUM(", undefined);
    doAction(["insert", "insert_function", "insert_function_sum"], env);
    expect(spySetCurrentContent).toHaveBeenCalledWith("=SUM(", undefined);
  });
});

test("Can instantiate a spreadsheet with a given client id-name", async () => {
  const client = { id: "alice", name: "Alice" };
  ({ model } = await mountSpreadsheet({ model: new Model({}, { client }) }));
  expect(model.getters.getClient()).toEqual(client);

  // Validate that after the move debounce has run, the client has a position ad
  // additional property
  jest.advanceTimersByTime(DEBOUNCE_TIME + 1);
  expect(model.getters.getClient()).toEqual({
    id: "alice",
    name: "Alice",
    position: {
      col: 0,
      row: 0,
      sheetId: "Sheet1",
    },
  });
});

test("Spreadsheet detects frozen panes that exceed the limit size at start", async () => {
  const notifyUser = jest.fn();
  const model = new Model({ sheets: [{ panes: { xSplit: 12, ySplit: 50 } }] });
  ({ parent, fixture } = await mountSpreadsheet({ model }, { notifyUser }));
  expect(notifyUser).toHaveBeenCalled();
});

test("Warns user when viewport is too small for frozen panes but stops warning after resizing/Unmounted", async () => {
  const originalViewSize = getDefaultSheetViewSize();

  // Setting the sheet viewport size to 0 to represent the "real life" scenario where the default size is 0
  setDefaultSheetViewSize(0);
  const notifyUser = jest.fn();
  const model = new Model({ sheets: [{ panes: { xSplit: 0, ySplit: 20 } }] });
  ({ parent, fixture } = await mountSpreadsheet({ model }, { notifyUser }));
  expect(notifyUser).toHaveBeenCalledTimes(0);

  setDefaultSheetViewSize(originalViewSize);
});

test("Warn user only once when the viewport is too small for its frozen panes", async () => {
  const notifyUser = jest.fn();
  ({ parent, model, fixture } = await mountSpreadsheet(undefined, { notifyUser }));
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
});

test("Raise error to ui use 'raiseError' in the env", async () => {
  const raiseError = jest.fn();
  ({ model, fixture } = await mountSpreadsheet(undefined, { raiseError }));
  model["config"].raiseBlockingErrorUI("windows has detected that your monitor is not plugged in");
  expect(raiseError).toHaveBeenCalledWith(
    "windows has detected that your monitor is not plugged in"
  );
});

test("Notify ui correctly, with type notification correctly use notifyUser in the env", async () => {
  const notifyUser = jest.fn();
  ({ model, fixture } = await mountSpreadsheet(undefined, { notifyUser }));
  model["config"].notifyUI({
    text: "hello",
    type: "info",
    sticky: false,
  });
  expect(notifyUser).toHaveBeenCalledWith({
    text: "hello",
    type: "info",
    sticky: false,
  });
});

test("grid should regain focus after a topbar menu option is selected", async () => {
  ({ parent, fixture } = await mountSpreadsheet());
  expect(document.activeElement!.classList).toContain("o-composer");
  await click(fixture, ".o-topbar-menu[data-id='format']");
  await simulateClick(".o-menu-item[title='Bold']");
  expect(document.activeElement!.classList).toContain("o-composer");
});

describe("Composer / selectionInput interactions", () => {
  const modelDataCf = {
    sheets: [
      {
        id: "sh1",
        cells: { B2: { content: "=A1+A2" } },
        conditionalFormats: [
          {
            id: "42",
            rule: { type: "CellIsRule", operator: "Equal", values: ["1"], style: { bold: true } },
            ranges: ["B2:C4"],
          },
        ],
      },
    ],
  };
  beforeEach(async () => {
    ({ model, parent, fixture, env } = await mountSpreadsheet({
      model: new Model(modelDataCf),
    }));
  });

  test("Switching from selection input to composer should update the highlihts", async () => {
    const composerStore = env.getStore(ComposerStore);
    //open cf sidepanel
    selectCell(model, "B2");
    OPEN_CF_SIDEPANEL_ACTION(env);
    await nextTick();
    await simulateClick(".o-selection-input input");

    expect(env.getStore(HighlightStore).highlights.map((h) => h.zone)).toEqual([toZone("B2:C4")]);
    expect(composerStore.highlights).toEqual([]);
    expect(fixture.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(1);

    // select Composer
    await simulateClick(".o-spreadsheet-topbar .o-composer");

    expect(env.getStore(HighlightStore).highlights.map((h) => h.zone)).toEqual([
      toZone("A1"),
      toZone("A2"),
    ]);
    expect(fixture.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(2);
  });
  test.each(["A", "="])(
    "Switching from grid composer to selection input should update the highlights and hide the highlight components",
    async (composerContent) => {
      selectCell(model, "B2");
      OPEN_CF_SIDEPANEL_ACTION(env);
      await nextTick();

      await startGridComposition(composerContent);
      expect(fixture.querySelectorAll(".o-grid-composer")).toHaveLength(1);

      // focus selection input
      await simulateClick(".o-selection-input input");
      expect(env.getStore(ComposerStore).editionMode).toBe("inactive");
    }
  );

  test("Switching from composer to selection input should update the highlights and the highlight components", async () => {
    const highlightStore = env.getStore(HighlightStore);
    selectCell(model, "B2");
    OPEN_CF_SIDEPANEL_ACTION(env);
    await nextTick();

    await simulateClick(".o-spreadsheet-topbar .o-composer");
    expect(highlightStore.highlights.map((h) => h.zone)).toEqual([toZone("A1"), toZone("A2")]);
    expect(fixture.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(2);

    //open cf sidepanel
    await simulateClick(".o-selection-input input");

    expect(highlightStore.highlights.map((h) => h.zone)).toEqual([toZone("B2:C4")]);
    expect(fixture.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(1);
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

  test("switching to selection input deactivates the autofill", async () => {
    selectCell(model, "B2");
    OPEN_CF_SIDEPANEL_ACTION(env);
    await nextTick();

    expect(fixture.querySelector(".o-autofill")).not.toBeNull();
    await simulateClick(".o-selection-input input");
    expect(fixture.querySelector(".o-autofill")).toBeNull();
  });
});
test("cell popovers to be closed on clicking outside grid", async () => {
  jest.useFakeTimers();
  ({ model, fixture } = await mountSpreadsheet());

  setCellContent(model, "A1", "=SUM(");
  await nextTick();
  await hoverCell(model, "A1", 400);
  expect(fixture.querySelector(".o-popover .o-error-tooltip")).not.toBeNull();
  await simulateClick(".o-topbar-menu");
  expect(fixture.querySelector(".o-popover .o-error-tooltip")).toBeNull();
  jest.useRealTimers();
});
