import { Component, useSubEnv, xml } from "@odoo/owl";
import { Model } from "../../src";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  getDefaultSheetViewSize,
} from "../../src/constants";
import { toHex, toZone } from "../../src/helpers";
import { Color, Highlight } from "../../src/types";
import { merge } from "../test_helpers/commands_helpers";
import { edgeScrollDelay, triggerMouseEvent } from "../test_helpers/dom_helper";
import {
  mountComponent,
  mountSpreadsheet,
  nextTick,
  startGridComposition,
  typeInComposerGrid,
} from "../test_helpers/helpers";
import { HighlightOverlay } from "./../../src/components/highlight/highlight_overlay/highlight_overlay";

jest.mock("../../src/components/composer/content_editable_helper.ts", () =>
  require("../__mocks__/content_editable_helper")
);
// As we test an isolated component, grid and gridOverlay won't exist
jest.mock("../../src/components/helpers/dom_helpers", () => {
  return {
    ...jest.requireActual("../../src/components/helpers/dom_helpers"),
    ...jest.requireActual("../__mocks__/dom_helpers"),
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
  triggerMouseEvent(el, "pointerdown", getColStartPosition(left), getRowStartPosition(top));
  await nextTick();
}

async function selectNECellCorner(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "pointerdown", getColEndPosition(left), getRowStartPosition(top));
  await nextTick();
}

async function selectSWCellCorner(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "pointerdown", getColStartPosition(left), getRowEndPosition(top));
  await nextTick();
}

async function selectSECellCorner(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "pointerdown", getColEndPosition(left), getRowEndPosition(top));
  await nextTick();
}

async function selectTopCellBorder(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(
    el,
    "pointerdown",
    getColStartPosition(left) + 10,
    getRowStartPosition(top) + 2
  );
  await nextTick();
}

async function selectBottomCellBorder(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "pointerdown", getColStartPosition(left) + 10, getRowEndPosition(top) - 2);
  await nextTick();
}

async function selectLeftCellBorder(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(
    el,
    "pointerdown",
    getColStartPosition(left) + 2,
    getRowStartPosition(top) + 10
  );
  await nextTick();
}

async function selectRightCellBorder(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "pointerdown", getColEndPosition(left) - 2, getRowStartPosition(top) + 10);
  await nextTick();
}

async function moveToCell(el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(
    el,
    "pointermove",
    getColStartPosition(left) + 10,
    getRowStartPosition(top) + 10
  );
  await nextTick();
}

let model: Model;
let fixture: HTMLElement;
let cornerEl: Element;
let borderEl: Element;
let spyDispatch: jest.SpyInstance;
let spyHandleEvent: jest.Mock;

interface Props {
  model: Model;
  highlight: Highlight;
}

class Parent extends Component<Props> {
  static components = { HighlightOverlay };
  static template = xml/*xml*/ `
    <HighlightOverlay highlight="props.highlight" />
  `;
  static props = { ...HighlightOverlay.props, model: Object };
  setup() {
    spyDispatch = jest.spyOn(model, "dispatch");
    spyHandleEvent = jest.fn();
    // register component to listen to selection changes

    const zone = this.props.highlight.zone;
    model.selection.capture(
      this,
      {
        cell: { col: zone.left, row: zone.top },
        zone: zone,
      },
      {
        handleEvent: spyHandleEvent.bind(this),
      }
    );
    useSubEnv({
      model: this.props.model,
    });
  }
}

async function mountHighlight(
  zone: string,
  color: Color,
  highlightOptions?: Partial<Highlight>
): Promise<{ parent: Parent; model: Model }> {
  let parent: Component;
  const highlight: Highlight = {
    zone: toZone(zone),
    color,
    sheetId: model.getters.getActiveSheetId(),
    movable: true,
    resizable: true,
    ...highlightOptions,
  };
  ({ fixture, parent } = await mountComponent(Parent, {
    props: { highlight, model },
  }));
  return { parent: parent as Parent, model };
}

function expectedResult(xc: string) {
  const zone = toZone(xc);
  return expect.objectContaining({
    anchor: {
      cell: { col: zone.left, row: zone.top },
      zone: toZone(xc),
    },
    mode: "overrideSelection",
    options: { unbounded: true },
  });
}

const genericBeforeEach = async () => {
  model = new Model();
  model.dispatch("RESIZE_SHEETVIEW", {
    width: getDefaultSheetViewSize(),
    height: getDefaultSheetViewSize(),
    gridOffsetX: 0,
    gridOffsetY: 0,
  });
};

describe("Corner component", () => {
  beforeEach(genericBeforeEach);

  test("No corners if the highlight is not resizable", async () => {
    await mountHighlight("B2", "#666", { resizable: false });
    expect(fixture.querySelector(".o-corner-nw")).toBeNull();
  });

  describe("can drag all corners", () => {
    test("start on nw corner", async () => {
      await mountHighlight("B2", "#666");
      cornerEl = fixture.querySelector(".o-corner-nw")!;

      // select B2 nw corner
      selectNWCellCorner(cornerEl, "B2");
      expect(spyDispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", { zone: toZone("B2") });
      // move to A1
      moveToCell(cornerEl, "A1");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("A1:B2"));
    });

    test("start on ne corner", async () => {
      await mountHighlight("B2", "#666");
      cornerEl = fixture.querySelector(".o-corner-ne")!;

      // select B2 ne corner
      selectNECellCorner(cornerEl, "B2");
      expect(model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to C1
      moveToCell(cornerEl, "C1");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("B1:C2"));
    });

    test("start on sw corner", async () => {
      const parent = await mountHighlight("B2", "#666");
      cornerEl = fixture.querySelector(".o-corner-sw")!;

      // select B2 sw corner
      selectSWCellCorner(cornerEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to A3
      moveToCell(cornerEl, "A3");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("A2:B3"));
    });

    test("start on se corner", async () => {
      const parent = await mountHighlight("B2", "#666");
      cornerEl = fixture.querySelector(".o-corner-se")!;

      // select B2 se corner
      selectSECellCorner(cornerEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to C3
      moveToCell(cornerEl, "C3");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("B2:C3"));
    });
  });

  describe("drag highlight corner to cover full columns/rows will make the final highlight zone to be unbounded", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            colNumber: 10,
            rowNumber: 10,
          },
        ],
      });
    });
    test("single full column", async () => {
      await mountHighlight("B1", "#666");
      cornerEl = fixture.querySelector(".o-corner-se")!;

      selectSECellCorner(cornerEl, "B1");
      moveToCell(cornerEl, "B10");

      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("B1:B10"));
    });

    test("single full row", async () => {
      await mountHighlight("A1", "#666");
      cornerEl = fixture.querySelector(".o-corner-se")!;

      selectSECellCorner(cornerEl, "A1");
      moveToCell(cornerEl, "J1");

      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("A1:J1"));
    });

    test("multiple full columns", async () => {
      await mountHighlight("B1:C2", "#666");
      cornerEl = fixture.querySelector(".o-corner-se")!;

      selectSECellCorner(cornerEl, "C2");
      moveToCell(cornerEl, "D10");

      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("B1:D10"));
    });

    test("multiple full rows", async () => {
      await mountHighlight("A1:B3", "#666");
      cornerEl = fixture.querySelector(".o-corner-se")!;

      selectSECellCorner(cornerEl, "B3");
      moveToCell(cornerEl, "J4");

      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("A1:J4"));
    });

    test("the whole sheet", async () => {
      await mountHighlight("A1:B5", "#666");
      cornerEl = fixture.querySelector(".o-corner-se")!;

      selectSECellCorner(cornerEl, "B5");
      moveToCell(cornerEl, "J10");

      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("A1:J10"));
    });

    test("from full column to partially full column", async () => {
      await mountHighlight("B1:B10", "#666");
      cornerEl = fixture.querySelector(".o-corner-ne")!;

      selectNECellCorner(cornerEl, "B1");
      moveToCell(cornerEl, "B5");

      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("B5:B10"));
    });

    test("from full row to partially full row", async () => {
      await mountHighlight("A1:J1", "#666");
      cornerEl = fixture.querySelector(".o-corner-sw")!;

      selectSWCellCorner(cornerEl, "A1");
      moveToCell(cornerEl, "D1");

      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("D1:J1"));
    });
  });

  test("do nothing if drag outside the grid", async () => {
    await mountHighlight("A1", "#666");
    cornerEl = fixture.querySelector(".o-corner-nw")!;

    // select A1 nw corner
    selectNWCellCorner(cornerEl, "A1");

    expect(spyDispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("A1"),
    });

    // move outside the grid
    triggerMouseEvent(
      cornerEl,
      "pointermove",
      getColStartPosition(0) - 100,
      getRowStartPosition(0) - 100
    );
    await nextTick();

    expect(spyDispatch).toHaveBeenCalledTimes(1);
  });

  describe("dragging highlight corner on merged cells expands the final highlight zone", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            colNumber: 10,
            rowNumber: 10,
          },
        ],
      });
    });

    test("cells (not columns or rows)", async () => {
      merge(model, "B1:C1");
      const parent = await mountHighlight("B2", "#666");
      cornerEl = fixture.querySelector(".o-corner-nw")!;

      // select B2 ne corner
      selectNWCellCorner(cornerEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to B1
      moveToCell(cornerEl, "B1");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("B1:C2"));
    });

    test("full columns", async () => {
      merge(model, "B1:C1");
      const parent = await mountHighlight("A1:A10", "#666");
      cornerEl = fixture.querySelector(".o-corner-ne")!;

      selectNECellCorner(cornerEl, "A1");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("A1:A10"),
      });

      moveToCell(cornerEl, "B1");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("A1:C10"));
    });

    test("full rows", async () => {
      merge(model, "B2:B3");
      const parent = await mountHighlight("A1:J1", "#666");
      cornerEl = fixture.querySelector(".o-corner-sw")!;

      selectSWCellCorner(cornerEl, "A1");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("A1:J1"),
      });

      moveToCell(cornerEl, "A2");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("A1:J3"));
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
      zone: toZone("B1"),
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
      zone: toZone("A2"),
    });

    // move to A3
    moveToCell(cornerEl, "A3");
    expect(parent.model.dispatch).toHaveBeenCalledWith("SET_VIEWPORT_OFFSET", {
      offsetX: 0,
      offsetY: height / 2,
    });
  });

  test("Corner is colored with the same color as the highlight", async () => {
    await mountHighlight("A1", "#666666");
    const cornerEl = fixture.querySelector(".o-corner-nw")! as HTMLElement;
    expect(toHex(cornerEl.style.backgroundColor)).toBe("#666666");
  });
});

describe("Border component", () => {
  beforeEach(genericBeforeEach);

  test("No borders if the highlight is not movable", async () => {
    await mountHighlight("B2", "#666", { movable: false });
    expect(fixture.querySelector(".o-border-n")).toBeNull();
  });

  describe("can drag all borders", () => {
    test("start on top border", async () => {
      const parent = await mountHighlight("B2", "#666");
      borderEl = fixture.querySelector(".o-border-n")!;

      // select B2 top border
      selectTopCellBorder(borderEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to C2
      moveToCell(borderEl, "C2");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("C2"));
    });

    test("start on left border", async () => {
      const parent = await mountHighlight("B2", "#666");
      borderEl = fixture.querySelector(".o-border-w")!;

      // select B2 left border
      selectLeftCellBorder(borderEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to C2
      moveToCell(borderEl, "C2");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("C2"));
    });

    test("start on right border", async () => {
      const parent = await mountHighlight("B2", "#666");
      borderEl = fixture.querySelector(".o-border-e")!;

      // select B2 right border
      selectRightCellBorder(borderEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to C2
      moveToCell(borderEl, "C2");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("C2"));
    });

    test("start on bottom border", async () => {
      const parent = await mountHighlight("B2", "#666");
      borderEl = fixture.querySelector(".o-border-s")!;

      // select B2 bottom border
      selectBottomCellBorder(borderEl, "B2");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to C2
      moveToCell(borderEl, "C2");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("C2"));
    });
  });

  describe("dragging borders will keep the unbounded zones", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            colNumber: 10,
            rowNumber: 10,
          },
        ],
      });
    });

    test("single full column", async () => {
      await mountHighlight("B1:B10", "#666");
      borderEl = fixture.querySelector(".o-border-e")!;

      selectRightCellBorder(borderEl, "B2");
      moveToCell(borderEl, "C2");

      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("C1:C10"));
    });

    test("single full row", async () => {
      await mountHighlight("A1:J1", "#666");
      borderEl = fixture.querySelector(".o-border-s")!;

      selectBottomCellBorder(borderEl, "A1");
      moveToCell(borderEl, "A2");

      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("A2:J2"));
    });

    test("multiple columns", async () => {
      await mountHighlight("B1:C10", "#666");
      borderEl = fixture.querySelector(".o-border-e")!;

      selectRightCellBorder(borderEl, "C2");
      moveToCell(borderEl, "F2");

      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("E1:F10"));
    });

    test("multiple rows", async () => {
      await mountHighlight("A1:J2", "#666");
      borderEl = fixture.querySelector(".o-border-s")!;

      selectBottomCellBorder(borderEl, "B2");
      moveToCell(borderEl, "B4");

      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("A3:J4"));
    });

    test("partially full column", async () => {
      await mountHighlight("B5:B10", "#666");
      borderEl = fixture.querySelector(".o-border-e")!;

      selectRightCellBorder(borderEl, "B7");
      moveToCell(borderEl, "C7");

      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("C5:C10"));
    });

    test("partially full row", async () => {
      await mountHighlight("C1:J1", "#666");
      borderEl = fixture.querySelector(".o-border-s")!;

      selectBottomCellBorder(borderEl, "D1");
      moveToCell(borderEl, "D2");

      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("C2:J2"));
    });
  });

  test("drag the A1:B2 highlight, start on A1 top border, finish on C1 --> set C1:D2 highlight", async () => {
    const parent = await mountHighlight("A1:B2", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select A1 top border
    selectTopCellBorder(borderEl, "A1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("A1:B2"),
    });

    // move to B1
    moveToCell(borderEl, "B1");
    expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("B1:C2"));

    // move to C1
    moveToCell(borderEl, "C1");
    expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("C1:D2"));
  });

  test("drag the A1:B2 highlight, start on B1 top border, finish on C1 --> set B1:C2 highlight", async () => {
    const parent = await mountHighlight("A1:B2", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select B1 top border
    selectTopCellBorder(borderEl, "B1");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("A1:B2"),
    });

    // move to C1
    moveToCell(borderEl, "C1");
    expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("B1:C2"));
  });

  test("cannot drag highlight zone if already beside limit border", async () => {
    const parent = await mountHighlight("A1:B2", "#666");
    borderEl = fixture.querySelector(".o-border-s")!;

    // select B2 bottom border
    selectBottomCellBorder(borderEl, "B2");
    expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("A1:B2"),
    });

    // move to A2
    moveToCell(borderEl, "A2");
    expect(parent.model.dispatch).toHaveBeenCalledTimes(1);
  });

  describe("dragging highlight border on merged cells expands the final highlight zone", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            colNumber: 10,
            rowNumber: 10,
          },
        ],
      });
    });

    test("cells (not columns or rows)", async () => {
      merge(model, "B1:C1");
      const parent = await mountHighlight("A1", "#666");
      borderEl = fixture.querySelector(".o-border-n")!;

      // select A1 top border
      selectTopCellBorder(borderEl, "A1");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("A1"),
      });

      // move to B1
      moveToCell(borderEl, "B1");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("B1:C1"));
    });

    test("full columns", async () => {
      merge(model, "B1:C1");
      const parent = await mountHighlight("A1:A10", "#666");
      borderEl = fixture.querySelector(".o-border-n")!;

      selectTopCellBorder(borderEl, "A1");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("A1:A10"),
      });

      moveToCell(borderEl, "B1");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("B1:C10"));
    });

    test("full rows", async () => {
      merge(model, "B2:B3");
      const parent = await mountHighlight("A1:J1", "#666");
      borderEl = fixture.querySelector(".o-border-n")!;

      selectTopCellBorder(borderEl, "A1");
      expect(parent.model.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("A1:J1"),
      });

      moveToCell(borderEl, "A2");
      expect(spyHandleEvent).toHaveBeenCalledWith(expectedResult("A2:J3"));
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
      zone: toZone("B1"),
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
      zone: toZone("A2"),
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

    triggerMouseEvent(".o-border-n", "pointerdown", width / 2, y);
    triggerMouseEvent(".o-border-n", "pointermove", 1.5 * width, y);
    const advanceTimer = edgeScrollDelay(0.5 * width, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-border-n", "pointerup", 1.5 * width, y);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 6,
      right: 16,
      top: 0,
      bottom: 42,
    });

    // force a nextTick to update the props of Highlight as it is not using an internal state
    await nextTick();

    triggerMouseEvent(".o-border-n", "pointerdown", width / 2, y);
    triggerMouseEvent(".o-border-n", "pointermove", -0.5 * width, y);
    const advanceTimer2 = edgeScrollDelay(0.5 * width, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-border-n", "pointerup", -0.5 * width, y);

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
    triggerMouseEvent(".o-border-n", "pointerdown", x, height / 2);
    triggerMouseEvent(".o-border-n", "pointermove", x, 1.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * height, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-border-n", "pointerup", x, 1.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 6,
      bottom: 48,
    });

    // force a nextTick to update the props of Highlight as it is not using an internal state
    await nextTick();

    triggerMouseEvent(".o-border-n", "pointerdown", x, height / 2);
    triggerMouseEvent(".o-border-n", "pointermove", x, -0.5 * height);
    const advanceTimer2 = edgeScrollDelay(0.5 * height, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-border-n", "pointerup", x, -0.5 * height);

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

    triggerMouseEvent(".o-corner-nw", "pointerdown", width / 2, y);
    triggerMouseEvent(".o-corner-nw", "pointermove", 1.5 * width, y);
    const advanceTimer = edgeScrollDelay(0.5 * width, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-corner-nw", "pointerup", 1.5 * width, y);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 6,
      right: 16,
      top: 0,
      bottom: 42,
    });

    // force a nextTick to update the props of Highlight as it is not using an internal state
    await nextTick();

    triggerMouseEvent(".o-corner-nw", "pointerdown", width / 2, y);
    triggerMouseEvent(".o-corner-nw", "pointermove", -0.5 * width, y);
    const advanceTimer2 = edgeScrollDelay(0.5 * width, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-corner-nw", "pointerup", -0.5 * width, y);

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
    triggerMouseEvent(".o-corner-nw", "pointerdown", x, height / 2);
    triggerMouseEvent(".o-corner-nw", "pointermove", x, 1.5 * height);
    const advanceTimer = edgeScrollDelay(0.5 * height, 5);

    jest.advanceTimersByTime(advanceTimer);
    triggerMouseEvent(".o-corner-nw", "pointerup", x, 1.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 6,
      bottom: 48,
    });

    // force a nextTick to update the props of Highlight as it is not using an internal state
    await nextTick();

    triggerMouseEvent(".o-corner-nw", "pointerdown", x, height / 2);
    triggerMouseEvent(".o-corner-nw", "pointermove", x, -0.5 * height);
    const advanceTimer2 = edgeScrollDelay(0.5 * height, 2);

    jest.advanceTimersByTime(advanceTimer2);
    triggerMouseEvent(".o-corner-nw", "pointerup", x, -0.5 * height);

    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 3,
      bottom: 45,
    });
  });
});
