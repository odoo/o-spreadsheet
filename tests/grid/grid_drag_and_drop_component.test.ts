import { Component, useSubEnv, xml } from "@odoo/owl";
import { Model } from "../../src";
import { dragAndDropBeyondTheViewport } from "../../src/components/helpers/drag_and_drop";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { numberToLetters } from "../../src/helpers";
import { SpreadsheetChildEnv, UID } from "../../src/types";
import {
  addColumns,
  addRows,
  freezeColumns,
  freezeRows,
  hideColumns,
  hideRows,
  setViewportOffset,
} from "../test_helpers/commands_helpers";
import { edgeScrollDelay, triggerMouseEvent } from "../test_helpers/dom_helper";
import { mountComponent, nextTick } from "../test_helpers/helpers";

// As we test an isolated component, grid and gridOverlay won't exist
jest.mock("../../src/components/helpers/dom_helpers", () => {
  return {
    ...jest.requireActual("../../src/components/helpers/dom_helpers"),
    ...jest.requireActual("../__mocks__/dom_helpers"),
  };
});

let model: Model;
let sheetId: UID;

//Test Component required
const TEMPLATE = xml/* xml */ `
  <div class="o-fake-grid" t-on-pointerdown="onMouseDown">
    <t t-esc='"coucou"'/>
  </div>
`;

interface Props {
  model: Model;
}

let selectedCol: number | undefined = undefined;
let selectedRow: number | undefined = undefined;

class FakeGridComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = TEMPLATE;
  static props = { model: Object };

  setup() {
    useSubEnv({
      model: this.props.model,
    });
  }

  onMouseDown(ev: MouseEvent) {
    dragAndDropBeyondTheViewport(
      this.env,
      (col, row) => {
        selectedCol = col;
        selectedRow = row;
      },
      () => {}
    );
  }
}
beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useFakeTimers();
});

beforeEach(async () => {
  model = Model.BuildSync();
  await mountComponent(FakeGridComponent, { model, props: { model } });
  selectedCol = selectedRow = undefined;
  sheetId = model.getters.getActiveSheetId();
  await nextTick();
});

describe("Drag And Drop horizontal tests", () => {
  test("Start Drag&Drop in XRight then moving to XLeft edge-scroll XRight to the left", async () => {
    freezeColumns(model, 4, sheetId);
    setViewportOffset(model, 6 * DEFAULT_CELL_WIDTH, 6 * DEFAULT_CELL_HEIGHT);
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 10,
      right: 16,
    });
    const { height } = model.getters.getSheetViewDimension();
    const { x: offsetCorrectionX } = model.getters.getMainViewportCoordinates();
    const x = offsetCorrectionX + DEFAULT_CELL_WIDTH;
    triggerMouseEvent(".o-fake-grid", "pointerdown", x, 0.5 * height);
    triggerMouseEvent(".o-fake-grid", "pointermove", 0.5 * offsetCorrectionX, 0.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * offsetCorrectionX, 1);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", 0.5 * offsetCorrectionX, 0.5 * height);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 8,
      right: 14,
    });
  });

  test("Start Drag&Drop in XLeft then moving to XRight unscroll XRight", async () => {
    freezeColumns(model, 4, sheetId);
    setViewportOffset(model, 6 * DEFAULT_CELL_WIDTH, 6 * DEFAULT_CELL_HEIGHT);
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 10,
      right: 16,
    });
    const { height } = model.getters.getSheetViewDimension();
    const { x: offsetCorrectionX } = model.getters.getMainViewportCoordinates();
    const x = offsetCorrectionX + DEFAULT_CELL_WIDTH;
    triggerMouseEvent(".o-fake-grid", "pointerdown", 0.5 * offsetCorrectionX, 0.5 * height);
    triggerMouseEvent(".o-fake-grid", "pointermove", x, 0.5 * height);
    triggerMouseEvent(".o-fake-grid", "pointerup", 0.5 * offsetCorrectionX, 0.5 * height);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 4,
      right: 10,
    });
  });

  test("Start Drag&Drop in XRight then moving it outside right scroll XRight to the right", async () => {
    freezeColumns(model, 4, sheetId);
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 4,
      right: 10,
    });
    const { width, height } = model.getters.getSheetViewDimension();
    triggerMouseEvent(".o-fake-grid", "pointerdown", width, 0.5 * height);
    triggerMouseEvent(".o-fake-grid", "pointermove", 1.5 * width, 0.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * width, 4);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", 1.5 * width, 0.5 * height);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 9,
      right: 15,
    });
  });

  test("Start Drag&Drop in XLeft then moving it outside right scroll XRight to the right", async () => {
    freezeColumns(model, 4, sheetId);
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 4,
      right: 10,
    });
    const { width, height } = model.getters.getSheetViewDimension();
    const { x: offsetCorrectionX } = model.getters.getMainViewportCoordinates();
    triggerMouseEvent(".o-fake-grid", "pointerdown", 0.5 * offsetCorrectionX, 0.5 * height);
    triggerMouseEvent(".o-fake-grid", "pointermove", 1.5 * width, 0.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * width, 4);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", 1.5 * width, 0.5 * height);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 9,
      right: 15,
    });
  });

  test("drag And Drop through hidden columns", async () => {
    const { right } = model.getters.getActiveMainViewport();
    addColumns(model, "after", "Z", 100);
    hideColumns(model, [numberToLetters(right + 1)]);
    const { width, height } = model.getters.getSheetViewDimension();
    const y = height / 2;
    triggerMouseEvent(".o-fake-grid", "pointerdown", width / 2, y);
    triggerMouseEvent(".o-fake-grid", "pointermove", 1.5 * width, y);
    const advanceTimer = edgeScrollDelay(0.5 * width, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", 1.5 * width, y);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 6,
      right: 17,
    });
    setViewportOffset(model, (right + 2) * DEFAULT_CELL_WIDTH, 0);
    await nextTick();
    triggerMouseEvent(".o-fake-grid", "pointerdown", width / 2, y);
    triggerMouseEvent(".o-fake-grid", "pointermove", -1.5 * width, y);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", -1.5 * width, y);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 6,
      right: 17,
    });
  });

  test("Drag&Drop beyond the grid: correct col value is given to the callback", async () => {
    freezeColumns(model, 4, sheetId);
    setViewportOffset(model, 6 * DEFAULT_CELL_WIDTH, 6 * DEFAULT_CELL_HEIGHT);
    await nextTick();
    const { x: offsetCorrectionX } = model.getters.getMainViewportCoordinates();
    const x = offsetCorrectionX + DEFAULT_CELL_WIDTH;
    triggerMouseEvent(".o-fake-grid", "pointerdown", x, 0);
    triggerMouseEvent(".o-fake-grid", "pointermove", -50, 0);
    const advanceTimer = edgeScrollDelay(offsetCorrectionX + 50, 6);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", -50, 0);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 4,
      right: 10,
    });
    expect(selectedCol).toEqual(0);
  });
});

describe("Drag And Drop vertical tests", () => {
  test("Start Drag&Drop in XBottom then moving to XTop edge-scroll XBottom way-up", async () => {
    freezeRows(model, 4, sheetId);
    setViewportOffset(model, 6 * DEFAULT_CELL_WIDTH, 6 * DEFAULT_CELL_HEIGHT);
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 10,
      bottom: 49,
    });
    const { width } = model.getters.getSheetViewDimension();
    const { y: offsetCorrectionY } = model.getters.getMainViewportCoordinates();
    const y = offsetCorrectionY + DEFAULT_CELL_HEIGHT;
    triggerMouseEvent(".o-fake-grid", "pointerdown", 0.5 * width, y);
    triggerMouseEvent(".o-fake-grid", "pointermove", 0.5 * width, 0.5 * offsetCorrectionY);
    const advanceTimer = edgeScrollDelay(0.5 * offsetCorrectionY, 1);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", 0.5 * width, 0.5 * offsetCorrectionY);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 8,
      bottom: 47,
    });
  });

  test("Start Drag&Drop in XTop then moving to XBottom unscroll XBottom", async () => {
    freezeRows(model, 4, sheetId);
    setViewportOffset(model, 6 * DEFAULT_CELL_WIDTH, 6 * DEFAULT_CELL_HEIGHT);
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 10,
      bottom: 49,
    });
    const { width } = model.getters.getSheetViewDimension();
    const { y: offsetCorrectionY } = model.getters.getMainViewportCoordinates();
    const y = offsetCorrectionY + DEFAULT_CELL_HEIGHT;
    triggerMouseEvent(".o-fake-grid", "pointerdown", 0.5 * width, 0.5 * offsetCorrectionY);
    triggerMouseEvent(".o-fake-grid", "pointermove", 0.5 * width, y);

    triggerMouseEvent(".o-fake-grid", "pointerup", 0.5 * width, 0.5 * offsetCorrectionY);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 4,
      bottom: 43,
    });
  });

  test("Start Drag&Drop in XBottom then moving it under the viewport scroll XBottom upside-down", async () => {
    freezeRows(model, 4, sheetId);
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 4,
      bottom: 43,
    });
    const { width, height } = model.getters.getSheetViewDimension();
    triggerMouseEvent(".o-fake-grid", "pointerdown", 0.5 * width, height);
    triggerMouseEvent(".o-fake-grid", "pointermove", 0.5 * width, 1.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * height, 4);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", 0.5 * width, 1.5 * height);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 9,
      bottom: 48,
    });
  });

  test("Start Drag&Drop in XTop then moving it under the viewport scroll XBottom upside-down", async () => {
    freezeRows(model, 4, sheetId);
    await nextTick();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 4,
      bottom: 43,
    });
    const { width, height } = model.getters.getSheetViewDimension();
    const { y: offsetCorrectionY } = model.getters.getMainViewportCoordinates();
    triggerMouseEvent(".o-fake-grid", "pointerdown", 0.5 * width, 0.5 * offsetCorrectionY);
    triggerMouseEvent(".o-fake-grid", "pointermove", 0.5 * width, 1.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * height, 4);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", 0.5 * width, 1.5 * height);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 9,
      bottom: 48,
    });
  });

  test("Drag&Drop beyond the grid: correct row value is given to the callback", async () => {
    freezeRows(model, 4, sheetId);
    setViewportOffset(model, 6 * DEFAULT_CELL_WIDTH, 6 * DEFAULT_CELL_HEIGHT);
    await nextTick();
    const { y: offsetCorrectionY } = model.getters.getMainViewportCoordinates();
    const y = offsetCorrectionY + DEFAULT_CELL_HEIGHT;
    triggerMouseEvent(".o-fake-grid", "pointerdown", 0, y);
    triggerMouseEvent(".o-fake-grid", "pointermove", 0, -50);
    const advanceTimer = edgeScrollDelay(offsetCorrectionY + 50, 6);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", 0, -50);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 4,
      bottom: 43,
    });
    expect(selectedRow).toEqual(0);
  });
});

describe("Drag And Drop vertical tests without frozen panes", () => {
  test("Start Drag&Drop in viewport then moving outside-left edge-scroll the viewport to the left", () => {
    setViewportOffset(model, 6 * DEFAULT_CELL_WIDTH, 6 * DEFAULT_CELL_HEIGHT);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 6,
      right: 16,
    });
    const { height } = model.getters.getSheetViewDimension();
    triggerMouseEvent(".o-fake-grid", "pointerdown", DEFAULT_CELL_WIDTH, 0.5 * height);
    triggerMouseEvent(".o-fake-grid", "pointermove", -0.5 * DEFAULT_CELL_WIDTH, 0.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * DEFAULT_CELL_WIDTH, 1);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", -0.5 * DEFAULT_CELL_WIDTH, 0.5 * height);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 4,
      right: 14,
    });
  });
  test("Start Drag&Drop in viewport then moving outside-top edge-scroll the viewport to the top", () => {
    setViewportOffset(model, 6 * DEFAULT_CELL_WIDTH, 6 * DEFAULT_CELL_HEIGHT);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 6,
      bottom: 49,
    });
    const { width } = model.getters.getSheetViewDimension();
    triggerMouseEvent(".o-fake-grid", "pointerdown", 0.5 * width, DEFAULT_CELL_HEIGHT);
    triggerMouseEvent(".o-fake-grid", "pointermove", 0.5 * width, -0.5 * DEFAULT_CELL_HEIGHT);
    const advanceTimer = edgeScrollDelay(0.5 * DEFAULT_CELL_HEIGHT, 1);
    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", 0.5 * width, -0.5 * DEFAULT_CELL_HEIGHT);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 4,
      bottom: 47,
    });
  });

  test("drag And Drop through hidden rows", async () => {
    const { bottom } = model.getters.getActiveMainViewport();
    addRows(model, "after", 80, 100);
    hideRows(model, [bottom + 1]);
    const { width, height } = model.getters.getSheetViewDimension();
    const x = width / 2;
    triggerMouseEvent(".o-fake-grid", "pointerdown", x, height / 2);
    triggerMouseEvent(".o-fake-grid", "pointermove", x, 1.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * height, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", x, 1.5 * height);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 6,
      bottom: 50,
    });
    setViewportOffset(model, 0, (bottom + 2) * DEFAULT_CELL_HEIGHT);
    await nextTick();
    triggerMouseEvent(".o-fake-grid", "pointerdown", x, height / 2);
    triggerMouseEvent(".o-fake-grid", "pointermove", x, -1.5 * height);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-fake-grid", "pointerup", x, -1.5 * height);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 39,
      bottom: 83,
    });
  });
});
