import { Component, useSubEnv, xml } from "@odoo/owl";
import { Highlight } from "../../src/components/highlight/highlight/highlight";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_SHEETVIEW_SIZE,
} from "../../src/constants";
import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { Color } from "../../src/types";
import { DispatchResult } from "../../src/types/commands";
import { merge } from "../test_helpers/commands_helpers";
import { edgeScrollDelay, triggerMouseEvent } from "../test_helpers/dom_helper";
import {
  mountComponent,
  mountSpreadsheet,
  nextTick,
  startGridComposition,
  typeInComposerGrid,
} from "../test_helpers/helpers";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);
// As we test an isolated component, grid and gridOverlay won't exist
jest.mock("../../src/components/helpers/dom_helpers", () => {
  return {
    ...jest.requireActual("../../src/components/helpers/dom_helpers"),
    ...jest.requireActual("./__mocks__/dom_helpers"),
  };
});

function getColStartPosition(col: number) {
  return model.getters.getColDimensions(model.getters.getActiveSheetId(), col).start;
}

function getColEndPosition(col: number) {
  return model.getters.getColDimensions(model.getters.getActiveSheetId(), col).end;
}

function getRowStartPosition(row: number) {
  return model.getters.getRowDimensions(model.getters.getActiveSheetId(), row).start;
}

function getRowEndPosition(row: number) {
  return model.getters.getRowDimensions(model.getters.getActiveSheetId(), row).end;
}

async function selectNWCellCorner(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "mousedown", getColStartPosition(left), getRowStartPosition(top));
  await nextTick();
}

async function selectNECellCorner(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "mousedown", getColEndPosition(left), getRowStartPosition(top));
  await nextTick();
}

async function selectSWCellCorner(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "mousedown", getColStartPosition(left), getRowEndPosition(top));
  await nextTick();
}

async function selectSECellCorner(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "mousedown", getColEndPosition(left), getRowEndPosition(top));
  await nextTick();
}

async function selectTopCellBorder(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "mousedown", getColStartPosition(left) + 10, getRowStartPosition(top) + 2);
  await nextTick();
}

async function selectBottomCellBorder(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "mousedown", getColStartPosition(left) + 10, getRowEndPosition(top) - 2);
  await nextTick();
}

async function selectLeftCellBorder(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "mousedown", getColStartPosition(left) + 2, getRowStartPosition(top) + 10);
  await nextTick();
}

async function selectRightCellBorder(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "mousedown", getColEndPosition(left) - 2, getRowStartPosition(top) + 10);
  await nextTick();
}

async function moveToCell(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "mousemove", getColStartPosition(left) + 10, getRowStartPosition(top) + 10);
  await nextTick();
}

let model: Model;
let fixture: HTMLElement;
let cornerEl: Element;
let borderEl: Element;

class Parent extends Component {
  static components = { Highlight };
  static template = xml/*xml*/ `
    <Highlight zone="props.zone" color="props.color"/>
  `;
  setup() {
    this.props.model.dispatch = jest.fn((command) => DispatchResult.Success);
    useSubEnv({
      model: this.props.model,
    });
  }

  get model(): Model {
    return this.props.model;
  }
}

async function mountHighlight(zone: string, color: Color): Promise<Parent> {
  let parent: Component;
  ({ fixture, parent } = await mountComponent(Parent, {
    props: { zone: toZone(zone), color, model },
  }));
  return parent as Parent;
}

const genericBeforeEach = async () => {
  model = new Model();
  model.dispatch("RESIZE_SHEETVIEW", {
    width: DEFAULT_SHEETVIEW_SIZE,
    height: DEFAULT_SHEETVIEW_SIZE,
    gridOffsetX: 0,
    gridOffsetY: 0,
  });
};

describe("Corner component", () => {
  beforeEach(genericBeforeEach);
  describe("can drag all corners", () => {
    test("start on nw corner", async () => {
      await mountHighlight("B2", "#666");
      cornerEl = fixture.querySelector(".o-corner-nw")!;

      // select B2 nw corner
      selectNWCellCorner(cornerEl, "B2");
      expect(model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("B2"), _sheetId: model.getters.getActiveSheetId() },
      });
      // move to A1
      moveToCell(cornerEl, "A1");
      expect(model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("A1:B2"), _sheetId: model.getters.getActiveSheetId() },
      });
    });

    test("start on ne corner", async () => {
      const parent = await mountHighlight("B2", "#666");
      cornerEl = fixture.querySelector(".o-corner-ne")!;

      // select B2 ne corner
      selectNECellCorner(cornerEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("B2"), _sheetId: model.getters.getActiveSheetId() },
      });

      // move to C1
      moveToCell(cornerEl, "C1");
      expect(parent.model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("B1:C2"), _sheetId: model.getters.getActiveSheetId() },
      });
    });

    test("start on sw corner", async () => {
      const parent = await mountHighlight("B2", "#666");
      cornerEl = fixture.querySelector(".o-corner-sw")!;

      // select B2 sw corner
      selectSWCellCorner(cornerEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("B2"), _sheetId: model.getters.getActiveSheetId() },
      });

      // move to A3
      moveToCell(cornerEl, "A3");
      expect(parent.model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("A2:B3"), _sheetId: model.getters.getActiveSheetId() },
      });
    });

    test("start on se corner", async () => {
      const parent = await mountHighlight("B2", "#666");
      cornerEl = fixture.querySelector(".o-corner-se")!;

      // select B2 se corner
      selectSECellCorner(cornerEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("B2"), _sheetId: model.getters.getActiveSheetId() },
      });

      // move to C3
      moveToCell(cornerEl, "C3");
      expect(parent.model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("B2:C3"), _sheetId: model.getters.getActiveSheetId() },
      });
    });
  });

  test("do nothing if drag outside the grid", async () => {
    const parent = await mountHighlight("A1", "#666");
    cornerEl = fixture.querySelector(".o-corner-nw")!;

    // select A1 nw corner
    selectNWCellCorner(cornerEl, "A1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("A1"), _sheetId: model.getters.getActiveSheetId() },
    });

    // move outside the grid
    triggerMouseEvent(
      cornerEl,
      "mousemove",
      getColStartPosition(0) - 100,
      getRowStartPosition(0) - 100
    );
    await nextTick();
    expect(parent.model.dispatch).toHaveBeenCalledTimes(1);
  });

  test("drag highlight corner on merged cells expands the final highlight zone", async () => {
    merge(model, "B1:C1");
    const parent = await mountHighlight("B2", "#666");
    cornerEl = fixture.querySelector(".o-corner-nw")!;

    // select B2 se corner
    selectNWCellCorner(cornerEl, "B2");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("B2"), _sheetId: model.getters.getActiveSheetId() },
    });

    // move to B1
    moveToCell(cornerEl, "B1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("B1:C2"), _sheetId: model.getters.getActiveSheetId() },
    });
  });

  test("can edge-scroll horizontally", async () => {
    const { width } = model.getters.getSheetViewDimensionWithHeaders();
    model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "COL",
      sheetId: model.getters.getActiveSheetId(),
      elements: [0, 1],
      size: width / 2,
    });
    const parent = await mountHighlight("B1", "#666");
    cornerEl = fixture.querySelector(".o-corner-nw")!;

    // select B1 nw corner
    selectNWCellCorner(cornerEl, "B1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("B1"), _sheetId: model.getters.getActiveSheetId() },
    });

    // move to C1
    moveToCell(cornerEl, "C1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("SET_VIEWPORT_OFFSET", {
      offsetX: width / 2,
      offsetY: 0,
    });
  });

  test("can edge-scroll vertically", async () => {
    const { height } = model.getters.getSheetViewDimensionWithHeaders();
    model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "ROW",
      sheetId: model.getters.getActiveSheetId(),
      elements: [0, 1],
      size: height / 2,
    });
    const parent = await mountHighlight("A2", "#666");
    cornerEl = fixture.querySelector(".o-corner-nw")!;

    // select A2 nw corner
    selectTopCellBorder(cornerEl, "A2");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("A2"), _sheetId: model.getters.getActiveSheetId() },
    });

    // move to A3
    moveToCell(cornerEl, "A3");
    expect(parent.model.dispatch).toHaveBeenCalledWith("SET_VIEWPORT_OFFSET", {
      offsetX: 0,
      offsetY: height / 2,
    });
  });
});

describe("Border component", () => {
  beforeEach(genericBeforeEach);
  describe("can drag all borders", () => {
    test("start on top border", async () => {
      const parent = await mountHighlight("B2", "#666");
      borderEl = fixture.querySelector(".o-border-n")!;

      // select B2 top border
      selectTopCellBorder(borderEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("B2"), _sheetId: model.getters.getActiveSheetId() },
      });

      // move to C2
      moveToCell(borderEl, "C2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("C2"), _sheetId: model.getters.getActiveSheetId() },
      });
    });

    test("start on left border", async () => {
      const parent = await mountHighlight("B2", "#666");
      borderEl = fixture.querySelector(".o-border-w")!;

      // select B2 left border
      selectLeftCellBorder(borderEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("B2"), _sheetId: model.getters.getActiveSheetId() },
      });

      // move to C2
      moveToCell(borderEl, "C2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("C2"), _sheetId: model.getters.getActiveSheetId() },
      });
    });

    test("start on right border", async () => {
      const parent = await mountHighlight("B2", "#666");
      borderEl = fixture.querySelector(".o-border-w")!;

      // select B2 right border
      selectRightCellBorder(borderEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("B2"), _sheetId: model.getters.getActiveSheetId() },
      });

      // move to C2
      moveToCell(borderEl, "C2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("C2"), _sheetId: model.getters.getActiveSheetId() },
      });
    });

    test("start on bottom border", async () => {
      const parent = await mountHighlight("B2", "#666");
      borderEl = fixture.querySelector(".o-border-w")!;

      // select B2 bottom border
      selectBottomCellBorder(borderEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("B2"), _sheetId: model.getters.getActiveSheetId() },
      });

      // move to C2
      moveToCell(borderEl, "C2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
        range: { _zone: toZone("C2"), _sheetId: model.getters.getActiveSheetId() },
      });
    });
  });

  test("drag the A1:B2 highlight, start on A1 top border, finish on C1 --> set C1:D2 highlight", async () => {
    const parent = await mountHighlight("A1:B2", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select A1 top border
    selectTopCellBorder(borderEl, "A1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("A1:B2"), _sheetId: model.getters.getActiveSheetId() },
    });

    // move to B1
    moveToCell(borderEl, "B1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("B1:C2"), _sheetId: model.getters.getActiveSheetId() },
    });

    // move to C1
    moveToCell(borderEl, "C1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("C1:D2"), _sheetId: model.getters.getActiveSheetId() },
    });
  });

  test("drag the A1:B2 highlight, start on B1 top border, finish on C1 --> set B1:C2 highlight", async () => {
    const parent = await mountHighlight("A1:B2", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select B1 top border
    selectTopCellBorder(borderEl, "B1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("A1:B2"), _sheetId: model.getters.getActiveSheetId() },
    });

    // move to C1
    moveToCell(borderEl, "C1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("B1:C2"), _sheetId: model.getters.getActiveSheetId() },
    });
  });

  test("cannot drag highlight zone if already beside limit border", async () => {
    const parent = await mountHighlight("A1:B2", "#666");
    borderEl = fixture.querySelector(".o-border-s")!;

    // select B2 bottom border
    selectBottomCellBorder(borderEl, "B2");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("A1:B2"), _sheetId: model.getters.getActiveSheetId() },
    });

    // move to A2
    moveToCell(borderEl, "A2");
    expect(parent.model.dispatch).toHaveBeenCalledTimes(1);
  });

  test("drag highlight order on merged cells expands the final highlight zone", async () => {
    merge(model, "B1:C1");
    const parent = await mountHighlight("A1", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select A1 top border
    selectTopCellBorder(borderEl, "A1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("A1"), _sheetId: model.getters.getActiveSheetId() },
    });

    // move to B1
    moveToCell(borderEl, "B1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("B1:C1"), _sheetId: model.getters.getActiveSheetId() },
    });
  });

  test("drag highlight on merged cells expands the highlight zone", async () => {
    merge(model, "B1:C1");
    const parent = await mountHighlight("A1", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select A1 top border
    selectTopCellBorder(borderEl, "A1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("A1"), _sheetId: model.getters.getActiveSheetId() },
    });

    // move to B1
    moveToCell(borderEl, "B1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("B1:C1"), _sheetId: model.getters.getActiveSheetId() },
    });
  });

  test("can edge-scroll horizontally", async () => {
    const { width } = model.getters.getSheetViewDimensionWithHeaders();
    model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "COL",
      sheetId: model.getters.getActiveSheetId(),
      elements: [0, 1],
      size: width / 2,
    });
    const parent = await mountHighlight("B1", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select B1 top border
    selectTopCellBorder(borderEl, "B1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("B1"), _sheetId: model.getters.getActiveSheetId() },
    });

    // move to C1
    moveToCell(borderEl, "C1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("SET_VIEWPORT_OFFSET", {
      offsetX: width / 2,
      offsetY: 0,
    });
  });

  test("can edge-scroll vertically", async () => {
    const { height } = model.getters.getSheetViewDimensionWithHeaders();
    model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "ROW",
      sheetId: model.getters.getActiveSheetId(),
      elements: [0, 1],
      size: height / 2,
    });
    const parent = await mountHighlight("A2", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select A2 top border
    selectTopCellBorder(borderEl, "A2");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      range: { _zone: toZone("A2"), _sheetId: model.getters.getActiveSheetId() },
    });

    // move to A3
    moveToCell(borderEl, "A3");
    expect(parent.model.dispatch).toHaveBeenCalledWith("SET_VIEWPORT_OFFSET", {
      offsetX: 0,
      offsetY: height / 2,
    });
  });
});

describe("Edge-Scrolling on mouseMove of hightlights", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    ({ model, fixture } = await mountSpreadsheet());
    // ensure that highlights exist
    await startGridComposition();
    await typeInComposerGrid("=A1");
  });

  test("Can edge-scroll border horizontally", async () => {
    const { width } = model.getters.getSheetViewDimensionWithHeaders();
    const y = DEFAULT_CELL_HEIGHT;

    triggerMouseEvent(".o-border-n", "mousedown", width / 2, y);
    triggerMouseEvent(".o-border-n", "mousemove", 1.5 * width, y);
    const advanceTimer = edgeScrollDelay(0.5 * width, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-border-n", "mouseup", 1.5 * width, y);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 6,
      right: 16,
      top: 0,
      bottom: 42,
    });

    // force a nextTick to update the props of Highlight as it is not using an internal state
    await nextTick();

    triggerMouseEvent(".o-border-n", "mousedown", width / 2, y);
    triggerMouseEvent(".o-border-n", "mousemove", -0.5 * width, y);
    const advanceTimer2 = edgeScrollDelay(0.5 * width, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-border-n", "mouseup", -0.5 * width, y);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 3,
      right: 13,
      top: 0,
      bottom: 42,
    });
  });

  test("Can edge-scroll border vertically", async () => {
    const { height } = model.getters.getSheetViewDimensionWithHeaders();
    const x = DEFAULT_CELL_WIDTH / 2;
    triggerMouseEvent(".o-border-n", "mousedown", x, height / 2);
    triggerMouseEvent(".o-border-n", "mousemove", x, 1.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * height, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-border-n", "mouseup", x, 1.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 6,
      bottom: 48,
    });

    // force a nextTick to update the props of Highlight as it is not using an internal state
    await nextTick();

    triggerMouseEvent(".o-border-n", "mousedown", x, height / 2);
    triggerMouseEvent(".o-border-n", "mousemove", x, -0.5 * height);
    const advanceTimer2 = edgeScrollDelay(0.5 * height, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-border-n", "mouseup", x, -0.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 3,
      bottom: 45,
    });
  });

  test("Can edge-scroll corner horizontally", async () => {
    const { width } = model.getters.getSheetViewDimensionWithHeaders();
    const y = DEFAULT_CELL_HEIGHT;

    triggerMouseEvent(".o-corner-nw", "mousedown", width / 2, y);
    triggerMouseEvent(".o-corner-nw", "mousemove", 1.5 * width, y);
    const advanceTimer = edgeScrollDelay(0.5 * width, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-corner-nw", "mouseup", 1.5 * width, y);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 6,
      right: 16,
      top: 0,
      bottom: 42,
    });

    // force a nextTick to update the props of Highlight as it is not using an internal state
    await nextTick();

    triggerMouseEvent(".o-corner-nw", "mousedown", width / 2, y);
    triggerMouseEvent(".o-corner-nw", "mousemove", -0.5 * width, y);
    const advanceTimer2 = edgeScrollDelay(0.5 * width, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-corner-nw", "mouseup", -0.5 * width, y);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 3,
      right: 13,
      top: 0,
      bottom: 42,
    });
  });

  test("Can edge-scroll corner vertically", async () => {
    const { height } = model.getters.getSheetViewDimensionWithHeaders();
    const x = DEFAULT_CELL_WIDTH / 2;
    triggerMouseEvent(".o-corner-nw", "mousedown", x, height / 2);
    triggerMouseEvent(".o-corner-nw", "mousemove", x, 1.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * height, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-corner-nw", "mouseup", x, 1.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 6,
      bottom: 48,
    });

    // force a nextTick to update the props of Highlight as it is not using an internal state
    await nextTick();

    triggerMouseEvent(".o-corner-nw", "mousedown", x, height / 2);
    triggerMouseEvent(".o-corner-nw", "mousemove", x, -0.5 * height);
    const advanceTimer2 = edgeScrollDelay(0.5 * height, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-corner-nw", "mouseup", x, -0.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 3,
      bottom: 45,
    });
  });
});
