import { Component, xml } from "@odoo/owl";
import { Spreadsheet } from "../../src";
import { DEFAULT_CELL_WIDTH, HEADER_HEIGHT, HEADER_WIDTH } from "../../src/constants";
import { Model } from "../../src/model";
import { setCellContent, setSelection, setViewportOffset } from "../test_helpers/commands_helpers";
import {
  clickCell,
  edgeScrollDelay,
  keyDown,
  triggerMouseEvent,
  triggerWheelEvent,
} from "../test_helpers/dom_helper";
import {
  getStylePropertyInPx,
  mountSpreadsheet,
  nextTick,
  spyDispatch,
} from "../test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;
let parent: Spreadsheet;

describe("Autofill component", () => {
  beforeEach(async () => {
    ({ parent, model, fixture } = await mountSpreadsheet());
  });
  test("Can drag and drop autofill on columns", async () => {
    const dispatch = spyDispatch(parent);
    const autofill = fixture.querySelector(".o-autofill-handler");
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
    const autofill = fixture.querySelector(".o-autofill-handler");
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
    const autofill = fixture.querySelector(".o-autofill-handler");
    triggerMouseEvent(autofill, "dblclick", 4, 4);
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL_AUTO");
  });

  test("tooltip position when moving the mouse", async () => {
    const autofill = fixture.querySelector(".o-autofill-handler");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 40, 40);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    const sheetId = model.getters.getActiveSheetId();
    const x = HEADER_WIDTH + model.getters.getColDimensions(sheetId, 1)!.end + 20;
    const y = model.getters.getRowDimensions(sheetId, 0)!.start + 20;
    triggerMouseEvent(autofill, "mousemove", x, y);
    await nextTick();
    expect(fixture.querySelector(".o-autofill")).not.toBeNull();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toMatchInlineSnapshot(`
      <div
        class="o-autofill-nextvalue"
        style="top:30px; left:375px; "
      >
        <div>
          test
        </div>
      </div>
    `);
  });

  test("tooltip position when scrolling", async () => {
    const autofill = fixture.querySelector(".o-autofill-handler");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 40, 40);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    const sheetId = model.getters.getActiveSheetId();
    const x = HEADER_WIDTH + model.getters.getColDimensions(sheetId, 1)!.end + 20;
    const y = model.getters.getRowDimensions(sheetId, 0)!.start + 20;
    triggerWheelEvent(".o-grid", { clientX: x, clientY: y });
    await nextTick();
    expect(fixture.querySelector(".o-autofill")).not.toBeNull();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toMatchInlineSnapshot(`
      <div
        class="o-autofill-nextvalue"
        style="top:30px; left:375px; "
      >
        <div>
          test
        </div>
      </div>
    `);
  });

  test("tooltip position when viewport is not at the top", async () => {
    const autofill = fixture.querySelector(".o-autofill-handler");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    setViewportOffset(model, 500, 500);
    setCellContent(model, "F22", "test");
    await clickCell(model, "F22");
    await nextTick();
    expect(fixture.querySelector(".o-autofill")).not.toBeNull();
    triggerMouseEvent(autofill, "mousedown", 40, 40);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    const sheetId = model.getters.getActiveSheetId();
    const x = HEADER_WIDTH + model.getters.getColDimensions(sheetId, 1)!.end + 20;
    const y = model.getters.getRowDimensions(sheetId, 0)!.start + 20;
    triggerMouseEvent(autofill, "mousemove", x, y);
    await nextTick();
    expect(fixture.querySelector(".o-autofill")).not.toBeNull();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toMatchInlineSnapshot(`
      <div
        class="o-autofill-nextvalue"
        style="top:30px; left:375px; "
      >
        <div>
          test
        </div>
      </div>
    `);
  });

  test("Can display tooltip with autofill", async () => {
    const autofill = fixture.querySelector(".o-autofill-handler");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
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
    expect(fixture.querySelector(".o-autofill-nextvalue")).not.toBeNull();
    expect(fixture.querySelector(".o-autofill-nextvalue")!.textContent).toBe("test");
  });

  test("Tooltip is removed when cancelling autofill", async () => {
    const autofill = fixture.querySelector(".o-autofill-handler");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
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
    expect(fixture.querySelector(".o-autofill-nextvalue")).not.toBeNull();
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
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
  });

  test("Can display tooltip with a custom component", async () => {
    const autofill = fixture.querySelector(".o-autofill");
    class CustomTooltip extends Component {
      static template = xml/* xml */ `
        <div class="custom_tooltip" t-esc="props.content"/>
      `;
    }
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
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
    expect(fixture.querySelector(".o-autofill-nextvalue")).not.toBeNull();
    expect(fixture.querySelector(".custom_tooltip")).not.toBeNull();
    expect(fixture.querySelector(".custom_tooltip")!.textContent).toBe("blabla");
  });

  test("Autofill does not reset the viewport position if not near the viewport edge", async () => {
    setSelection(parent.model, ["A1:A100"]);
    parent.model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 400, offsetY: 400 });
    const firstViewport = parent.model.getters.getActiveMainViewport();
    const autofill = fixture.querySelector(".o-autofill");
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

  test("Autofill is not loaded when the grid selection does not have the focus", async () => {
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    expect(fixture.querySelector(".o-autofill")).not.toBeNull();
    // force composer to capture the selection
    await keyDown({ key: "Enter" });
    expect(fixture.querySelector(".o-autofill")).toBeNull();
  });
});

describe("Autofill edge scrolling", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    ({ parent, model, fixture } = await mountSpreadsheet());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("Can edge scroll horizontally", () => {
    const { width, height } = model.getters.getSheetViewDimension();
    const y = height / 2;
    const autofill = fixture.querySelector(".o-autofill-handler");
    triggerMouseEvent(autofill, "mousedown", width / 2, y);
    triggerMouseEvent(autofill, "mousemove", 1.5 * width, y);
    const advanceTimer = edgeScrollDelay(0.5 * width, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(autofill, "mouseup", 1.5 * width, y);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 6,
      right: 16,
      top: 0,
      bottom: 42,
    });

    triggerMouseEvent(autofill, "mousedown", width / 2, y);
    triggerMouseEvent(autofill, "mousemove", -0.5 * width, y);
    const advanceTimer2 = edgeScrollDelay(0.5 * width, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(autofill, "mouseup", -0.5 * width, y);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 3,
      right: 13,
      top: 0,
      bottom: 42,
    });
  });

  test("Can edge-scroll vertically", async () => {
    const { width, height } = model.getters.getSheetViewDimensionWithHeaders();
    const x = width / 2;
    const autofill = fixture.querySelector(".o-autofill-handler");
    triggerMouseEvent(autofill, "mousedown", x, height / 2);
    triggerMouseEvent(autofill, "mousemove", x, 1.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * height, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(autofill, "mouseup", x, 1.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 6,
      bottom: 48,
    });

    triggerMouseEvent(autofill, "mousedown", x, height / 2);
    triggerMouseEvent(autofill, "mousemove", x, -0.5 * height);
    const advanceTimer2 = edgeScrollDelay(0.5 * height, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(autofill, "mouseup", x, -0.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 3,
      bottom: 45,
    });
  });

  test("Can show and remove tooltip correctly when edge scroll horizontally", async () => {
    setCellContent(model, "A1", "test");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    const { width } = model.getters.getSheetViewDimensionWithHeaders();
    const autofill = fixture.querySelector(".o-autofill-handler");

    triggerMouseEvent(autofill, "mousedown", width / 2, 0);
    triggerMouseEvent(autofill, "mousemove", width * 1.5, 0);
    const advanceTimer = edgeScrollDelay(width / 2, 5);
    jest.advanceTimersByTime(advanceTimer);
    await nextTick(); // now the cursor is out of the sheet
    const tooltipElement = fixture.querySelector(".o-autofill-nextvalue")! as HTMLElement;
    expect(tooltipElement).not.toBeNull();
    expect(tooltipElement.textContent).toBe("test");
    expect(isVisibleInViewport(tooltipElement, model)).toBeFalsy();

    triggerMouseEvent(autofill, "mousemove", width / 2, 0);
    const advanceTimer2 = edgeScrollDelay(width / 2, 5);
    jest.advanceTimersByTime(advanceTimer2);
    await nextTick();
    expect(isVisibleInViewport(tooltipElement, model)).toBeTruthy();

    triggerMouseEvent(autofill, "mouseup", width / 2, 0);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
  });

  test("Can show and remove tooltip when edge scroll vertically", async () => {
    setCellContent(model, "A1", "test");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    const { height } = model.getters.getSheetViewDimensionWithHeaders();
    const autofill = fixture.querySelector(".o-autofill-handler");

    triggerMouseEvent(autofill, "mousedown", 0, height / 2);
    triggerMouseEvent(autofill, "mousemove", 0, height * 1.5);
    const advanceTimer = edgeScrollDelay(height / 2, 5);
    jest.advanceTimersByTime(advanceTimer);
    await nextTick(); // now the cursor is out of the viewport

    const tooltipElement = fixture.querySelector(".o-autofill-nextvalue")! as HTMLElement;
    expect(tooltipElement).not.toBeNull();
    expect(tooltipElement.textContent).toBe("test");
    expect(isVisibleInViewport(tooltipElement, model)).toBeFalsy();

    triggerMouseEvent(autofill, "mousemove", 0, height / 2);
    /**
     * We have a time out when dragging
     * (see line 162 in `drag_and_drop.ts`)
     * so we need to wait for the time out
     */
    const timerToTriggerLastMouseMove = edgeScrollDelay(height / 2, 0);
    jest.advanceTimersByTime(timerToTriggerLastMouseMove);
    await nextTick();
    expect(isVisibleInViewport(tooltipElement, model)).toBeTruthy();

    triggerMouseEvent(autofill, "mouseup", 0, height / 2);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
  });
});

function isVisibleInViewport(element: HTMLElement | null, model: Model) {
  if (element === null) return false;
  const activeSheetViewDimension = model.getters.getSheetViewDimensionWithHeaders();
  const top = getStylePropertyInPx(element, "top") || -Infinity;
  const left = getStylePropertyInPx(element, "left") || -Infinity;
  return (
    top >= 0 &&
    top < activeSheetViewDimension.height &&
    left >= 0 &&
    left < activeSheetViewDimension.width
  );
}
