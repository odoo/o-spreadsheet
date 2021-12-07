import { Component, tags } from "@odoo/owl";
import { Model } from "../../src";
import { Spreadsheet } from "../../src/components";
import { SpreadsheetComponentAPI } from "../../src/components/spreadsheet";
import { DEFAULT_REVISION_ID } from "../../src/constants";
import { args, functionRegistry } from "../../src/functions";
import { DEBUG, toZone } from "../../src/helpers";
import { SelectionMode } from "../../src/plugins/ui/selection";
import { OPEN_CF_SIDEPANEL_ACTION } from "../../src/registries";
import { Client, SpreadsheetEnv } from "../../src/types";
import { StateUpdateMessage } from "../../src/types/collaborative/transport_service";
import { createSheet, selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { simulateClick, triggerMouseEvent } from "../test_helpers/dom_helper";
import {
  makeTestFixture,
  MockClipboard,
  nextTick,
  target,
  typeInComposerGrid,
  typeInComposerTopBar,
} from "../test_helpers/helpers";

jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

const { xml } = tags;

let fixture: HTMLElement;
let parent: Parent;
const clipboard = new MockClipboard();

Object.defineProperty(navigator, "clipboard", {
  get() {
    return clipboard;
  },
  configurable: true,
});

jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 1000);
jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 1000);

class Parent extends Component<any> {
  static template = xml/* xml */ `
    <Spreadsheet data="data"
                 client="client"
                 exposeAPI="(api) => this.spreadsheetAPI = api" />
  `;
  static components = { Spreadsheet };
  spreadsheetAPI: SpreadsheetComponentAPI | undefined;
  readonly data: any;
  readonly client: Client;

  getEnv(): SpreadsheetEnv {
    if (!this.spreadsheetAPI) {
      throw new Error("API not yet set");
    }
    return this.spreadsheetAPI.getEnv();
  }

  get model(): Model {
    if (!this.spreadsheetAPI) {
      throw new Error("API not yet set");
    }
    return this.spreadsheetAPI.getModel();
  }

  constructor(data?, client?) {
    super();
    this.data = data;
    this.client = client;
  }
}

beforeEach(async () => {
  fixture = makeTestFixture();
  parent = new Parent({
    sheets: [
      {
        id: 1,
      },
    ],
  });
  await parent.mount(fixture);
});

afterEach(() => {
  parent.destroy();
  fixture.remove();
});

describe("Spreadsheet", () => {
  test("simple rendering snapshot", async () => {
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet")).toMatchSnapshot();
  });

  test("focus is properly set, initially and after switching sheet", async () => {
    expect(document.activeElement!.tagName).toEqual("CANVAS");
    document.querySelector(".o-add-sheet")!.dispatchEvent(new Event("click"));
    // simulate the fact that a user clicking on the add sheet button will
    // move the focus to the document.body
    (document.activeElement as any).blur();
    await nextTick();
    expect(document.querySelectorAll(".o-sheet").length).toBe(2);
    expect(document.activeElement!.tagName).toEqual("CANVAS");
  });

  test("Can use the env in a function", () => {
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
    setCellContent(parent.model, "A1", "=GETACTIVESHEET()");
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
    const parent = new Parent({
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
    });
    await parent.mount(fixture);
    expect(env).toBeTruthy();
  });

  test("Clipboard is in spreadsheet env", () => {
    expect(parent.getEnv().clipboard).toBe(clipboard);
  });

  test("selection mode is changed with a simple select", async () => {
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.idle);
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.selecting);
    triggerMouseEvent(window, "mouseup", 300, 200);
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.idle);
  });

  test("selection mode is changed when selecting with CTRL pressed", async () => {
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.idle);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Control", ctrlKey: true, bubbles: true })
    );
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.readyToExpand);
    triggerMouseEvent("canvas", "mousedown", 300, 200, { ctrlKey: true });
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.expanding);
    triggerMouseEvent(window, "mouseup", 300, 200, { ctrlKey: true });
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.readyToExpand);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keyup", { key: "Control", bubbles: true })
    );
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.idle);
  });

  test("selection mode is changed when releasing CTRL while selecting", async () => {
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.idle);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Control", ctrlKey: true, bubbles: true })
    );
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.readyToExpand);
    triggerMouseEvent("canvas", "mousedown", 300, 200, { ctrlKey: true });
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keyup", { key: "Control", bubbles: true })
    );
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.expanding);
    triggerMouseEvent(window, "mouseup", 300, 200);
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.idle);
  });

  test("selection mode is changed when pressing CTRL while selecting", async () => {
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.idle);
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.selecting);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Control", ctrlKey: true, bubbles: true })
    );
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.expanding);
    triggerMouseEvent(window, "mouseup", 300, 200, { ctrlKey: true });
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.readyToExpand);
  });

  test("repeating CTRL keydown events does not trigger command", async () => {
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.idle);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Control", ctrlKey: true, bubbles: true, repeat: true })
    );
    expect(parent.model.getters.getSelectionMode()).toBe(SelectionMode.idle);
  });

  test("Debug information are removed when Spreadsheet is destroyed", async () => {
    Object.values(parent.__owl__.children)[0].destroy();
    expect(Object.keys(DEBUG)).toHaveLength(0);
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
    const parent = new Parent({}, client);
    await parent.mount(fixture);
    expect(parent.model.getters.getClient()).toEqual(client);
    parent.destroy();
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
    expect(topBarComposer).toBeDefined();
    expect(document.activeElement).toBe(topBarComposer);
    expect(gridComposer).toBeDefined();
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

  test("autocomplete disapear when grid composer is blured", async () => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await nextTick();
    const topBarComposer = document.querySelector(".o-spreadsheet-topbar .o-composer")!;
    await typeInComposerGrid("=SU");
    expect(fixture.querySelector(".o-grid .o-autocomplete-dropdown")).toBeDefined();
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

  test("The activate sheet is the sheet in first position, after replaying commands", async () => {
    class Parent extends Component<any> {
      static template = xml/* xml */ `
        <Spreadsheet data="data"
                     exposeAPI="(api) => this.spreadsheetAPI = api"
                     stateUpdateMessages="stateUpdateMessages"/>
      `;
      static components = { Spreadsheet };
      spreadsheetAPI: SpreadsheetComponentAPI | undefined;
      readonly data: any = { sheets: [{ id: "1" }, { id: "2" }] };
      readonly stateUpdateMessages: StateUpdateMessage[] = [
        {
          type: "REMOTE_REVISION",
          version: 1,
          serverRevisionId: DEFAULT_REVISION_ID,
          nextRevisionId: "NEXT",
          clientId: "alice",
          commands: [{ type: "MOVE_SHEET", sheetId: "1", direction: "right" }],
        },
      ];

      get model(): Model {
        if (!this.spreadsheetAPI) {
          throw new Error("API not loaded");
        }
        return this.spreadsheetAPI.getModel();
      }
    }

    fixture = makeTestFixture();
    const container = new Parent();
    await container.mount(fixture);
    expect(container.model.getters.getActiveSheetId()).toBe("2");
  });
});

describe("Composer / selectionInput interactions", () => {
  beforeEach(() => {
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
    OPEN_CF_SIDEPANEL_ACTION(parent.getEnv());
    await nextTick();
    await simulateClick(".o-selection-input input");

    expect(parent.model.getters.getHighlights().map((h) => h.zone)).toEqual([toZone("B2:C4")]);
    expect(document.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(0);

    // select Composer
    await simulateClick(".o-spreadsheet-topbar .o-composer");

    expect(parent.model.getters.getHighlights().map((h) => h.zone)).toEqual([toZone("A1")]);
    expect(document.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(1);
  });
  test("Switching from composer to selection input should update the highlihts and hide the highlight components", async () => {
    selectCell(parent.model, "B2");
    OPEN_CF_SIDEPANEL_ACTION(parent.getEnv());
    await nextTick();

    await simulateClick(".o-spreadsheet-topbar .o-composer");
    expect(parent.model.getters.getHighlights().map((h) => h.zone)).toEqual([toZone("A1")]);
    expect(document.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(1);

    //open cf sidepanel
    await simulateClick(".o-selection-input input");

    expect(parent.model.getters.getHighlights().map((h) => h.zone)).toEqual([toZone("B2:C4")]);
    expect(document.querySelectorAll(".o-spreadsheet .o-highlight")).toHaveLength(0);
  });
});
