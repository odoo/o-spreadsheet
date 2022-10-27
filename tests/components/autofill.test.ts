import { App, Component, xml } from "@odoo/owl";
import { Spreadsheet } from "../../src";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "../../src/constants";
import { Model } from "../../src/model";
import { setCellContent, setSelection, setViewportOffset } from "../test_helpers/commands_helpers";
import { clickCell, triggerMouseEvent } from "../test_helpers/dom_helper";
import { makeTestFixture, mountSpreadsheet, nextTick, spyDispatch } from "../test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;
let parent: Spreadsheet;
let app: App;

beforeEach(async () => {
  fixture = makeTestFixture();
  ({ app, parent, model } = await mountSpreadsheet(fixture));
});

afterEach(() => {
  fixture.remove();
  app.destroy();
});

describe("Autofill component", () => {
  test("Can drag and drop autofill on columns", async () => {
    const dispatch = spyDispatch(parent);
    const autofill = fixture.querySelector(".o-spreadsheet-autofill-handler");
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      model.getters.getColDimensions(model.getters.getActiveSheetId(), 0)!.start + 10,
      model.getters.getRowDimensions(model.getters.getActiveSheetId(), 1)!.end + 10
    );
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL_SELECT", { col: 0, row: 2 });
    triggerMouseEvent(autofill, "mouseup");
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL");
  });

  test("Can drag and drop autofill on rows", async () => {
    const dispatch = spyDispatch(parent);
    const autofill = fixture.querySelector(".o-spreadsheet-autofill-handler");
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      model.getters.getColDimensions(model.getters.getActiveSheetId(), 1)!.end + 10,
      model.getters.getRowDimensions(model.getters.getActiveSheetId(), 0)!.start + 10
    );
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL_SELECT", { col: 2, row: 0 });
    triggerMouseEvent(autofill, "mouseup");
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL");
  });

  test("Can auto-autofill with dblclick", async () => {
    const dispatch = spyDispatch(parent);
    const autofill = fixture.querySelector(".o-spreadsheet-autofill-handler");
    triggerMouseEvent(autofill, "dblclick", 4, 4);
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL_AUTO");
  });

  test("tooltip position when moving the mouse", async () => {
    const autofill = fixture.querySelector(".o-spreadsheet-autofill-handler");
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).toBeNull();
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 40, 40);
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).toBeNull();
    const sheetId = model.getters.getActiveSheetId();
    const x = HEADER_WIDTH + model.getters.getColDimensions(sheetId, 1)!.end + 20;
    const y = model.getters.getRowDimensions(sheetId, 0)!.start + 20;
    triggerMouseEvent(autofill, "mousemove", x, y);
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet-autofill-handler")).not.toBeNull();
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).toMatchInlineSnapshot(`
      <div
        class="o-spreadsheet-autofill-tooltip position-absolute border border-black bg-white p-2 pe-none text-nowrap"
        style="top:-15px;left:235px;"
      >
        <div>
          test
        </div>
      </div>
    `);
  });

  test("tooltip position when scrolling", async () => {
    const autofill = fixture.querySelector(".o-spreadsheet-autofill-handler");
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).toBeNull();
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 40, 40);
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).toBeNull();
    const sheetId = model.getters.getActiveSheetId();
    const x = HEADER_WIDTH + model.getters.getColDimensions(sheetId, 1)!.end + 20;
    const y = model.getters.getRowDimensions(sheetId, 0)!.start + 20;
    fixture.querySelector(".o-spreadsheet-grid-container")!.dispatchEvent(
      new WheelEvent("wheel", {
        clientX: x,
        clientY: y,
        bubbles: true,
      })
    );
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet-autofill-handler")).not.toBeNull();
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).toMatchInlineSnapshot(`
      <div
        class="o-spreadsheet-autofill-tooltip position-absolute border border-black bg-white p-2 pe-none text-nowrap"
        style="top:-15px;left:235px;"
      >
        <div>
          test
        </div>
      </div>
    `);
  });

  test("tooltip position when viewport is not at the top", async () => {
    const autofill = fixture.querySelector(".o-spreadsheet-autofill-handler");
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).toBeNull();
    setViewportOffset(model, 500, 500);
    setCellContent(model, "F22", "test");
    await clickCell(model, "F22");
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet-autofill-handler")).not.toBeNull();
    triggerMouseEvent(autofill, "mousedown", 40, 40);
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).toBeNull();
    const sheetId = model.getters.getActiveSheetId();
    const x = HEADER_WIDTH + model.getters.getColDimensions(sheetId, 1)!.end + 20;
    const y = model.getters.getRowDimensions(sheetId, 0)!.start + 20;
    triggerMouseEvent(autofill, "mousemove", x, y);
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet-autofill-handler")).not.toBeNull();
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).toMatchInlineSnapshot(`
      <div
        class="o-spreadsheet-autofill-tooltip position-absolute border border-black bg-white p-2 pe-none text-nowrap"
        style="top:-15px;left:235px;"
      >
        <div>
          test
        </div>
      </div>
    `);
  });

  test("Can display tooltip with autofill", async () => {
    const autofill = fixture.querySelector(".o-spreadsheet-autofill-handler");
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).toBeNull();
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        model.getters.getColDimensions(model.getters.getActiveSheetId(), 0)!.start +
        10,

      model.getters.getRowDimensions(model.getters.getActiveSheetId(), 1)!.end + 10
    );
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).not.toBeNull();
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")!.textContent).toBe("test");
  });

  test("Tooltip is removed when cancelling autofill", async () => {
    const autofill = fixture.querySelector(".o-spreadsheet-autofill-handler");
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).toBeNull();
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        model.getters.getColDimensions(model.getters.getActiveSheetId(), 0)!.start +
        10,

      model.getters.getRowDimensions(model.getters.getActiveSheetId(), 1)!.end + 10
    );
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).not.toBeNull();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        model.getters.getColDimensions(model.getters.getActiveSheetId(), 0)!.start +
        10,

      model.getters.getRowDimensions(model.getters.getActiveSheetId(), 0)!.start + 10
    );
    await nextTick();
    triggerMouseEvent(autofill, "mouseup");
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).toBeNull();
  });

  test("Can display tooltip with a custom component", async () => {
    const autofill = fixture.querySelector(".o-spreadsheet-autofill-handler");
    class CustomTooltip extends Component {
      static template = xml/* xml */ `
        <div class="custom_tooltip" t-esc="props.content"/>
      `;
    }
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).toBeNull();
    model.getters.getAutofillTooltip = jest.fn(() => {
      return {
        props: { content: "blabla" },
        component: CustomTooltip,
      };
    });
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        model.getters.getColDimensions(model.getters.getActiveSheetId(), 0)!.start +
        10,

      model.getters.getRowDimensions(model.getters.getActiveSheetId(), 1)!.end + 10
    );
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet-autofill-tooltip")).not.toBeNull();
    expect(fixture.querySelector(".custom_tooltip")).not.toBeNull();
    expect(fixture.querySelector(".custom_tooltip")!.textContent).toBe("blabla");
  });

  test("Autofill on the last col/row", async () => {
    const dispatch = spyDispatch(parent);
    const autofill = fixture.querySelector(".o-spreadsheet-autofill-handler");
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        model.getters.getColDimensions(model.getters.getActiveSheetId(), 0)!.start +
        10000,

      model.getters.getRowDimensions(model.getters.getActiveSheetId(), 1)!.start + 10000
    );
    await nextTick();
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("Autofill component is hidden when the bottom right selection is out of the viewport", async () => {
    await clickCell(model, "A1");
    expect(fixture.querySelector(".o-spreadsheet-autofill-handler")).not.toBeNull();
    setViewportOffset(model, DEFAULT_CELL_WIDTH, 0);
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet-autofill-handler")).toBeNull();
    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT);
    await nextTick();
    expect(fixture.querySelector(".o-spreadsheet-autofill-handler")).toBeNull();
  });

  test("Autofill does not reset the viewport position", async () => {
    setSelection(parent.model, ["A1:A100"]);
    parent.model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 400, offsetY: 400 });
    const firstViewport = parent.model.getters.getActiveMainViewport();
    const autofill = fixture.querySelector(".o-spreadsheet-autofill-handler");
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    const newX =
      HEADER_WIDTH +
      parent.model.getters.getColDimensions(parent.model.getters.getActiveSheetId(), 0)!.start +
      2 * DEFAULT_CELL_WIDTH;
    triggerMouseEvent(autofill, "mousemove", newX, HEADER_HEIGHT + 4);
    await nextTick();
    triggerMouseEvent(autofill, "mouseup", newX, HEADER_HEIGHT + 4);
    await nextTick();
    expect(firstViewport).toMatchObject(parent.model.getters.getActiveMainViewport());
  });
});
