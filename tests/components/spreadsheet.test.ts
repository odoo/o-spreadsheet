import { App } from "@odoo/owl";
import { Model } from "../../src";
import { Spreadsheet } from "../../src/components";
import { args, functionRegistry } from "../../src/functions";
import { toZone } from "../../src/helpers";
import { OPEN_CF_SIDEPANEL_ACTION } from "../../src/registries";
import {
  createChart,
  createSheet,
  selectCell,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { clickCell, simulateClick, triggerMouseEvent } from "../test_helpers/dom_helper";
import {
  makeTestFixture,
  MockClipboard,
  mountSpreadsheet,
  nextTick,
  startGridComposition,
  target,
  typeInComposerGrid,
  typeInComposerTopBar,
} from "../test_helpers/helpers";
import { mockChart } from "./__mocks__/chart";

jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

let fixture: HTMLElement;
let parent: Spreadsheet;
let app: App;
const clipboard = new MockClipboard();

Object.defineProperty(navigator, "clipboard", {
  get() {
    return clipboard;
  },
  configurable: true,
});

jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 1000);
jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 1000);

beforeEach(async () => {
  fixture = makeTestFixture();
  const model = new Model({ sheets: [{ id: 1 }] });
  ({ app, parent } = await mountSpreadsheet(fixture, { model }));
});

afterEach(() => {
  app.destroy();
  fixture.remove();
});

describe("Spreadsheet", () => {
  test("simple rendering snapshot", async () => {
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet")).toMatchSnapshot();
  });

  test("focus is properly set, initially and after switching sheet", async () => {
    expect(document.activeElement!.className).toEqual("o-grid-overlay");
    document.querySelector(".o-add-sheet")!.dispatchEvent(new Event("click"));
    // simulate the fact that a user clicking on the add sheet button will
    // move the focus to the document.body
    (document.activeElement as any).blur();
    await nextTick();
    expect(document.querySelectorAll(".o-sheet").length).toBe(2);
    expect(document.activeElement!.className).toEqual("o-grid-overlay");
  });

  test("Can use the env in a function", () => {
    let env;
    const model = new Model({ sheets: [{ id: 1 }] }, { evalContext: { env: {} } });
    functionRegistry.add("GETACTIVESHEET", {
      description: "Get the name of the current sheet",
      compute: function () {
        env = this.env;
        return "Sheet";
      },
      args: args(``),
      returns: ["STRING"],
    });
    setCellContent(model, "A1", "=GETACTIVESHEET()");
    expect(env).toBeTruthy();
  });

  test("Can use the env in a function at model start", async () => {
    let env;
    functionRegistry.add("GETACTIVESHEET", {
      description: "Get the name of the current sheet",
      compute: function () {
        env = this.env;
        return "Sheet";
      },
      args: args(``),
      returns: ["STRING"],
    });
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
        { evalContext: { env: {} } }
      ),
    });
    expect(env).toBeTruthy();
  });

  test("Clipboard is in spreadsheet env", () => {
    expect(parent.env.clipboard).toBe(clipboard);
  });

  test("typing opens composer after toolbar clicked", async () => {
    await simulateClick(`div[title="Bold"]`);
    expect(document.activeElement).not.toBeNull();
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "d", bubbles: true })
    );
    await nextTick();
    expect(parent.model.getters.getEditionMode()).toBe("editing");
    expect(parent.model.getters.getCurrentContent()).toBe("d");
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

  test("Can instantiate a spreadsheet with a given client id-name", async () => {
    const client = { id: "alice", name: "Alice" };
    ({ app, parent } = await mountSpreadsheet(fixture, { model: new Model({}, { client }) }));
    expect(parent.model.getters.getClient()).toEqual(client);
    app.destroy();
  });
});

describe("Composer interactions", () => {
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
    setCellContent(parent.model, "A2", "Hello");
    selectCell(parent.model, "A2");
    await nextTick();
    const topBarComposer = document.querySelector(".o-spreadsheet-topbar .o-composer");
    expect(topBarComposer!.textContent).toBe("Hello");
  });

  test("top bar composer displays formatted date cell content", async () => {
    setCellContent(parent.model, "A2", "10/10/2021");
    selectCell(parent.model, "A2");
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
    selectCell(parent.model, "B2");
    await nextTick();
    selectCell(parent.model, "B2");
    await nextTick();
    expect(spy).not.toHaveBeenCalled();
  });

  test("The spreadsheet does not render after onbeforeunload", async () => {
    window.dispatchEvent(new Event("beforeunload", { bubbles: true }));
    await nextTick();
    createSheet(parent.model, {});
    await nextTick();
    const sheets = document.querySelectorAll(".o-all-sheets .o-sheet");
    expect(sheets).toHaveLength(parent.model.getters.getVisibleSheets().length - 1);
  });

  test("Notify ui correctly with type notification correctly use notifyUser in the env", async () => {
    const notifyUser = jest.fn();
    const fixture = makeTestFixture();
    const model = new Model();
    const { app } = await mountSpreadsheet(fixture, { model: model }, { notifyUser: notifyUser });
    await app.mount(fixture);
    model["config"].notifyUI({ type: "NOTIFICATION", text: "hello" });
    expect(notifyUser).toHaveBeenCalledWith("hello");
    fixture.remove();
    app.destroy();
  });
});

describe("Composer / selectionInput interactions", () => {
  beforeEach(async () => {
    parent.model.dispatch("ADD_CONDITIONAL_FORMAT", {
      sheetId: parent.model.getters.getActiveSheetId(),
      target: target("B2:C4"),
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
    setCellContent(parent.model, "B2", "=A1");
  });

  test("Switching from selection input to composer should update the highlihts", async () => {
    //open cf sidepanel
    selectCell(parent.model, "B2");
    OPEN_CF_SIDEPANEL_ACTION(parent.env);
    await nextTick();
    await simulateClick(".o-selection-input input");

    expect(parent.model.getters.getHighlights().map((h) => h.zone)).toEqual([toZone("B2:C4")]);
    expect(document.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(0);

    // select Composer
    await simulateClick(".o-spreadsheet-topbar .o-composer");

    expect(parent.model.getters.getHighlights().map((h) => h.zone)).toEqual([toZone("A1")]);
    expect(document.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(1);
  });
  test.each(["A", "="])(
    "Switching from grid composer to selection input should update the highlights and hide the highlight components",
    async (composerContent) => {
      selectCell(parent.model, "B2");
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
    selectCell(parent.model, "B2");
    OPEN_CF_SIDEPANEL_ACTION(parent.env);
    await nextTick();

    await simulateClick(".o-spreadsheet-topbar .o-composer");
    expect(parent.model.getters.getHighlights().map((h) => h.zone)).toEqual([toZone("A1")]);
    expect(document.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(1);

    //open cf sidepanel
    await simulateClick(".o-selection-input input");

    expect(parent.model.getters.getHighlights().map((h) => h.zone)).toEqual([toZone("B2:C4")]);
    expect(document.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(0);
  });

  test("Switching from composer to focusing a figure should resubscribe grid_selection", async () => {
    const model = parent.model;
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
