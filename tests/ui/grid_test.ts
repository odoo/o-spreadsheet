import { Model } from "../../src/model";
import { makeTestFixture, triggerMouseEvent, GridParent, nextTick } from "../helpers";
import { toZone } from "../../src/helpers";
jest.mock("../../src/ui/content_editable_helper");

let fixture: HTMLElement;
let model: Model;
let parent: GridParent;

beforeEach(async () => {
  fixture = makeTestFixture();
  model = new Model();
  model.workbook.viewport = { left: 0, top: 0, right: 9, bottom: 9 };
  parent = new GridParent(model);
  await parent.mount(fixture);
});

afterEach(() => {
  fixture.remove();
});

describe("Grid component", () => {
  test("can render a sheet with a merge", async () => {
    model.dispatch({ type: "ADD_MERGE", sheet: "Sheet1", zone: toZone("B2:B3") });

    expect(fixture.querySelector("canvas")).toBeDefined();
  });

  test("can click on a cell to select it", async () => {
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "b2" });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: "b3" });
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    expect(model.workbook.activeXc).toBe("C8");
  });

  test("can click on resizer, then move selection with keyboard", async () => {
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "b2" });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: "b3" });
    triggerMouseEvent(".o-overlay", "click", 300, 20);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    expect(model.workbook.activeXc).toBe("A2");
  });

  test("can shift-click on a cell to update selection", async () => {
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "b2" });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: "b3" });
    triggerMouseEvent("canvas", "mousedown", 300, 200, { shiftKey: true });
    expect(model.getters.getSelectedZones()[0]).toEqual({
      top: 0,
      left: 0,
      bottom: 7,
      right: 2
    });
  });

  test("Can open the Conditional Format side panel", async () => {
    parent.env.spreadsheet.openSidePanel("ConditionalFormatting");
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
  });

  describe("keybindings", () => {
    test("pressing ENTER put current cell in edit mode", async () => {
      // note: this behavious is not like excel. Maybe someone will want to
      // change this
      parent.grid.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(model.workbook.activeXc).toBe("A1");
      expect(model.getters.isEditing()).toBe(true);
    });

    test("pressing ENTER in edit mode stop editing and move one cell down", async () => {
      model.dispatch({ type: "START_EDITION", text: "a" });
      await nextTick();
      fixture
        .querySelector("div.o-composer")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(model.workbook.activeXc).toBe("A2");
      expect(model.getters.isEditing()).toBe(false);
      expect(model.workbook.cells["A1"].content).toBe("a");
    });

    test("pressing shift+ENTER in edit mode stop editing and move one cell up", async () => {
      model.dispatch({ type: "SELECT_CELL", col: 0, row: 1 });
      expect(model.workbook.activeXc).toBe("A2");
      model.dispatch({ type: "START_EDITION", text: "a" });
      await nextTick();
      fixture
        .querySelector("div.o-composer")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }));
      expect(model.workbook.activeXc).toBe("A1");
      expect(model.getters.isEditing()).toBe(false);
      expect(model.workbook.cells["A2"].content).toBe("a");
    });

    test("pressing shift+ENTER in edit mode in top row stop editing and stay on same cell", async () => {
      model.dispatch({ type: "START_EDITION", text: "a" });
      await nextTick();
      fixture
        .querySelector("div.o-composer")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }));
      expect(model.workbook.activeXc).toBe("A1");
      expect(model.getters.isEditing()).toBe(false);
      expect(model.workbook.cells["A1"].content).toBe("a");
    });

    test("pressing TAB move to next cell", async () => {
      parent.grid.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      expect(model.workbook.activeXc).toBe("B1");
    });

    test("pressing shift+TAB move to previous cell", async () => {
      model.dispatch({ type: "SELECT_CELL", col: 1, row: 0 });
      expect(model.workbook.activeXc).toBe("B1");
      parent.grid.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }));
      expect(model.workbook.activeXc).toBe("A1");
    });

    test("can undo/redo with keyboard", async () => {
      model.dispatch({
        type: "SET_FORMATTING",
        sheet: "Sheet1",
        target: [{ left: 0, right: 0, top: 0, bottom: 0 }],
        style: { fillColor: "red" }
      });
      expect(model.workbook.cells.A1.style).toBeDefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true })
      );
      expect(model.workbook.cells.A1).not.toBeDefined();
      await nextTick();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "y", ctrlKey: true, bubbles: true })
      );
      expect(model.workbook.cells.A1.style).toBeDefined();
    });

    test("can undo/redo with keyboard (uppercase version)", async () => {
      model.dispatch({
        type: "SET_FORMATTING",
        sheet: "Sheet1",
        target: [{ left: 0, right: 0, top: 0, bottom: 0 }],
        style: { fillColor: "red" }
      });
      expect(model.workbook.cells.A1.style).toBeDefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Z", ctrlKey: true, bubbles: true })
      );
      expect(model.workbook.cells.A1).not.toBeDefined();
      await nextTick();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Y", ctrlKey: true, bubbles: true })
      );
      expect(model.workbook.cells.A1.style).toBeDefined();
    });

    test("can select all the sheet with CTRL+A", async () => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "A", ctrlKey: true, bubbles: true })
      );
      expect(model.workbook.activeXc).toBe("A1");
      expect(model.getters.getSelectedZones()[0]).toEqual({
        left: 0,
        top: 0,
        right: 25,
        bottom: 99
      });
    });

    test("can save the sheet with CTRL+S", async () => {
      let saveContentCalled = false;
      parent.el!.addEventListener("save-content", () => {
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
      model.dispatch({ type: "SET_VALUE", xc: "B2", text: "b2" });
      model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
      model.dispatch({
        type: "SET_FORMATTING",
        sheet: "Sheet1",
        target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
        style: { bold: true }
      });
      const target = [{ left: 1, top: 1, bottom: 1, right: 1 }];
      model.dispatch({ type: "ACTIVATE_PAINT_FORMAT", target });
      triggerMouseEvent("canvas", "mousedown", 300, 200);
      expect(model.workbook.cells.C8).not.toBeDefined();
      triggerMouseEvent("body", "mouseup", 300, 200);
      expect(model.workbook.cells.C8.style).toBe(2);
    });

    test("can paste format with key", async () => {
      model.dispatch({ type: "SET_VALUE", xc: "B2", text: "b2" });
      model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
      model.dispatch({
        type: "SET_FORMATTING",
        sheet: "Sheet1",
        target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
        style: { bold: true }
      });
      const target = [{ left: 1, top: 1, bottom: 1, right: 1 }];
      model.dispatch({ type: "ACTIVATE_PAINT_FORMAT", target });
      expect(model.workbook.cells.C2).not.toBeDefined();
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      );
      expect(model.workbook.cells.C2.style).toBe(2);
    });
  });
});
