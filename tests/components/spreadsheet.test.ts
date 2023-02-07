import { Model } from "../../src";
import { Spreadsheet } from "../../src/components";
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
  click,
  clickCell,
  getElComputedStyle,
  rightClickCell,
  simulateClick,
} from "../test_helpers/dom_helper";
import { getCellContent } from "../test_helpers/getters_helpers";
import {
  mountSpreadsheet,
  nextTick,
  restoreDefaultFunctions,
  startGridComposition,
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

describe("Simple Spreadsheet Component", () => {
  // default model and env
  beforeEach(async () => {
    ({ model, parent, fixture } = await mountSpreadsheet({
      model: new Model({ sheets: [{ id: "sh1" }] }),
    }));
  });

  test("simple rendering snapshot", async () => {
    expect(fixture.querySelector(".o-spreadsheet")).toMatchSnapshot();
  });

  test("focus is properly set, initially and after switching sheet", async () => {
    expect(document.activeElement!.tagName).toEqual("INPUT");
    await click(fixture, ".o-add-sheet");
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

    const dropdownEL = fixture.querySelector(".o-dropdown-button")!;
    await click(dropdownEL);
    const dropDownZIndex = getZIndex(".o-dropdown-content");

    await rightClickCell(model, "A1");
    const contextMenuZIndex = getZIndex(".o-popover");

    await typeInComposerGrid("=A1:B2");
    const gridComposerZIndex = getZIndex("div.o-grid-composer");
    const highlighZIndex = getZIndex(".o-highlight");

    await click(fixture.querySelectorAll(".o-tool.o-dropdown-button.o-with-color")[0]);
    const colorPickerZIndex = getZIndex("div.o-color-picker");

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
    expect(scrollbarCornerZIndex).toBeLessThan(dropDownZIndex);
    expect(dropDownZIndex).toBeLessThan(gridComposerZIndex);
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

  test("The spreadsheet does not render after onbeforeunload", async () => {
    window.dispatchEvent(new Event("beforeunload", { bubbles: true }));
    await nextTick();
    createSheet(model, {});
    await nextTick();
    const sheets = document.querySelectorAll(".o-all-sheets .o-sheet");
    expect(sheets).toHaveLength(model.getters.getSheetIds().length - 1);
  });
});

test("Can instantiate a spreadsheet with a given client id-name", async () => {
  const client = { id: "alice", name: "Alice" };

  ({ parent, model, fixture } = await mountSpreadsheet({
    model: new Model({}, { client }),
  }));
  expect(model.getters.getClient()).toEqual(client);
});

test("Spreadsheet detects frozen panes that exceed the limit size at start", async () => {
  const notifyUser = jest.fn();
  const model = new Model({ sheets: [{ panes: { xSplit: 12, ySplit: 50 } }] });
  ({ parent, fixture } = await mountSpreadsheet({ model }, { notifyUser }));
  expect(notifyUser).toHaveBeenCalled();
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

test("Notify ui correctly with type notification correctly use notifyUser in the env", async () => {
  const raiseError = jest.fn();
  ({ model, fixture } = await mountSpreadsheet(undefined, { raiseError }));
  model["config"].notifyUI({ type: "ERROR", text: "hello" });
  expect(raiseError).toHaveBeenCalledWith("hello");
});

describe("Composer / selectionInput interactions", () => {
  const modelDataCf = {
    sheets: [
      {
        id: "sh1",
        cells: { B2: { content: "=A1" } },
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
    ({ model, parent, fixture } = await mountSpreadsheet({
      model: new Model(modelDataCf),
    }));
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
});
