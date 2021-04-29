import { Component, hooks, tags } from "@odoo/owl";
import { Model } from "../../src";
import { Spreadsheet } from "../../src/components";
import { args, functionRegistry } from "../../src/functions";
import { DEBUG } from "../../src/helpers";
import { SelectionMode } from "../../src/plugins/ui/selection";
import { simulateClick, triggerMouseEvent } from "../dom_helper";
import {
  makeTestFixture,
  MockClipboard,
  nextTick,
  setCellContent,
  typeInComposer,
} from "../helpers";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

const { xml } = tags;
const { useRef } = hooks;

let fixture: HTMLElement;
let parent: Parent;
const clipboard = new MockClipboard();

Object.defineProperty(navigator, "clipboard", {
  get() {
    return clipboard;
  },
  configurable: true,
});

class Parent extends Component<any> {
  static template = xml`<Spreadsheet t-ref="spreadsheet" data="data"/>`;
  static components = { Spreadsheet };
  private spreadsheet: any = useRef("spreadsheet");
  readonly data: any;
  get model(): Model {
    return this.spreadsheet.comp.model;
  }

  constructor(data?) {
    super();
    this.data = data;
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
    expect((parent as any).spreadsheet.comp.env.clipboard).toBe(clipboard);
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

  test("Debug informations are removed when Spreadsheet is destroyed", async () => {
    parent["spreadsheet"].comp.destroy();
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
    await typeInComposer(gridComposer!, "text");
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
    await typeInComposer(topBarComposer!, "text");
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
    await typeInComposer(topBarComposer!, "from topbar");
    expect(topBarComposer!.textContent).toBe("from topbar");
    expect(gridComposer!.textContent).toBe("from topbar");

    // Focus grid composer and type
    triggerMouseEvent(".o-grid .o-composer", "click");
    await nextTick();
    await typeInComposer(gridComposer!, "from grid");
    expect(topBarComposer!.textContent).toBe("from topbarfrom grid");
    expect(gridComposer!.textContent).toBe("from topbarfrom grid");
  });

  test("top bar composer display active cell content", async () => {
    setCellContent(parent.model, "A2", "Hello");
    parent.model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    await nextTick();
    const topBarComposer = document.querySelector(".o-spreadsheet-topbar .o-composer");
    expect(topBarComposer!.textContent).toBe("Hello");
  });

  test("autocomplete disapear when grid composer is blured", async () => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await nextTick();
    const topBarComposer = document.querySelector(".o-spreadsheet-topbar .o-composer")!;
    const gridComposer = document.querySelector(".o-grid .o-composer")!;
    await typeInComposer(gridComposer, "=SU");
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
    const gridComposer = document.querySelector(".o-grid .o-composer")! as HTMLElement;
    const spy = jest.spyOn(gridComposerContainer.style, "width", "set");
    await typeInComposer(gridComposer, "=SU");
    await nextTick();
    topBarComposer.dispatchEvent(new Event("click"));
    await nextTick();
    expect(document.activeElement).toBe(topBarComposer);
    expect(spy).not.toHaveBeenCalled();
  });

  test("selecting ranges multiple times in topbar bar does not resize grid composer", async () => {
    triggerMouseEvent(".o-spreadsheet-topbar .o-composer", "click");
    await nextTick();
    const topBarComposer = document.querySelector(".o-spreadsheet-topbar .o-composer");
    const gridComposerContainer = document.querySelector(".o-grid-composer")! as HTMLElement;
    // Type in top bar composer
    await typeInComposer(topBarComposer!, "=");
    const spy = jest.spyOn(gridComposerContainer.style, "width", "set");
    await nextTick();
    parent.model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    await nextTick();
    parent.model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    await nextTick();
    expect(spy).not.toHaveBeenCalled();
  });
});
