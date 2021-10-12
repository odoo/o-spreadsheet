import * as owl from "@odoo/owl";
import { Highlight } from "../../src/components/highlight/highlight";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { SpreadsheetEnv } from "../../src/types";
import { DispatchResult } from "../../src/types/commands";
import { merge } from "../test_helpers/commands_helpers";
import { triggerMouseEvent } from "../test_helpers/dom_helper";
import { makeTestFixture, nextTick } from "../test_helpers/helpers";

const { Component } = owl;
const { useSubEnv } = owl.hooks;
const { xml } = owl.tags;

function getColStartPosition(col: number) {
  return (
    HEADER_WIDTH + parent.env.getters.getCol(parent.env.getters.getActiveSheetId(), col)!.start
  );
}

function getColEndPosition(col: number) {
  return HEADER_WIDTH + parent.env.getters.getCol(parent.env.getters.getActiveSheetId(), col)!.end;
}

function getRowStartPosition(row: number) {
  return (
    HEADER_HEIGHT + parent.env.getters.getRow(parent.env.getters.getActiveSheetId(), row)!.start
  );
}

function getRowEndPosition(row: number) {
  return HEADER_HEIGHT + parent.env.getters.getRow(parent.env.getters.getActiveSheetId(), row)!.end;
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
let parent: owl.Component<any, SpreadsheetEnv>;
let cornerEl: Element;
let borderEl: Element;

class Parent extends Component<Highlight["props"], SpreadsheetEnv> {
  static components = { Highlight };
  static template = xml/*xml*/ `
    <Highlight zone="props.zone" color="props.color"/>
  `;
  constructor(model: Model, props: Highlight["props"]) {
    super(undefined, props);
    useSubEnv({
      getters: model.getters,
      dispatch: jest.fn((command) => DispatchResult.Success),
    });
  }
}

async function mountHighlight(zone: string, color: string) {
  parent = new Parent(model, {
    zone: toZone(zone),
    color,
  });
  await parent.mount(fixture);
}

beforeEach(async () => {
  fixture = makeTestFixture();
  model = new Model();

  model.dispatch("RESIZE_VIEWPORT", {
    width: 1000,
    height: 1000,
  });
});

afterEach(() => {
  parent.destroy();
  fixture.remove();
});

describe("Corner component", () => {
  describe("can drag all corners", () => {
    test("start on nw corner", async () => {
      await mountHighlight("B2", "#666");
      cornerEl = fixture.querySelector(".o-corner-nw")!;

      // select B2 nw corner
      selectNWCellCorner(cornerEl, "B2");
      expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to A1
      moveToCell(cornerEl, "A1");
      expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
        zone: toZone("A1:B2"),
      });
    });

    test("start on ne corner", async () => {
      await mountHighlight("B2", "#666");
      cornerEl = fixture.querySelector(".o-corner-ne")!;

      // select B2 ne corner
      selectNECellCorner(cornerEl, "B2");
      expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to C1
      moveToCell(cornerEl, "C1");
      expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
        zone: toZone("B1:C2"),
      });
    });

    test("start on sw corner", async () => {
      await mountHighlight("B2", "#666");
      cornerEl = fixture.querySelector(".o-corner-sw")!;

      // select B2 sw corner
      selectSWCellCorner(cornerEl, "B2");
      expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to A3
      moveToCell(cornerEl, "A3");
      expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
        zone: toZone("A2:B3"),
      });
    });

    test("start on se corner", async () => {
      await mountHighlight("B2", "#666");
      cornerEl = fixture.querySelector(".o-corner-se")!;

      // select B2 se corner
      selectSECellCorner(cornerEl, "B2");
      expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to C3
      moveToCell(cornerEl, "C3");
      expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
        zone: toZone("B2:C3"),
      });
    });
  });

  test("do nothing if drag outside the grid", async () => {
    await mountHighlight("A1", "#666");
    cornerEl = fixture.querySelector(".o-corner-nw")!;

    // select A1 nw corner
    selectNWCellCorner(cornerEl, "A1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("A1"),
    });

    // move outside the grid
    triggerMouseEvent(
      cornerEl,
      "mousemove",
      getColStartPosition(0) - 100,
      getRowStartPosition(0) - 100
    );
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledTimes(1);
  });

  test("drag highlight corner on merged cells expands the final highlight zone", async () => {
    merge(model, "B1:C1");
    await mountHighlight("B2", "#666");
    cornerEl = fixture.querySelector(".o-corner-nw")!;

    // select B2 se corner
    selectNWCellCorner(cornerEl, "B2");
    expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("B2"),
    });

    // move to B1
    moveToCell(cornerEl, "B1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", {
      zone: toZone("B1:C2"),
    });
  });

  test("can edge-scroll horizontally", async () => {
    const { width } = model.getters.getViewportDimension();
    model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "COL",
      sheetId: model.getters.getActiveSheetId(),
      elements: [0, 1],
      size: width / 2,
    });
    await mountHighlight("B1", "#666");
    cornerEl = fixture.querySelector(".o-corner-nw")!;

    // select B1 nw corner
    selectNWCellCorner(cornerEl, "B1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("B1"),
    });

    // move to C1
    moveToCell(cornerEl, "C1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("SET_VIEWPORT_OFFSET", {
      offsetX: width / 2,
      offsetY: 0,
    });
  });

  test("can edge-scroll vertically", async () => {
    const { height } = model.getters.getViewportDimension();
    model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "ROW",
      sheetId: model.getters.getActiveSheetId(),
      elements: [0, 1],
      size: height / 2,
    });
    await mountHighlight("A2", "#666");
    cornerEl = fixture.querySelector(".o-corner-nw")!;

    // select A2 nw corner
    selectTopCellBorder(cornerEl, "A2");
    expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("A2"),
    });

    // move to A3
    moveToCell(cornerEl, "A3");
    expect(parent.env.dispatch).toHaveBeenCalledWith("SET_VIEWPORT_OFFSET", {
      offsetX: 0,
      offsetY: height / 2,
    });
  });
});

describe("Border component", () => {
  describe("can drag all borders", () => {
    test("start on top border", async () => {
      await mountHighlight("B2", "#666");
      borderEl = fixture.querySelector(".o-border-n")!;

      // select B2 top border
      selectTopCellBorder(borderEl, "B2");
      expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to C2
      moveToCell(borderEl, "C2");
      expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", { zone: toZone("C2") });
    });

    test("start on left border", async () => {
      await mountHighlight("B2", "#666");
      borderEl = fixture.querySelector(".o-border-w")!;

      // select B2 left border
      selectLeftCellBorder(borderEl, "B2");
      expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to C2
      moveToCell(borderEl, "C2");
      expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", { zone: toZone("C2") });
    });

    test("start on right border", async () => {
      await mountHighlight("B2", "#666");
      borderEl = fixture.querySelector(".o-border-w")!;

      // select B2 right border
      selectRightCellBorder(borderEl, "B2");
      expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to C2
      moveToCell(borderEl, "C2");
      expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", { zone: toZone("C2") });
    });

    test("start on bottom border", async () => {
      await mountHighlight("B2", "#666");
      borderEl = fixture.querySelector(".o-border-w")!;

      // select B2 bottom border
      selectBottomCellBorder(borderEl, "B2");
      expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });

      // move to C2
      moveToCell(borderEl, "C2");
      expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", { zone: toZone("C2") });
    });
  });

  test("drag the A1:B2 highlight, start on A1 top border, finish on C1 --> set C1:D2 highlight", async () => {
    await mountHighlight("A1:B2", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select A1 top border
    selectTopCellBorder(borderEl, "A1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("A1:B2"),
    });

    // move to B1
    moveToCell(borderEl, "B1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", { zone: toZone("B1:C2") });

    // move to C1
    moveToCell(borderEl, "C1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", { zone: toZone("C1:D2") });
  });

  test("drag the A1:B2 highlight, start on B1 top border, finish on C1 --> set B1:C2 highlight", async () => {
    await mountHighlight("A1:B2", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select B1 top border
    selectTopCellBorder(borderEl, "B1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("A1:B2"),
    });

    // move to C1
    moveToCell(borderEl, "C1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", { zone: toZone("B1:C2") });
  });

  test("cannot drag highlight zone if already beside limit border", async () => {
    await mountHighlight("A1:B2", "#666");
    borderEl = fixture.querySelector(".o-border-s")!;

    // select B2 bottom border
    selectBottomCellBorder(borderEl, "B2");
    expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("A1:B2"),
    });

    // move to A2
    moveToCell(borderEl, "A2");
    expect(parent.env.dispatch).toHaveBeenCalledTimes(1);
  });

  test("drag highlight order on merged cells expands the final highlight zone", async () => {
    merge(model, "B1:C1");
    await mountHighlight("A1", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select A1 top border
    selectTopCellBorder(borderEl, "A1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("A1"),
    });

    // move to B1
    moveToCell(borderEl, "B1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", { zone: toZone("B1:C1") });
  });

  test("drag highlight on merged cells expands the highlight zone", async () => {
    merge(model, "B1:C1");
    await mountHighlight("A1", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select A1 top border
    selectTopCellBorder(borderEl, "A1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("A1"),
    });

    // move to B1
    moveToCell(borderEl, "B1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("CHANGE_HIGHLIGHT", { zone: toZone("B1:C1") });
  });

  test("can edge-scroll horizontally", async () => {
    const { width } = model.getters.getViewportDimension();
    model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "COL",
      sheetId: model.getters.getActiveSheetId(),
      elements: [0, 1],
      size: width / 2,
    });
    await mountHighlight("B1", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select B1 top border
    selectTopCellBorder(borderEl, "B1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("B1"),
    });

    // move to C1
    moveToCell(borderEl, "C1");
    expect(parent.env.dispatch).toHaveBeenCalledWith("SET_VIEWPORT_OFFSET", {
      offsetX: width / 2,
      offsetY: 0,
    });
  });

  test("can edge-scroll vertically", async () => {
    const { height } = model.getters.getViewportDimension();
    model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "ROW",
      sheetId: model.getters.getActiveSheetId(),
      elements: [0, 1],
      size: height / 2,
    });
    await mountHighlight("A2", "#666");
    borderEl = fixture.querySelector(".o-border-n")!;

    // select A2 top border
    selectTopCellBorder(borderEl, "A2");
    expect(parent.env.dispatch).toHaveBeenCalledWith("START_CHANGE_HIGHLIGHT", {
      zone: toZone("A2"),
    });

    // move to A3
    moveToCell(borderEl, "A3");
    expect(parent.env.dispatch).toHaveBeenCalledWith("SET_VIEWPORT_OFFSET", {
      offsetX: 0,
      offsetY: height / 2,
    });
  });
});
