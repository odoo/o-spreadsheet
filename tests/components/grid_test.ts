import { Model } from "../../src/model";
import { makeTestFixture, GridParent, nextTick, getActiveXc, getCell } from "../helpers";
import { toZone } from "../../src/helpers/index";
import { triggerMouseEvent } from "../dom_helper";
jest.mock("../../src/components/composer/content_editable_helper");

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
});

afterEach(() => {
  fixture.remove();
});

describe("Grid component", () => {
  beforeEach(async () => {
    model = new Model();
    parent = new GridParent(model);
    await parent.mount(fixture);
  });

  test("simple rendering snapshot", async () => {
    expect(fixture.querySelector(".o-grid")).toMatchSnapshot();
  });

  test("can render a sheet with a merge", async () => {
    model.dispatch("ADD_MERGE", { sheet: "Sheet1", zone: toZone("B2:B3") });

    expect(fixture.querySelector("canvas")).toBeDefined();
  });

  test("can click on a cell to select it", async () => {
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SET_VALUE", { xc: "B3", text: "b3" });
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    expect(getActiveXc(model)).toBe("C8");
  });

  test("can click on resizer, then move selection with keyboard", async () => {
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SET_VALUE", { xc: "B3", text: "b3" });
    triggerMouseEvent(".o-overlay", "click", 300, 20);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    expect(getActiveXc(model)).toBe("A2");
  });

  test("can shift-click on a cell to update selection", async () => {
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SET_VALUE", { xc: "B3", text: "b3" });
    triggerMouseEvent("canvas", "mousedown", 300, 200, { shiftKey: true });
    expect(model.getters.getSelectedZones()[0]).toEqual({
      top: 0,
      left: 0,
      bottom: 7,
      right: 2,
    });
  });

  test("Can open the Conditional Format side panel", async () => {
    parent.env.openSidePanel("ConditionalFormatting");
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
  });

  describe("keybindings", () => {
    test("pressing ENTER put current cell in edit mode", async () => {
      // note: this behavious is not like excel. Maybe someone will want to
      // change this
      parent.grid.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(getActiveXc(model)).toBe("A1");
      expect(model.getters.getEditionMode()).toBe("editing");
    });

    test("pressing ENTER in edit mode stop editing and move one cell down", async () => {
      model.dispatch("START_EDITION", { text: "a" });
      await nextTick();
      fixture
        .querySelector("div.o-composer")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(getActiveXc(model)).toBe("A2");
      expect(model.getters.getEditionMode()).toBe("inactive");
      expect(getCell(model, "A1")!.content).toBe("a");
    });

    test("pressing shift+ENTER in edit mode stop editing and move one cell up", async () => {
      model.dispatch("SELECT_CELL", { col: 0, row: 1 });
      expect(getActiveXc(model)).toBe("A2");
      model.dispatch("START_EDITION", { text: "a" });
      await nextTick();
      fixture
        .querySelector("div.o-composer")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }));
      expect(getActiveXc(model)).toBe("A1");
      expect(model.getters.getEditionMode()).toBe("inactive");
      expect(getCell(model, "A2")!.content).toBe("a");
    });

    test("pressing shift+ENTER in edit mode in top row stop editing and stay on same cell", async () => {
      model.dispatch("START_EDITION", { text: "a" });
      await nextTick();
      fixture
        .querySelector("div.o-composer")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }));
      expect(getActiveXc(model)).toBe("A1");
      expect(model.getters.getEditionMode()).toBe("inactive");
      expect(getCell(model, "A1")!.content).toBe("a");
    });

    test("pressing TAB move to next cell", async () => {
      parent.grid.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      expect(getActiveXc(model)).toBe("B1");
    });

    test("pressing shift+TAB move to previous cell", async () => {
      model.dispatch("SELECT_CELL", { col: 1, row: 0 });
      expect(getActiveXc(model)).toBe("B1");
      parent.grid.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }));
      expect(getActiveXc(model)).toBe("A1");
    });

    test("can undo/redo with keyboard", async () => {
      model.dispatch("SET_FORMATTING", {
        sheet: "Sheet1",
        target: [{ left: 0, right: 0, top: 0, bottom: 0 }],
        style: { fillColor: "red" },
      });
      expect(getCell(model, "A1")!.style).toBeDefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true })
      );
      expect(getCell(model, "A1")).toBeNull();
      await nextTick();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "y", ctrlKey: true, bubbles: true })
      );
      expect(getCell(model, "A1")!.style).toBeDefined();
    });

    test("can undo/redo with keyboard (uppercase version)", async () => {
      model.dispatch("SET_FORMATTING", {
        sheet: "Sheet1",
        target: [{ left: 0, right: 0, top: 0, bottom: 0 }],
        style: { fillColor: "red" },
      });
      expect(getCell(model, "A1")!.style).toBeDefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Z", ctrlKey: true, bubbles: true })
      );
      expect(getCell(model, "A1")).toBeNull();
      await nextTick();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Y", ctrlKey: true, bubbles: true })
      );
      expect(getCell(model, "A1")!.style).toBeDefined();
    });

    test("can select all the sheet with CTRL+A", async () => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "A", ctrlKey: true, bubbles: true })
      );
      expect(getActiveXc(model)).toBe("A1");
      expect(model.getters.getSelectedZones()[0]).toEqual({
        left: 0,
        top: 0,
        right: 25,
        bottom: 99,
      });
    });

    test("can save the sheet with CTRL+S", async () => {
      let saveContentCalled = false;
      parent.el!.addEventListener("save-requested", () => {
        saveContentCalled = true;
      });
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "S", ctrlKey: true, bubbles: true })
      );
      expect(saveContentCalled).toBe(true);
    });
  });

  describe("paint format tool with grid selection", () => {
    test("can paste format with mouse", async () => {
      model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
      model.dispatch("SELECT_CELL", { col: 1, row: 1 });
      model.dispatch("SET_FORMATTING", {
        sheet: "Sheet1",
        target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
        style: { bold: true },
      });
      const target = [{ left: 1, top: 1, bottom: 1, right: 1 }];
      model.dispatch("ACTIVATE_PAINT_FORMAT", { target });
      triggerMouseEvent("canvas", "mousedown", 300, 200);
      expect(getCell(model, "C8")).toBeNull();
      triggerMouseEvent("body", "mouseup", 300, 200);
      expect(getCell(model, "C8")!.style).toBe(2);
    });

    test("can paste format with key", async () => {
      model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
      model.dispatch("SELECT_CELL", { col: 1, row: 1 });
      model.dispatch("SET_FORMATTING", {
        sheet: "Sheet1",
        target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
        style: { bold: true },
      });
      const target = [{ left: 1, top: 1, bottom: 1, right: 1 }];
      model.dispatch("ACTIVATE_PAINT_FORMAT", { target });
      expect(getCell(model, "C2")).toBeNull();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      );
      expect(getCell(model, "C2")!.style).toBe(2);
    });
  });
});

describe("error tooltip", () => {
  let intervalCb: Function;
  let currentTime = 0;

  beforeEach(async () => {
    model = new Model();
    parent = new GridParent(model);

    // mock setinterval and Date.now
    parent.env.browser.setInterval = ((cb) => {
      intervalCb = cb;
    }) as any;
    parent.env.browser.Date = {
      now() {
        return currentTime;
      },
    } as any;

    await parent.mount(fixture);
  });

  test("can display error tooltip", async () => {
    model.dispatch("SET_VALUE", { xc: "C8", text: "=1/0" });
    await nextTick();
    triggerMouseEvent("canvas", "mousemove", 300, 200);

    currentTime = 250;
    intervalCb();

    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).toBeNull();

    currentTime = 500;
    intervalCb();
    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
    expect(document.querySelector(".o-error-tooltip")).toMatchSnapshot();

    // moving mouse await
    triggerMouseEvent("canvas", "mousemove", 100, 200);
    currentTime = 550;
    intervalCb();
    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).toBeNull();
  });
});
