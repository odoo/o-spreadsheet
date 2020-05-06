import { Model } from "../../src/model";
import { makeTestFixture, GridParent, nextTick } from "../helpers";
import { triggerMouseEvent } from "../dom_helper";
import { CommandResult } from "../../src/types/commands";

Object.defineProperty(HTMLDivElement.prototype, "clientWidth", {
  get() {
    return 1000;
  },
  configurable: true,
});
Object.defineProperty(HTMLDivElement.prototype, "clientHeight", {
  get() {
    return 1000;
  },
  configurable: true,
});

let fixture: HTMLElement;
let model: Model;
let parent: GridParent;

beforeEach(async () => {
  fixture = makeTestFixture();
  model = new Model();
  parent = new GridParent(model);
  await parent.mount(fixture);
});

afterEach(() => {
  fixture.remove();
});

describe("Autofill component", () => {
  test("Can drag and drop autofill on columns", async () => {
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(autofill, "mousemove", 0, parent.env.getters.getRow(1).end + 10);
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("AUTOFILL_SELECT", { col: 0, row: 1 });
    triggerMouseEvent(autofill, "mouseup");
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("AUTOFILL");
  });

  test("Can drag and drop autofill on rows", async () => {
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(autofill, "mousemove", parent.env.getters.getCol(1).end + 10, 0);
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("AUTOFILL_SELECT", { col: 1, row: 0 });
    triggerMouseEvent(autofill, "mouseup");
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("AUTOFILL");
  });

  test("Can auto-autofill with dblclick", async () => {
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "dblclick", 4, 4);
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("AUTOFILL_AUTO");
  });

  test("Can display tooltip with autofill", async () => {
    const autofill = fixture.querySelector(".o-autofill");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    model.dispatch("SET_VALUE", { xc: "A1", text: "test" });
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(autofill, "mousemove", 0, parent.env.getters.getRow(1).end + 10);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeDefined();
    expect(fixture.querySelector(".o-autofill-nextvalue")!.textContent).toBe("test");
  });
});
