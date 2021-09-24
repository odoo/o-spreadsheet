import { HEADER_HEIGHT, HEADER_WIDTH } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { DispatchResult } from "../../src/types/commands";
import { triggerMouseEvent } from "../test_helpers/dom_helper";
import { makeTestFixture, nextTick, mountSpreadsheet } from "../test_helpers/helpers";
import { Spreadsheet } from "../../src";

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
let parent: Spreadsheet;
let cornerEl: Element;
let borderEl: Element;

beforeEach(async () => {
  fixture = makeTestFixture();
  parent = await mountSpreadsheet(fixture);
  model = parent.model;

  model.dispatch("RESIZE_VIEWPORT", {
    width: 1000,
    height: 1000,
  });

  // to do: remove this line when highlight component isn't longer exclusive to the edition plugin
  model.dispatch("START_EDITION");
  parent.env.dispatch = jest.fn((command) => DispatchResult.Success);
});

afterEach(() => {
  parent.destroy();
  fixture.remove();
});

describe("Corner component", () => {
  describe("can drag all corners", () => {
    test("start on nw corner", async () => {
      model.dispatch("ADD_HIGHLIGHTS", { ranges: [["B2", "#666"]] });
      await nextTick();
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
      model.dispatch("ADD_HIGHLIGHTS", { ranges: [["B2", "#666"]] });
      await nextTick();
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
      model.dispatch("ADD_HIGHLIGHTS", { ranges: [["B2", "#666"]] });
      await nextTick();
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
      model.dispatch("ADD_HIGHLIGHTS", { ranges: [["B2", "#666"]] });
      await nextTick();
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
    model.dispatch("ADD_HIGHLIGHTS", { ranges: [["A1", "#666"]] });
    await nextTick();
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
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_MERGE", { sheetId, target: [toZone("B1:C1")] });
    model.dispatch("ADD_HIGHLIGHTS", { ranges: [["B2", "#666"]] });
    await nextTick();
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

    model.dispatch("ADD_HIGHLIGHTS", { ranges: [["B1", "#666"]] });
    await nextTick();
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

    model.dispatch("ADD_HIGHLIGHTS", { ranges: [["A2", "#666"]] });
    await nextTick();
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
      model.dispatch("ADD_HIGHLIGHTS", { ranges: [["B2", "#666"]] });
      await nextTick();
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
      model.dispatch("ADD_HIGHLIGHTS", { ranges: [["B2", "#666"]] });
      await nextTick();
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
      model.dispatch("ADD_HIGHLIGHTS", { ranges: [["B2", "#666"]] });
      await nextTick();
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
      model.dispatch("ADD_HIGHLIGHTS", { ranges: [["B2", "#666"]] });
      await nextTick();
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
    model.dispatch("ADD_HIGHLIGHTS", { ranges: [["A1:B2", "#666"]] });
    await nextTick();
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
    model.dispatch("ADD_HIGHLIGHTS", { ranges: [["A1:B2", "#666"]] });
    await nextTick();
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
    model.dispatch("ADD_HIGHLIGHTS", { ranges: [["A1:B2", "#666"]] });
    await nextTick();
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
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_MERGE", { sheetId, target: [toZone("B1:C1")] });
    model.dispatch("ADD_HIGHLIGHTS", { ranges: [["A1", "#666"]] });
    await nextTick();
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
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_MERGE", { sheetId, target: [toZone("B1:C1")] });
    model.dispatch("ADD_HIGHLIGHTS", { ranges: [["A1", "#666"]] });
    await nextTick();
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

    model.dispatch("ADD_HIGHLIGHTS", { ranges: [["B1", "#666"]] });
    await nextTick();
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

    model.dispatch("ADD_HIGHLIGHTS", { ranges: [["A2", "#666"]] });
    await nextTick();
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
