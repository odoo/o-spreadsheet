import { App } from "@odoo/owl";
import { DispatchResult, Spreadsheet } from "../../src";
import { Model } from "../../src/model";
import { setCellContent, setSelection } from "../test_helpers/commands_helpers";
import {
  mousedownBottomCellBorder,
  mousedownLeftCellBorder,
  mousedownRightCellBorder,
  mousedownTopCellBorder,
  mousemoveToCell,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import { getActiveXc } from "../test_helpers/getters_helpers";
import {
  makeTestFixture,
  mountSpreadsheet,
  nextTick,
  spyDispatch,
  target,
} from "../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let borderEl: Element;
let parent: Spreadsheet;
let app: App;

beforeEach(async () => {
  fixture = makeTestFixture();
  ({ app, parent } = await mountSpreadsheet(fixture));
  model = parent.model;
  model.dispatch("RESIZE_VIEWPORT", {
    width: 1000,
    height: 1000,
  });
});

afterEach(() => {
  app.destroy();
  fixture.remove();
});

describe("Border component", () => {
  describe("can drag all borders", () => {
    beforeEach(async () => {
      model.dispatch = jest.fn((command) => DispatchResult.Success);
      setSelection(model, ["B2"]);
      await nextTick();
    });
    test("start on top border", async () => {
      expect(getActiveXc(model)).toBe("B2");
      borderEl = fixture.querySelector(".o-border-n")!;

      mousedownTopCellBorder(model, borderEl, "B2");
      expect(model.dispatch).toHaveBeenCalledWith("CUT", {
        target: target("B2"),
      });
      mousemoveToCell(model, borderEl, "C2");
      expect(getActiveXc(model)).toBe("C2");

      triggerMouseEvent(borderEl, "mouseup");
      await nextTick();
      expect(model.dispatch).toHaveBeenCalledWith("PASTE", {
        target: target("C2"),
        pasteOption: undefined,
      });
      expect(model.dispatch).toHaveBeenCalledWith("CLEAR_CLIPBOARD");
    });

    test("start on left border", async () => {
      expect(getActiveXc(model)).toBe("B2");
      borderEl = fixture.querySelector(".o-border-w")!;

      mousedownLeftCellBorder(model, borderEl, "B2");
      expect(model.dispatch).toHaveBeenCalledWith("CUT", {
        target: target("B2"),
      });

      mousemoveToCell(model, borderEl, "C2");
      expect(getActiveXc(model)).toBe("C2");

      triggerMouseEvent(borderEl, "mouseup");
      await nextTick();
      expect(model.dispatch).toHaveBeenCalledWith("PASTE", {
        target: target("C2"),
        pasteOption: undefined,
      });
      expect(model.dispatch).toHaveBeenCalledWith("CLEAR_CLIPBOARD");
    });

    test("start on right border", async () => {
      expect(getActiveXc(model)).toBe("B2");
      borderEl = fixture.querySelector(".o-border-e")!;

      mousedownRightCellBorder(model, borderEl, "B2");
      expect(model.dispatch).toHaveBeenCalledWith("CUT", {
        target: target("B2"),
      });

      mousemoveToCell(model, borderEl, "C2");
      expect(getActiveXc(model)).toBe("C2");

      triggerMouseEvent(borderEl, "mouseup");
      await nextTick();
      expect(model.dispatch).toHaveBeenCalledWith("PASTE", {
        target: target("C2"),
        pasteOption: undefined,
      });
      expect(model.dispatch).toHaveBeenCalledWith("CLEAR_CLIPBOARD");
    });

    test("start on bottom border", async () => {
      expect(getActiveXc(model)).toBe("B2");
      borderEl = fixture.querySelector(".o-border-s")!;

      mousedownBottomCellBorder(model, borderEl, "B2");
      expect(model.dispatch).toHaveBeenCalledWith("CUT", {
        target: target("B2"),
      });

      mousemoveToCell(model, borderEl, "C2");
      expect(getActiveXc(model)).toBe("C2");

      triggerMouseEvent(borderEl, "mouseup");
      await nextTick();
      expect(model.dispatch).toHaveBeenCalledWith("PASTE", {
        target: target("C2"),
        pasteOption: undefined,
      });
      expect(model.dispatch).toHaveBeenCalledWith("CLEAR_CLIPBOARD");
    });
  });

  test("drag the A1:B2 selection, start on A1 top border, finish on C1 --> paste on C1:D2", async () => {
    model.dispatch = jest.fn((command) => DispatchResult.Success);

    setSelection(model, ["A1:B2"]);
    await nextTick();
    borderEl = fixture.querySelector(".o-border-n")!;

    mousedownTopCellBorder(model, borderEl, "A1");
    expect(model.dispatch).toHaveBeenCalledWith("CUT", {
      target: target("A1:B2"),
    });

    mousemoveToCell(model, borderEl, "B1");
    await nextTick();
    expect(model.getters.getSelectedZones()).toEqual(target("B1:C2"));
    mousemoveToCell(model, borderEl, "C1");
    await nextTick();
    expect(model.getters.getSelectedZones()).toEqual(target("C1:D2"));

    triggerMouseEvent(borderEl, "mouseup");
    await nextTick();
    expect(model.dispatch).toHaveBeenCalledWith("PASTE", {
      target: target("C1:D2"),
      pasteOption: undefined,
    });
    expect(model.dispatch).toHaveBeenCalledWith("CLEAR_CLIPBOARD");
  });

  test("drag the A1:B2 highlight, start on B1 top border, finish on C1 --> paste on B1:C2", async () => {
    model.dispatch = jest.fn((command) => DispatchResult.Success);

    setSelection(model, ["A1:B2"]);
    await nextTick();
    borderEl = fixture.querySelector(".o-border-n")!;

    mousedownTopCellBorder(model, borderEl, "B1");
    expect(model.dispatch).toHaveBeenCalledWith("CUT", {
      target: target("A1:B2"),
    });

    mousemoveToCell(model, borderEl, "C1");
    expect(model.getters.getSelectedZones()).toEqual(target("B1:C2"));

    triggerMouseEvent(borderEl, "mouseup");
    await nextTick();
    expect(model.dispatch).toHaveBeenCalledWith("PASTE", {
      target: target("B1:C2"),
      pasteOption: undefined,
    });
    expect(model.dispatch).toHaveBeenCalledWith("CLEAR_CLIPBOARD");
  });

  test("cannot drag a selection if already beside limit border", async () => {
    model.dispatch = jest.fn((command) => DispatchResult.Success);

    setSelection(model, ["A1:B2"]);
    await nextTick();
    expect(model.getters.getSelectedZones()).toEqual(target("A1:B2"));

    borderEl = fixture.querySelector(".o-border-n")!;
    mousedownBottomCellBorder(model, borderEl, "B2");
    expect(model.dispatch).toHaveBeenCalledWith("CUT", {
      target: target("A1:B2"),
    });

    mousemoveToCell(model, borderEl, "A2");
    await nextTick();
    expect(model.getters.getSelectedZones()).toEqual(target("A1:B2"));
  });

  test("failed the cut and paste clears the clipboard and resets the selection", async () => {
    const notifyUser = jest.fn();
    const fixture = makeTestFixture();
    const model = new Model();
    const { app } = await mountSpreadsheet(fixture, { model: model }, { notifyUser: notifyUser });
    await app.mount(fixture);

    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "42");
    model.dispatch("ADD_MERGE", { sheetId, target: target("B1:C2") });

    setSelection(model, ["A1"]);
    await nextTick();

    borderEl = fixture.querySelector(".o-border-n")!;
    mousedownTopCellBorder(model, borderEl, "A1");
    expect(model.getters.getSelectedZones()).toEqual(target("A1"));
    expect(model.getters.getClipboardContent()).toBe("42");

    mousemoveToCell(model, borderEl, "B1");
    await nextTick();
    expect(model.getters.getSelectedZones()).toEqual(target("B1:C2"));
    expect(model.getters.getClipboardContent()).toBe("42");

    // finish the drag and drop on merged cells cancel the paste
    triggerMouseEvent(borderEl, "mouseup");
    await nextTick();

    expect(model.getters.getSelectedZones()).toEqual(target("A1"));
    // an empty clipboard contains "\t"
    expect(model.getters.getClipboardContent()).toBe("\t");

    fixture.remove();
    app.destroy();
  });

  test("drag and drop selection at the initial cut position does not paste", async () => {
    model.dispatch = jest.fn((command) => DispatchResult.Success);

    setSelection(model, ["A1:B2"]);
    await nextTick();

    borderEl = fixture.querySelector(".o-border-n")!;
    mousedownBottomCellBorder(model, borderEl, "B2");

    mousemoveToCell(model, borderEl, "C2");
    await nextTick();
    expect(model.getters.getSelectedZones()).toEqual(target("B1:C2"));

    mousemoveToCell(model, borderEl, "A2");
    await nextTick();
    expect(model.getters.getSelectedZones()).toEqual(target("A1:B2"));

    triggerMouseEvent(borderEl, "mouseup");
    await nextTick();
    expect(model.dispatch).toHaveBeenCalledWith("CLEAR_CLIPBOARD");
  });

  test("can drag and drop while edge-scrolling horizontally", async () => {
    const { width } = model.getters.getViewportDimensionWithHeaders();
    model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "COL",
      sheetId: model.getters.getActiveSheetId(),
      elements: [0],
      size: width,
    });
    setSelection(model, ["A1"]);
    const dispatch = spyDispatch(parent);
    const borderEl = fixture.querySelector(".o-border-n")!;
    mousedownTopCellBorder(model, borderEl, "A1");
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("CUT", {
      target: target("A1"),
    });
    mousemoveToCell(model, borderEl, "B1");
    expect(dispatch).toHaveBeenCalledWith("SET_VIEWPORT_OFFSET", {
      offsetX: width,
      offsetY: 0,
    });
  });

  test("can drag and drop while edge-scrolling vertically", async () => {
    const { height } = model.getters.getViewportDimensionWithHeaders();
    model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "ROW",
      sheetId: model.getters.getActiveSheetId(),
      elements: [0],
      size: height,
    });
    setSelection(model, ["A1"]);
    const dispatch = spyDispatch(parent);
    const borderEl = fixture.querySelector(".o-border-n")!;
    mousedownLeftCellBorder(model, borderEl, "A1");
    expect(model.dispatch).toHaveBeenCalledWith("CUT", {
      target: target("A1"),
    });
    mousemoveToCell(model, borderEl, "A2");
    expect(dispatch).toHaveBeenCalledWith("SET_VIEWPORT_OFFSET", {
      offsetX: 0,
      offsetY: height,
    });
  });
});
