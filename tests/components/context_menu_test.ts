import { Model } from "../../src/model";
import { GridParent, makeTestFixture, nextTick } from "../helpers";
import { simulateClick, triggerMouseEvent } from "../dom_helper";
import { toXC } from "../../src/helpers";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

Object.defineProperty(HTMLDivElement.prototype, "clientWidth", {
  get() {
    return 1000;
  },
  configurable: true
});
Object.defineProperty(HTMLDivElement.prototype, "clientHeight", {
  get() {
    return 1000;
  },
  configurable: true
});

function getActiveXc(model: Model): string {
  return toXC(...model.getters.getPosition());
}

function simulateContextMenu(x, y) {
  const target = document.querySelector("canvas")! as HTMLElement;
  triggerMouseEvent("canvas", "mousedown", x, y, { button: 1 });
  target.focus();
  triggerMouseEvent("canvas", "mouseup", x, y, { button: 1 });
  triggerMouseEvent("canvas", "contextmenu", x, y, { button: 1 });
}

describe("Context Menu", () => {
  test("context menu simple rendering", async () => {
    const model = new Model();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    simulateContextMenu(300, 200);
    await nextTick();
    expect(fixture.querySelector(".o-context-menu")).toMatchSnapshot();
  });

  test("right click on a cell opens a context menu", async () => {
    const model = new Model();

    const parent = new GridParent(model);
    await parent.mount(fixture);

    expect(getActiveXc(model)).toBe("A1");
    expect(fixture.querySelector(".o-context-menu")).toBeFalsy();
    simulateContextMenu(300, 200);
    expect(getActiveXc(model)).toBe("C8");
    await nextTick();
    expect(fixture.querySelector(".o-context-menu")).toBeTruthy();
  });

  test("right click on a cell, then left click elsewhere closes a context menu", async () => {
    const model = new Model();

    const parent = new GridParent(model);
    await parent.mount(fixture);

    simulateContextMenu(300, 200);
    expect(getActiveXc(model)).toBe("C8");
    await nextTick();
    expect(fixture.querySelector(".o-context-menu")).toBeTruthy();

    simulateClick("canvas", 50, 50);
    await nextTick();
    expect(fixture.querySelector(".o-context-menu")).toBeFalsy();
  });

  test("can copy/paste with context menu", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B1", text: "b1" });

    const parent = new GridParent(model);
    await parent.mount(fixture);

    // right click on B1
    simulateContextMenu(230, 30);
    expect(getActiveXc(model)).toBe("B1");
    await nextTick();

    // click on 'copy' menu item
    simulateClick(".o-context-menu div[data-name='copy']");
    await nextTick();

    // right click on B2
    simulateContextMenu(230, 50);
    await nextTick();
    expect(getActiveXc(model)).toBe("B2");

    // click on 'paste' menu item
    simulateClick(".o-context-menu div[data-name='paste']");
    await nextTick();

    expect(model.workbook.cells.B1.content).toBe("b1");
    expect(model.workbook.cells.B2.content).toBe("b1");
  });

  test("can cut/paste with context menu", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B1", text: "b1" });

    const parent = new GridParent(model);
    await parent.mount(fixture);

    // right click on B1
    simulateContextMenu(230, 30);
    expect(getActiveXc(model)).toBe("B1");
    await nextTick();

    // click on 'cut' menu item
    simulateClick(".o-context-menu div[data-name='cut']");
    await nextTick();

    // right click on B2
    simulateContextMenu(230, 50);
    await nextTick();
    expect(getActiveXc(model)).toBe("B2");

    // click on 'paste' menu item
    simulateClick(".o-context-menu div[data-name='paste']");
    await nextTick();

    expect(model.workbook.cells.B1).not.toBeDefined();
    expect(model.workbook.cells.B2.content).toBe("b1");
  });
});
