import { useProps, xml } from "@odoo/owl";
import { Spreadsheet } from "../../src";
import { AutofillStore } from "../../src/components/autofill/autofill_store";
import { types } from "../../src/components/props_validation";
import { DEFAULT_CELL_WIDTH, HEADER_HEIGHT, HEADER_WIDTH } from "../../src/constants";
import { Model } from "../../src/model";
import { Component } from "../../src/owl3_compatibility_layer";
import { ViewportsStore } from "../../src/stores/viewports_store";
import { SpreadsheetChildEnv } from "../../src/types/spreadsheet_env";
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
  useJestFakeTimers,
} from "../test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;
let parent: Spreadsheet;
let env: SpreadsheetChildEnv;

describe("Autofill component", () => {
  beforeEach(async () => {
    ({ parent, model, fixture, env } = await mountSpreadsheet());
  });
  test("Can drag and drop autofill on columns", async () => {
    const dispatch = spyDispatch(parent);
    const autofill = fixture.querySelector(".o-autofill-handler");
    triggerMouseEvent(autofill, "pointerdown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "pointermove",
      model.getters.getColDimensions(model.getters.getActiveSheetId(), 0)!.start + 10,
      model.getters.getRowDimensions(model.getters.getActiveSheetId(), 1)!.end + 10
    );
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL_SELECT", { col: 0, row: 2 });
    triggerMouseEvent(autofill, "pointerup");
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL");
  });

  test("Can drag and drop autofill on rows", async () => {
    const dispatch = spyDispatch(parent);
    const autofill = fixture.querySelector(".o-autofill-handler");
    triggerMouseEvent(autofill, "pointerdown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "pointermove",
      model.getters.getColDimensions(model.getters.getActiveSheetId(), 1)!.end + 10,
      model.getters.getRowDimensions(model.getters.getActiveSheetId(), 0)!.start + 10
    );
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL_SELECT", { col: 2, row: 0 });
    triggerMouseEvent(autofill, "pointerup");
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
    triggerMouseEvent(autofill, "pointerdown", 40, 40);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    const sheetId = model.getters.getActiveSheetId();
    const x = HEADER_WIDTH + model.getters.getColDimensions(sheetId, 1)!.end + 20;
    const y = model.getters.getRowDimensions(sheetId, 0)!.start + 20;
    triggerMouseEvent(autofill, "pointermove", x, y);
    await nextTick();
    expect(fixture.querySelector(".o-autofill")).not.toBeNull();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toMatchInlineSnapshot(`
      <div
        class="o-autofill-nextvalue"
        style="top: 30px; left: 375px;"
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
    triggerMouseEvent(autofill, "pointerdown", 40, 40);
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
        style="top: 30px; left: 375px;"
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
    setViewportOffset(env, 500, 500);
    setCellContent(model, "F22", "test");
    await clickCell(env, "F22");
    await nextTick();
    expect(fixture.querySelector(".o-autofill")).not.toBeNull();
    triggerMouseEvent(autofill, "pointerdown", 40, 40);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    const sheetId = model.getters.getActiveSheetId();
    const x = HEADER_WIDTH + model.getters.getColDimensions(sheetId, 1)!.end + 20;
    const y = model.getters.getRowDimensions(sheetId, 0)!.start + 20;
    triggerMouseEvent(autofill, "pointermove", x, y);
    await nextTick();
    expect(fixture.querySelector(".o-autofill")).not.toBeNull();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toMatchInlineSnapshot(`
      <div
        class="o-autofill-nextvalue"
        style="top: 30px; left: 375px;"
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
    triggerMouseEvent(autofill, "pointerdown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "pointermove",
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
    triggerMouseEvent(autofill, "pointerdown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "pointermove",
      HEADER_WIDTH +
        model.getters.getColDimensions(model.getters.getActiveSheetId(), 0)!.start +
        10,
      model.getters.getRowDimensions(model.getters.getActiveSheetId(), 1)!.end + 10
    );
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).not.toBeNull();
    triggerMouseEvent(
      autofill,
      "pointermove",
      HEADER_WIDTH +
        model.getters.getColDimensions(model.getters.getActiveSheetId(), 0)!.start +
        10,
      model.getters.getRowDimensions(model.getters.getActiveSheetId(), 0)!.start + 10
    );
    await nextTick();
    triggerMouseEvent(autofill, "pointerup");
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
  });

  test("Can display tooltip with a custom component", async () => {
    const autofillStore = env.getStore(AutofillStore);
    const autofill = fixture.querySelector(".o-autofill");
    class CustomTooltip extends Component {
      static template = xml/* xml */ `
        <div class="custom_tooltip" t-out="this.props.content"/>
      `;
      protected props = useProps({
        content: types.string(),
      });
    }
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    Object.assign(autofillStore, {
      tooltip: {
        props: { content: "blabla" },
        component: CustomTooltip,
      },
    });
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "pointerdown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "pointermove",
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
    setViewportOffset(env, 400, 400);
    const firstViewport = env.getStore(ViewportsStore).activeMainViewport;
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "pointerdown", 4, 4);
    await nextTick();
    const newX =
      HEADER_WIDTH +
      parent.model.getters.getColDimensions(parent.model.getters.getActiveSheetId(), 0)!.start +
      2 * DEFAULT_CELL_WIDTH;
    triggerMouseEvent(autofill, "pointermove", newX, HEADER_HEIGHT + 4);
    await nextTick();
    triggerMouseEvent(autofill, "pointerup", newX, HEADER_HEIGHT + 4);
    await nextTick();
    expect(firstViewport).toMatchObject(env.getStore(ViewportsStore).activeMainViewport);
  });

  test("Autofill is not loaded when the grid selection does not have the focus", async () => {
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "pointerdown", 4, 4);
    await nextTick();
    expect(fixture.querySelector(".o-autofill")).not.toBeNull();
    // force composer to capture the selection
    await keyDown({ key: "Enter" });
    expect(fixture.querySelector(".o-autofill")).toBeNull();
  });
});

describe("Autofill edge scrolling", () => {
  beforeEach(async () => {
    useJestFakeTimers();
    ({ parent, model, fixture, env } = await mountSpreadsheet());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("Can edge scroll horizontally", () => {
    const { width, height } = env.getStore(ViewportsStore).sheetViewDimension;
    const y = height / 2;
    const autofill = fixture.querySelector(".o-autofill-handler");
    triggerMouseEvent(autofill, "pointerdown", width / 2, y);
    triggerMouseEvent(autofill, "pointermove", 1.5 * width, y);
    const advanceTimer = edgeScrollDelay(0.5 * width, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(autofill, "pointerup", 1.5 * width, y);
    expect(env.getStore(ViewportsStore).activeMainViewport).toMatchObject({
      left: 6,
      right: 16,
      top: 0,
      bottom: 42,
    });

    triggerMouseEvent(autofill, "pointerdown", width / 2, y);
    triggerMouseEvent(autofill, "pointermove", -0.5 * width, y);
    const advanceTimer2 = edgeScrollDelay(0.5 * width, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(autofill, "pointerup", -0.5 * width, y);

    expect(env.getStore(ViewportsStore).activeMainViewport).toMatchObject({
      left: 3,
      right: 13,
      top: 0,
      bottom: 42,
    });
  });

  test("Can edge-scroll vertically", async () => {
    const { width, height } = env.getStore(ViewportsStore).sheetViewDimensionWithHeaders;
    const x = width / 2;
    const autofill = fixture.querySelector(".o-autofill-handler");
    triggerMouseEvent(autofill, "pointerdown", x, height / 2);
    triggerMouseEvent(autofill, "pointermove", x, 1.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * height, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(autofill, "pointerup", x, 1.5 * height);

    expect(env.getStore(ViewportsStore).activeMainViewport).toMatchObject({
      left: 0,
      right: 10,
      top: 6,
      bottom: 48,
    });

    triggerMouseEvent(autofill, "pointerdown", x, height / 2);
    triggerMouseEvent(autofill, "pointermove", x, -0.5 * height);
    const advanceTimer2 = edgeScrollDelay(0.5 * height, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(autofill, "pointerup", x, -0.5 * height);

    expect(env.getStore(ViewportsStore).activeMainViewport).toMatchObject({
      left: 0,
      right: 10,
      top: 3,
      bottom: 45,
    });
  });

  test("Can show and remove tooltip correctly when edge scroll horizontally", async () => {
    setCellContent(model, "A1", "test");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    const { width } = env.getStore(ViewportsStore).sheetViewDimensionWithHeaders;
    const autofill = fixture.querySelector(".o-autofill-handler");

    triggerMouseEvent(autofill, "pointerdown", width / 2, 0);
    triggerMouseEvent(autofill, "pointermove", width * 1.5, 0);
    const advanceTimer = edgeScrollDelay(width / 2, 5);
    jest.advanceTimersByTime(advanceTimer);
    await nextTick(); // now the cursor is out of the sheet
    const tooltipElement = fixture.querySelector(".o-autofill-nextvalue")! as HTMLElement;
    expect(tooltipElement).not.toBeNull();
    expect(tooltipElement.textContent).toBe("test");
    expect(isVisibleInViewport(tooltipElement, model)).toBeFalsy();

    triggerMouseEvent(autofill, "pointermove", width / 2, 0);
    const advanceTimer2 = edgeScrollDelay(width / 2, 5);
    jest.advanceTimersByTime(advanceTimer2);
    await nextTick();
    expect(isVisibleInViewport(tooltipElement, model)).toBeTruthy();

    triggerMouseEvent(autofill, "pointerup", width / 2, 0);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
  });

  test("Can show and remove tooltip when edge scroll vertically", async () => {
    setCellContent(model, "A1", "test");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    const { height } = env.getStore(ViewportsStore).sheetViewDimensionWithHeaders;
    const autofill = fixture.querySelector(".o-autofill-handler");

    triggerMouseEvent(autofill, "pointerdown", 0, height / 2);
    triggerMouseEvent(autofill, "pointermove", 0, height * 1.5);
    const advanceTimer = edgeScrollDelay(height / 2, 5);
    jest.advanceTimersByTime(advanceTimer);
    await nextTick(); // now the cursor is out of the viewport

    const tooltipElement = fixture.querySelector(".o-autofill-nextvalue")! as HTMLElement;
    expect(tooltipElement).not.toBeNull();
    expect(tooltipElement.textContent).toBe("test");
    expect(isVisibleInViewport(tooltipElement, model)).toBeFalsy();

    triggerMouseEvent(autofill, "pointermove", 0, height / 2);
    /**
     * We have a time out when dragging
     * (see line 162 in `drag_and_drop.ts`)
     * so we need to wait for the time out
     */
    const timerToTriggerLastMouseMove = edgeScrollDelay(height / 2, 0);
    jest.advanceTimersByTime(timerToTriggerLastMouseMove);
    await nextTick();
    expect(isVisibleInViewport(tooltipElement, model)).toBeTruthy();

    triggerMouseEvent(autofill, "pointerup", 0, height / 2);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
  });
});

function isVisibleInViewport(element: HTMLElement | null, model: Model) {
  if (element === null) {
    return false;
  }
  const activeSheetViewDimension = env.getStore(ViewportsStore).sheetViewDimensionWithHeaders;
  const top = getStylePropertyInPx(element, "top") || -Infinity;
  const left = getStylePropertyInPx(element, "left") || -Infinity;
  return (
    top >= 0 &&
    top < activeSheetViewDimension.height &&
    left >= 0 &&
    left < activeSheetViewDimension.width
  );
}
