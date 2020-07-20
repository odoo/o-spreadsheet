import { Component, hooks, tags } from "@odoo/owl";
import { Spreadsheet } from "../../src/components";
import { args, functionRegistry } from "../../src/functions";
import { makeTestFixture, nextTick, MockClipboard } from "../helpers";
import { Model } from "../../src";
import { SelectionMode } from "../../src/plugins/selection";
import { triggerMouseEvent } from "../dom_helper";

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
  parent = new Parent();
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
    parent.model.dispatch("SET_VALUE", { xc: "A1", text: "=GETACTIVESHEET()" });
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
});
