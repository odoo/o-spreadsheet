import { args, functionRegistry } from "../../src/functions";
import { DEBUG } from "../../src/helpers";
import { SelectionMode } from "../../src/plugins/selection";
import { simulateClick, triggerMouseEvent } from "../dom_helper";
import { makeTestFixture, MockClipboard, nextTick, SpreadSheetParent } from "../helpers";

let fixture: HTMLElement;
let parent: SpreadSheetParent;
const clipboard = new MockClipboard();

Object.defineProperty(navigator, "clipboard", {
  get() {
    return clipboard;
  },
  configurable: true,
});

beforeEach(async () => {
  fixture = makeTestFixture();
  parent = new SpreadSheetParent({
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
  parent.destroy();
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
    const parent = new SpreadSheetParent({
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
    expect(parent.model.getters.getEditionMode()).toBe("editing");
    expect(parent.model.getters.getCurrentContent()).toBe("d");
  });
});
