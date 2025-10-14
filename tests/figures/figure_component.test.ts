import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  FIGURE_BORDER_WIDTH,
  MENU_WIDTH,
  ZOOM_VALUES,
} from "@odoo/o-spreadsheet-engine/constants";
import { Component, xml } from "@odoo/owl";
import { Model, Spreadsheet } from "../../src";
import { Figure, Pixel, Position, UID } from "../../src/types";

import { ClipboardMIMEType } from "@odoo/o-spreadsheet-engine/types/clipboard";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { FigureComponent } from "../../src/components/figures/figure/figure";
import { ChartFigure } from "../../src/components/figures/figure_chart/figure_chart";
import { downloadFile } from "../../src/components/helpers/dom_helpers";
import { figureRegistry } from "../../src/registries/figures_registry";
import {
  activateSheet,
  addColumns,
  createChart,
  createGaugeChart,
  createImage,
  createScorecardChart,
  createSheet,
  freezeColumns,
  freezeRows,
  paste,
  selectCell,
  setCellContent,
  setViewportOffset,
} from "../test_helpers/commands_helpers";
import { TEST_CHART_DATA } from "../test_helpers/constants";
import {
  clickAndDrag,
  getElStyle,
  keyDown,
  keyUp,
  simulateClick,
  triggerMouseEvent,
  triggerWheelEvent,
} from "../test_helpers/dom_helper";
import { getCellContent, getCellText } from "../test_helpers/getters_helpers";
import {
  addToRegistry,
  getFigureDefinition,
  getFigureIds,
  mockChart,
  mountSpreadsheet,
  nextTick,
} from "../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../test_helpers/mock_helpers";

const constantsMocks = jest.requireMock("@odoo/o-spreadsheet-engine/constants");
jest.mock("@odoo/o-spreadsheet-engine/constants", () => ({
  ...jest.requireActual("@odoo/o-spreadsheet-engine/constants"),
}));

jest.mock("../../src/components/helpers/dom_helpers", () => {
  return {
    ...jest.requireActual("../../src/components/helpers/dom_helpers"),
    downloadFile: jest.fn(),
  };
});

beforeEach(() => {
  constantsMocks.DRAG_THRESHOLD = 0; // mock drag threshold to 0 for easier testing of snap
});

const cellHeight = DEFAULT_CELL_HEIGHT;
const cellWidth = DEFAULT_CELL_WIDTH;

let fixture: HTMLElement;
let model: Model;
let parent: Spreadsheet;
let sheetId: UID;
let env: SpreadsheetChildEnv;
let notifyUser: jest.Mock;

function createFigure(
  model: Model,
  figureParameters: Partial<Figure & { anchor: Position }> = {},
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const params: Figure = {
    id: "someuuid",
    col: 0,
    row: 0,
    offset: { x: 1, y: 1 },
    height: 100,
    width: 100,
    tag: "text",
    ...figureParameters,
    ...figureParameters.anchor,
  };

  return model.dispatch("CREATE_FIGURE", {
    sheetId,
    col: params.col,
    row: params.row,
    size: { height: params.height, width: params.width },
    offset: params.offset,
    figureId: params.id,
    tag: params.tag,
  });
}

const anchorSelectors = {
  top: ".o-fig-anchor.o-top",
  topRight: ".o-fig-anchor.o-topRight",
  right: ".o-fig-anchor.o-right",
  bottomRight: ".o-fig-anchor.o-bottomRight",
  bottom: ".o-fig-anchor.o-bottom",
  bottomLeft: ".o-fig-anchor.o-bottomLeft",
  left: ".o-fig-anchor.o-left",
  topLeft: ".o-fig-anchor.o-topLeft",
};
async function dragAnchor(anchor: string, dragX: number, dragY: number, mouseUp = false) {
  await clickAndDrag(anchorSelectors[anchor], { x: dragX, y: dragY }, { x: 0, y: 0 }, mouseUp);
}

//Test Component required as we don't especially want/need to load an entire chart
const TEMPLATE = xml/* xml */ `
  <div class="o-fig-text">
    <t t-esc='"coucou"'/>
  </div>
`;

class TextFigure extends Component<FigureComponent["props"], SpreadsheetChildEnv> {
  static template = TEMPLATE;
  static props = ChartFigure.props;
}

mockChart();

let mockSpreadsheetRect: Partial<DOMRect>;
let mockFigureMenuItemRect: Partial<DOMRect>;

beforeEach(() => {
  addToRegistry(figureRegistry, "text", {
    Component: TextFigure,
    menuBuilder: () => [],
  });
});

beforeEach(() => {
  extendMockGetBoundingClientRect({
    "o-popover": () => ({ height: 0, width: 0 }),
    "o-popover-content": () => ({ height: 0, width: 0 }),
    "o-spreadsheet": () => ({ ...mockSpreadsheetRect }),
    "o-figure-menu-item": () => ({ ...mockFigureMenuItemRect }),
  });
});

describe("figures", () => {
  beforeEach(async () => {
    notifyUser = jest.fn();
    mockSpreadsheetRect = { top: 100, left: 200, height: 1000, width: 1000 };
    mockFigureMenuItemRect = { top: 500, left: 500 };
    ({ model, parent, fixture, env } = await mountSpreadsheet(undefined, { notifyUser }));
    sheetId = model.getters.getActiveSheetId();
  });

  test("can create a figure with some data", () => {
    createFigure(model);
    expect(model.getters.getFigures(sheetId)).toEqual([
      {
        id: "someuuid",
        height: 100,
        tag: "text",
        width: 100,
        col: 0,
        row: 0,
        offset: { x: 1, y: 1 },
      },
    ]);
  });

  test.skip("deleting a figure focuses the grid hidden input", async () => {
    createFigure(model);
    await nextTick();
    const figure = fixture.querySelector(".o-figure")!;
    await simulateClick(".o-figure");
    expect(document.activeElement).toBe(figure);
    await keyDown({ key: "Delete" });
    expect(fixture.querySelector(".o-figure")).toBeNull();
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer"));
  });

  test("deleting a figure doesn't delete selection", async () => {
    createFigure(model);
    setCellContent(model, "A1", "content");
    selectCell(model, "A1");
    await nextTick();
    await simulateClick(".o-figure");
    await keyDown({ key: "Delete" });
    expect(fixture.querySelector(".o-figure")).toBeNull();
    expect(getCellContent(model, "A1")).toBe("content");
  });

  test("Can delete a figure with `Backspace`", async () => {
    createFigure(model);
    await nextTick();
    await simulateClick(".o-figure");
    await keyDown({ key: "Backspace" });
    expect(fixture.querySelector(".o-figure")).toBeNull();
  });

  test("Add a figure on sheet2, scroll down on sheet 1, switch to sheet 2, the figure should be displayed", async () => {
    createSheet(model, { sheetId: "42", position: 1 });
    createFigure(model, {}, "42");
    triggerWheelEvent(".o-grid", { deltaX: 1500 });
    fixture.querySelector(".o-scrollbar.vertical")!.dispatchEvent(new Event("scroll"));
    await nextTick();
    activateSheet(model, "42");
    await nextTick();
    expect(fixture.querySelectorAll(".o-figure")).toHaveLength(1);
  });

  test("Can move a figure with keyboard", async () => {
    createFigure(model);
    let figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 1, y: 1 },
    });
    await nextTick();
    await simulateClick(".o-figure");
    await nextTick();
    const selectedFigure = model.getters.getSelectedFigureId();
    expect(selectedFigure).toBe("someuuid");
    //down
    await keyDown({ key: "ArrowDown" });
    await keyDown({ key: "ArrowDown" });
    figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 1, y: 3 },
    });
    //right
    await keyDown({ key: "ArrowRight" });
    await keyDown({ key: "ArrowRight" });
    figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 3, y: 3 },
    });
    //left
    await keyDown({ key: "ArrowLeft" });
    figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 2, y: 3 },
    });
    //up
    await keyDown({ key: "ArrowUp" });
    figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 2, y: 2 },
    });
  });

  test("figure is focused after a SELECT_FIGURE", async () => {
    createFigure(model);
    await nextTick();
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    await nextTick();
    expect(document.activeElement?.classList).toContain("o-figure");
  });

  test("select a figure, it should have the  resize handles", async () => {
    createFigure(model);
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    await nextTick();
    const anchors = fixture.querySelectorAll(".o-fig-anchor");
    expect(anchors).toHaveLength(8);
  });

  test("selected figure snapshot", async () => {
    createFigure(model);
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    await nextTick();
    expect(fixture.querySelector(".o-figure-wrapper")).toMatchSnapshot();
  });

  test("Can undo/redo with a figure focused", async () => {
    createFigure(model);
    await nextTick();
    setCellContent(model, "A1", "hello");
    await simulateClick(".o-figure");
    keyDown({ key: "z", ctrlKey: true });
    expect(getCellText(model, "A1")).toBe("");
  });

  test.each([
    ["top", { mouseOffsetX: 0, mouseOffsetY: -50 }, { width: 100, height: 150 }],
    ["topRight", { mouseOffsetX: 50, mouseOffsetY: -50 }, { width: 150, height: 150 }],
    ["topRight", { mouseOffsetX: 50, mouseOffsetY: 0 }, { width: 150, height: 150 }],
    ["topRight", { mouseOffsetX: 0, mouseOffsetY: -50 }, { width: 150, height: 150 }],
    ["right", { mouseOffsetX: 50, mouseOffsetY: 0 }, { width: 150, height: 100 }],
    ["bottomRight", { mouseOffsetX: 50, mouseOffsetY: 50 }, { width: 150, height: 150 }],
    ["bottomRight", { mouseOffsetX: 0, mouseOffsetY: 50 }, { width: 150, height: 150 }],
    ["bottomRight", { mouseOffsetX: 50, mouseOffsetY: 0 }, { width: 150, height: 150 }],
    ["bottom", { mouseOffsetX: 0, mouseOffsetY: 50 }, { width: 100, height: 150 }],
    ["bottomLeft", { mouseOffsetX: -50, mouseOffsetY: 50 }, { width: 150, height: 150 }],
    ["bottomLeft", { mouseOffsetX: 0, mouseOffsetY: 50 }, { width: 150, height: 150 }],
    ["bottomLeft", { mouseOffsetX: -50, mouseOffsetY: 0 }, { width: 150, height: 150 }],
    ["left", { mouseOffsetX: -50, mouseOffsetY: 0 }, { width: 150, height: 100 }],
    ["topLeft", { mouseOffsetX: -50, mouseOffsetY: -50 }, { width: 150, height: 150 }],
    ["topLeft", { mouseOffsetX: 0, mouseOffsetY: -50 }, { width: 150, height: 150 }],
    ["topLeft", { mouseOffsetX: -50, mouseOffsetY: 0 }, { width: 150, height: 150 }],
  ])(
    "Can resize a figure through its anchors with keepSize",
    async (anchor: string, mouseMove, expectedSize) => {
      const figureId = "someuuid";
      createImage(model, {
        figureId,
        col: 5,
        row: 5,
        offset: { x: 10, y: 10 },
        size: {
          width: 100,
          height: 100,
        },
      });
      model.dispatch("SELECT_FIGURE", { figureId });
      await nextTick();
      await dragAnchor(anchor, mouseMove.mouseOffsetX, mouseMove.mouseOffsetY, true);
      expect(model.getters.getFigure(sheetId, figureId)).toMatchObject(expectedSize);
    }
  );

  test.each([
    ["top", { mouseOffsetX: 0, mouseOffsetY: -5 }, { offset: { x: 10, y: 5 } }],
    ["topRight", { mouseOffsetX: 5, mouseOffsetY: -5 }, { offset: { x: 10, y: 5 } }],
    ["topRight", { mouseOffsetX: 5, mouseOffsetY: 0 }, { offset: { x: 10, y: 5 } }],
    ["topRight", { mouseOffsetX: 0, mouseOffsetY: -5 }, { offset: { x: 10, y: 5 } }],
    ["right", { mouseOffsetX: 5, mouseOffsetY: 0 }, { offset: { x: 10, y: 10 } }],
    ["bottomRight", { mouseOffsetX: 5, mouseOffsetY: 5 }, { offset: { x: 10, y: 10 } }],
    ["bottomRight", { mouseOffsetX: 0, mouseOffsetY: 5 }, { offset: { x: 10, y: 10 } }],
    ["bottomRight", { mouseOffsetX: 5, mouseOffsetY: 0 }, { offset: { x: 10, y: 10 } }],
    ["bottom", { mouseOffsetX: 0, mouseOffsetY: 5 }, { offset: { x: 10, y: 10 } }],
    ["bottomLeft", { mouseOffsetX: -5, mouseOffsetY: 5 }, { offset: { x: 5, y: 10 } }],
    ["bottomLeft", { mouseOffsetX: 0, mouseOffsetY: 5 }, { offset: { x: 5, y: 10 } }],
    ["bottomLeft", { mouseOffsetX: -5, mouseOffsetY: 0 }, { offset: { x: 5, y: 10 } }],
    ["left", { mouseOffsetX: -5, mouseOffsetY: 0 }, { offset: { x: 5, y: 10 } }],
    ["topLeft", { mouseOffsetX: -5, mouseOffsetY: -5 }, { offset: { x: 5, y: 5 } }],
    ["topLeft", { mouseOffsetX: 0, mouseOffsetY: -5 }, { offset: { x: 5, y: 5 } }],
    ["topLeft", { mouseOffsetX: -5, mouseOffsetY: 0 }, { offset: { x: 5, y: 5 } }],
  ])(
    "Resize a figure through its anchors with keepSize correctly adapt anchor",
    async (anchor: string, mouseMove, expectedSize) => {
      const figureId = "someuuid";
      createImage(model, {
        figureId,
        col: 5,
        row: 5,
        offset: { x: 10, y: 10 },
        size: {
          width: 20,
          height: 20,
        },
      });
      model.dispatch("SELECT_FIGURE", { figureId });
      await nextTick();
      await dragAnchor(anchor, mouseMove.mouseOffsetX, mouseMove.mouseOffsetY, true);
      expect(model.getters.getFigure(sheetId, figureId)).toMatchObject(expectedSize);
    }
  );

  test.each([
    ["top", { mouseOffsetX: 0, mouseOffsetY: -100 }],
    ["left", { mouseOffsetX: -100, mouseOffsetY: 0 }],
    ["topLeft", { mouseOffsetX: -100, mouseOffsetY: -100 }],
  ])(
    "Resizing a figure through its top and left anchor does not change size beyond header boundaries",
    async (anchor: string, mouseMove: { mouseOffsetX: number; mouseOffsetY: number }) => {
      const figureId = "someuuid";
      const figure = { width: 100, height: 100 };
      createFigure(model, {
        id: figureId,
        col: 0,
        row: 0,
        offset: { x: 0, y: 0 },
        ...figure,
      });
      model.dispatch("SELECT_FIGURE", { figureId });
      await nextTick();
      await dragAnchor(anchor, mouseMove.mouseOffsetX, mouseMove.mouseOffsetY, true);
      expect(model.getters.getFigure(sheetId, figureId)).toMatchObject(figure);
    }
  );

  test.each([
    ["right", { mouseOffsetX: 300, mouseOffsetY: 0 }],
    ["bottom", { mouseOffsetX: 0, mouseOffsetY: 300 }],
    ["bottomRight", { mouseOffsetX: 300, mouseOffsetY: 300 }],
  ])(
    "Resizing a figure does not crop it to its visible part in the viewport",
    async (anchor: string, mouseMove: { mouseOffsetX: number; mouseOffsetY: number }) => {
      const figureId = "someuuid";
      const figure = { width: 200, height: 200 };
      createFigure(model, {
        id: figureId,
        col: 0,
        row: 0,
        offset: { x: 0, y: 0 },
        ...figure,
      });
      await nextTick();
      setViewportOffset(model, 100, 100);
      await simulateClick(".o-figure");
      await dragAnchor(anchor, mouseMove.mouseOffsetX, mouseMove.mouseOffsetY, true);
      const updatedFigure = {
        ...figure,
        width: figure.width + mouseMove.mouseOffsetX,
        height: figure.height + mouseMove.mouseOffsetY,
      };
      expect(model.getters.getFigure(sheetId, figureId)).toMatchObject(updatedFigure);
    }
  );

  describe("Move a figure with drag & drop ", () => {
    describe("Figure drag & drop with frozen pane", () => {
      const cellWidth = DEFAULT_CELL_WIDTH;
      const cellHeight = DEFAULT_CELL_HEIGHT;
      const id = "someId";
      const figureSelector = ".o-figure";
      beforeEach(async () => {
        freezeRows(model, 5);
        freezeColumns(model, 5);
        model.dispatch("SET_VIEWPORT_OFFSET", {
          offsetX: 10 * cellWidth,
          offsetY: 10 * cellHeight,
        });
      });

      test("Figure in frozen rows can be dragged to main viewport", async () => {
        createFigure(model, { id, anchor: { col: 16, row: 4 } });
        await nextTick();
        await clickAndDrag(figureSelector, { x: 0, y: 3 * cellHeight }, undefined, true);
        expect(model.getters.getFigure(sheetId, id)).toMatchObject({
          col: 16,
          row: 17, // initial position + drag offset + scroll offset
        });
      });

      test("Figure in main viewport can be dragged to frozen rows", async () => {
        createFigure(model, { id, anchor: { col: 16, row: 16 } });
        await nextTick();
        await clickAndDrag(figureSelector, { x: 0, y: -3 * cellHeight }, undefined, true);
        expect(model.getters.getFigure(sheetId, id)).toMatchObject({
          col: 16,
          row: 3, // initial position + drag offset - scroll offset
        });
      });

      test("Dragging figure that is half hidden by frozen rows will put in on top of the freeze pane", async () => {
        createFigure(model, {
          id,
          col: 16,
          row: 14,
          height: 5 * cellHeight,
        });
        await nextTick();
        await clickAndDrag(figureSelector, { x: 1, y: 0 }, undefined, true);
        expect(model.getters.getFigure(sheetId, id)).toMatchObject({
          col: 16,
          row: 4, // initial position - scroll offset
        });
      });

      test("Figure in frozen cols can be dragged to main viewport", async () => {
        createFigure(model, { id, anchor: { col: 4, row: 16 } });
        await nextTick();
        await clickAndDrag(figureSelector, { x: 3 * cellWidth, y: 0 }, undefined, true);
        expect(model.getters.getFigure(sheetId, id)).toMatchObject({
          col: 17, // initial position + drag offset + scroll offset
          row: 16,
        });
      });

      test("Figure in main viewport can be dragged to frozen cols", async () => {
        createFigure(model, { id, anchor: { col: 16, row: 16 } });
        await nextTick();
        await clickAndDrag(figureSelector, { x: -3 * cellWidth, y: 0 }, undefined, true);
        expect(model.getters.getFigure(sheetId, id)).toMatchObject({
          col: 3, // initial position + drag offset - scroll offset
          row: 16,
        });
      });

      test("Dragging figure that is half hidden by frozen cols will put in on top of the freeze pane", async () => {
        createFigure(model, {
          id,
          col: 14,
          row: 16,
          width: 5 * cellWidth,
        });
        await nextTick();
        await clickAndDrag(figureSelector, { x: 0, y: 1 }, undefined, true);
        expect(model.getters.getFigure(sheetId, id)).toMatchObject({
          col: 4, // initial position - scroll offset
          row: 16,
        });
      });
    });

    test.each([
      [{ wheelCol: 0, wheelRow: 10 }],
      [{ wheelCol: 10, wheelRow: 0 }],
      [{ wheelCol: 0, wheelRow: 50 }], // scroll out of original viewport
      [{ wheelCol: 40, wheelRow: 0 }], // scroll out of original viewport
    ])(
      "Can scroll while dragging a figure",
      async ({ wheelCol, wheelRow }: { wheelCol: number; wheelRow: number }) => {
        addColumns(model, "after", "A", 50);
        createFigure(model, {
          id: "someuuid",
          col: 5,
          row: 6,
          offset: { x: 0, y: 0 },
        });
        await nextTick();
        const figureEl = fixture.querySelector(".o-figure")!;

        triggerMouseEvent(figureEl, "pointerdown");
        triggerWheelEvent(figureEl, {
          deltaY: wheelRow * DEFAULT_CELL_HEIGHT + 7,
          deltaX: wheelCol * DEFAULT_CELL_WIDTH + 8,
        });
        triggerMouseEvent(figureEl, "pointerup");
        await nextTick();
        expect(model.getters.getFigure(model.getters.getActiveSheetId(), "someuuid")).toMatchObject(
          {
            col: 5 + wheelCol,
            row: 6 + wheelRow,
          }
        );
        expect(
          model.getters.getFigure(model.getters.getActiveSheetId(), "someuuid")!.offset
        ).toMatchObject({
          x: 8,
          y: 7,
        });
      }
    );

    test.each([
      [{ wheelCol: 0, wheelRow: 10 }],
      [{ wheelCol: 10, wheelRow: 0 }],
      [{ wheelCol: 0, wheelRow: 50 }], // scroll out of original viewport
      [{ wheelCol: 40, wheelRow: 0 }], // scroll out of original viewport
    ])(
      "Snap when scrolling while dragging a figure",
      async ({ wheelCol, wheelRow }: { wheelCol: number; wheelRow: number }) => {
        addColumns(model, "after", "A", 50);
        createFigure(model, {
          id: "someuuid",
          col: 5,
          row: 6,
          offset: { x: 0, y: 0 },
        });

        createFigure(model, {
          id: "someuuid2",
          col: 5 + wheelCol,
          row: 6 + wheelRow,
          offset: { x: 5, y: 5 },
        });
        await nextTick();
        const figureEl = fixture.querySelector(".o-figure")!;

        triggerMouseEvent(figureEl, "pointerdown");
        triggerWheelEvent(figureEl, {
          deltaY: wheelRow * DEFAULT_CELL_HEIGHT + 8,
          deltaX: wheelCol * DEFAULT_CELL_WIDTH + 8,
        });
        triggerMouseEvent(figureEl, "pointerup");
        await nextTick();
        expect(model.getters.getFigure(model.getters.getActiveSheetId(), "someuuid")).toMatchObject(
          {
            col: 5 + wheelCol,
            row: 6 + wheelRow,
          }
        );
        expect(
          model.getters.getFigure(model.getters.getActiveSheetId(), "someuuid")!.offset
        ).toMatchObject({
          x: 5,
          y: 5,
        });
      }
    );

    test("Deleting a figure during drag and drop does not crash", async () => {
      createFigure(model, {
        id: "someuuid",
        col: 5,
        row: 6,
        offset: { x: 7, y: 8 },
      });
      await nextTick();
      await clickAndDrag(".o-figure", { x: 150, y: 100 }, undefined, false);
      model.dispatch("DELETE_FIGURE", { figureId: "someuuid", sheetId });
      await nextTick();
      expect(model.getters.getFigure(sheetId, "someuuid")).toEqual(undefined);
    });
  });

  test("Cannot select/move figure in readonly mode", async () => {
    const figureId = "someuuid";
    createFigure(model, { id: figureId, offset: { x: 0, y: 200 } });
    model.updateMode("readonly");
    await nextTick();
    const figure = fixture.querySelector<HTMLElement>(".o-figure")!;
    await simulateClick(".o-figure");
    expect(document.activeElement).not.toBe(figure);
    expect(fixture.querySelector(".o-fig-anchor")).toBeNull();

    triggerMouseEvent(figure, "pointerdown", 300, 200);
    await nextTick();
    expect(figure).not.toHaveStyle({ cursor: "grabbing" });
  });

  describe("Figure border", () => {
    test("Border for figure", async () => {
      createFigure(model);
      await nextTick();
      expect(getElStyle(".o-figure-border", "border-top-width")).toEqual(`1px`);
      expect(".o-figure-border").not.toHaveClass("o-selected");
    });

    test("Border for selected figure", async () => {
      createFigure(model, { id: "figureId" });
      model.dispatch("SELECT_FIGURE", { figureId: "figureId" });
      await nextTick();
      expect(getElStyle(".o-figure-border", "border-top-width")).toEqual(`2px`);
      expect(".o-figure-border").toHaveClass("o-selected");
    });

    test("Border for image figure", async () => {
      createImage(model, { figureId: "figureId" });
      await nextTick();
      expect(getElStyle(".o-figure-border", "border-top-width")).toEqual(`0px`);
    });

    test("Border for selected image figure", async () => {
      createImage(model, { figureId: "figureId" });
      model.dispatch("SELECT_FIGURE", { figureId: "figureId" });
      await nextTick();
      expect(getElStyle(".o-figure-border", "border-top-width")).toEqual(`2px`);
      expect(".o-figure-border").toHaveClass("o-selected");
    });

    test("No border in dashboard mode", async () => {
      createFigure(model, { id: "figureId" });
      await nextTick();
      expect(getElStyle(".o-figure-border", "border-top-width")).toEqual("1px");
      model.updateMode("dashboard");
      await nextTick();
      expect(".o-figure-border").toHaveCount(0);
    });
  });

  test("Selected figure isn't removed by scroll", async () => {
    createFigure(model);
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    await nextTick();
    triggerWheelEvent(".o-grid", { deltaY: 1500 });
    fixture.querySelector(".o-scrollbar.vertical")!.dispatchEvent(new Event("scroll"));
    expect(model.getters.getSelectedFigureId()).toEqual("someuuid");
  });

  describe.each(["image", "basicChart", "scorecard", "gauge"])(
    "common tests for chart & image",
    (type: string) => {
      let sheetId: UID;
      let figureId: UID;
      beforeEach(async () => {
        sheetId = model.getters.getActiveSheetId();
        figureId = "figureId";
        switch (type) {
          case "image":
            createImage(model, { sheetId, figureId });
            break;
          case "basicChart":
            createChart(model, TEST_CHART_DATA.basicChart, undefined, undefined, { figureId });
            break;
          case "scorecard":
            createScorecardChart(model, TEST_CHART_DATA.scorecard, undefined, undefined, {
              figureId,
            });
            break;
          case "gauge":
            createGaugeChart(model, TEST_CHART_DATA.gauge, undefined, undefined, { figureId });
            break;
        }
        await nextTick();
      });
      test(`Click on Delete button will delete the figure ${type}`, async () => {
        expect(fixture.querySelector(".o-figure")).not.toBeNull();
        await simulateClick(".o-figure");
        expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));
        expect(fixture.querySelector(".o-figure-menu-item")).not.toBeNull();
        await simulateClick(".o-figure-menu-item");
        expect(fixture.querySelector(".o-menu")).not.toBeNull();
        await simulateClick(".o-menu div[data-name='delete']");
        expect(() => model.getters.getImage(figureId)).toThrow();
      });

      test(`Can copy/paste a figure ${type} with its context menu`, async () => {
        const figureDef = getFigureDefinition(model, figureId, type);
        await simulateClick(".o-figure");
        await simulateClick(".o-figure-menu-item");
        await simulateClick(".o-menu div[data-name='copy']");
        const envClipBoardContent = await env.clipboard.read();
        if (envClipBoardContent.status === "ok") {
          const envClipboardTextContent = envClipBoardContent.content[ClipboardMIMEType.PlainText];
          const osClipboardContent = await model.getters.getClipboardTextAndImageContent();
          expect(envClipboardTextContent).toEqual(osClipboardContent[ClipboardMIMEType.PlainText]);
        }
        paste(model, "A4");
        expect(getFigureIds(model, sheetId)).toHaveLength(2);
        const figureIds = getFigureIds(model, sheetId);
        expect(getFigureDefinition(model, figureIds[0], type)).toEqual(figureDef);
        expect(getFigureDefinition(model, figureIds[1], type)).toEqual(figureDef);
        if (type === "image") {
          expect(notifyUser).toHaveBeenCalledWith({
            text: "Image copied to clipboard",
            type: "success",
            sticky: false,
          });
        } else {
          expect(notifyUser).not.toHaveBeenCalled();
        }
      });

      test(`Can cut/paste a figure ${type} with its context menu`, async () => {
        const figureDef = getFigureDefinition(model, figureId, type);
        await simulateClick(".o-figure");
        await simulateClick(".o-figure-menu-item");
        await simulateClick(".o-menu div[data-name='cut']");
        const envClipBoardContent = await env.clipboard.read();
        if (envClipBoardContent.status === "ok") {
          const envClipboardTextContent = envClipBoardContent.content[ClipboardMIMEType.PlainText];
          const osClipboardContent = await model.getters.getClipboardTextAndImageContent();
          expect(envClipboardTextContent).toEqual(osClipboardContent[ClipboardMIMEType.PlainText]);
        }
        paste(model, "A1");
        expect(getFigureIds(model, sheetId)).toHaveLength(1);
        const figureIds = getFigureIds(model, sheetId);
        expect(getFigureDefinition(model, figureIds[0], type)).toEqual(figureDef);
      });

      test(`Copied figure ${type} are selected`, async () => {
        await simulateClick(".o-figure");
        await simulateClick(".o-figure-menu-item");
        await simulateClick(".o-menu div[data-name='copy']");
        expect(model.getters.getSelectedFigureId()).toEqual(figureId);
        paste(model, "A1");
        expect(getFigureIds(model, sheetId)).toHaveLength(2);
        const chartIds = getFigureIds(model, sheetId);
        expect(model.getters.getSelectedFigureId()).not.toEqual(figureId);
        expect(model.getters.getSelectedFigureId()).toEqual(chartIds[1]);
      });

      test(`figure ${type} have a menu button`, async () => {
        expect(fixture.querySelector(".o-figure")).not.toBeNull();
        expect(fixture.querySelector(".o-figure-menu-item")).not.toBeNull();
      });

      test("images don't have a menu button in dashboard mode", async () => {
        model.updateMode("dashboard");
        await nextTick();
        expect(fixture.querySelector(".o-figure")).not.toBeNull();
        expect(fixture.querySelector(".o-figure-menu-item")).toBeNull();
      });

      test("images don't have a menu button in readonly mode", async () => {
        model.updateMode("readonly");
        await nextTick();
        expect(fixture.querySelector(".o-figure")).not.toBeNull();
        expect(fixture.querySelector(".o-figure-menu-item")).toBeNull();
      });

      test("Can open context menu on right click", async () => {
        triggerMouseEvent(".o-figure", "contextmenu");
        await nextTick();
        expect(document.querySelectorAll(".o-menu").length).toBe(1);
      });

      test(`figure menu position is correct when clicking on menu button for ${type}`, async () => {
        mockSpreadsheetRect = { top: 25, left: 25, height: 1000, width: 1000 };
        mockFigureMenuItemRect = { top: 500, left: 500 };
        parent.render(true); // force a render to update `useAbsoluteBoundingRect` with new mocked values
        await nextTick();
        await simulateClick(".o-figure-menu-item");
        const menuPopover = fixture.querySelector<HTMLElement>(".o-popover")!;
        expect(menuPopover.style.top).toBe(`${500 - 25}px`); // 25 : spreadsheet offset of the extendMockGetBoundingClientRect
        expect(menuPopover.style.left).toBe(`${500 - 25}px`);
      });

      test(`figure menu position is correct when menu button position < MENU_WIDTH for ${type}`, async () => {
        mockSpreadsheetRect = { top: 25, left: 25, height: 1000, width: 1000 };
        mockFigureMenuItemRect = { top: 500, left: MENU_WIDTH - 50, width: 32 };
        parent.render(true); // force a render to update `useAbsoluteBoundingRect` with new mocked values
        await nextTick();
        await simulateClick(".o-figure-menu-item");
        const MenuPopover = fixture.querySelector<HTMLElement>(".o-popover")!;
        expect(MenuPopover.style.top).toBe(`${500 - 25}px`); // 25 : spreadsheet offset of the mockGetBoundingClientRect
        expect(MenuPopover.style.left).toBe(`${MENU_WIDTH - 50 - 25 + 32}px`);
      });

      test("Cannot open context menu on right click in dashboard mode", async () => {
        model.updateMode("dashboard");
        triggerMouseEvent(".o-figure", "contextmenu");
        await nextTick();
        expect(document.querySelector(".o-menu")).toBeFalsy();
      });

      test("Cannot open context menu on right click in readonly mode", async () => {
        model.updateMode("readonly");
        triggerMouseEvent(".o-figure", "contextmenu");
        expect(document.querySelector(".o-menu")).toBeFalsy();
      });

      test("Click on MenuPopover button open context menu", async () => {
        expect(fixture.querySelector(".o-figure")).not.toBeNull();
        await simulateClick(".o-figure");
        expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));
        expect(fixture.querySelector(".o-figure-menu-item")).not.toBeNull();
        await simulateClick(".o-figure-menu-item");
        expect(fixture.querySelector(".o-menu")).not.toBeNull();
      });

      test("Context menu is positioned according to the spreadsheet position", async () => {
        await simulateClick(".o-figure");
        await simulateClick(".o-figure-menu-item");
        const menuPopover = fixture.querySelector<HTMLElement>(".o-popover");
        expect(menuPopover?.style.top).toBe(`${500 - 100}px`);
        expect(menuPopover?.style.left).toBe(`${500 - 200}px`);
      });

      test("Selecting a figure and hitting Ctrl does not unselect it", async () => {
        await simulateClick(".o-figure");
        expect(model.getters.getSelectedFigureId()).toBe(figureId);
        keyDown({ key: "Control" });
        expect(model.getters.getSelectedFigureId()).toBe(figureId);
        keyUp({ key: "Control" });
        expect(model.getters.getSelectedFigureId()).toBe(figureId);
      });

      test("Can download the image", async () => {
        await simulateClick(".o-figure");
        await simulateClick(".o-figure-menu-item");
        await simulateClick(".o-menu div[data-name='download']");
        expect(downloadFile).toHaveBeenCalled();
      });
    }
  );

  test("Clicking a figure does not mark it a 'dragging'", async () => {
    createFigure(model);
    await nextTick();
    triggerMouseEvent(".o-figure", "pointerdown", 0, 0);
    await nextTick();
    expect(".o-figure").not.toHaveStyle({ cursor: "grabbing" });
  });

  test("There is a small threshold before the figure is marked as dragging", async () => {
    constantsMocks.DRAG_THRESHOLD = 5;
    createFigure(model);
    await nextTick();

    await clickAndDrag(".o-figure", { x: 3, y: 1 }, undefined, false);
    expect(".o-figure").not.toHaveStyle({ cursor: "grabbing" });
    expect(fixture.querySelector<HTMLElement>(".o-figure")?.style.cursor).not.toBe("grabbing");

    await clickAndDrag(".o-figure", { x: 6, y: 1 }, undefined, false);
    expect(".o-figure").toHaveStyle({ cursor: "grabbing" });
  });

  test("Figure container is properly computed based on the sheetView size", async () => {
    createFigure(model, { id: "topLeft" }); // topLeft
    createFigure(model, { id: "topRight", offset: { x: 4 * DEFAULT_CELL_WIDTH, y: 0 } }); // topRight
    createFigure(model, { id: "bottomLeft", offset: { x: 0, y: 4 * DEFAULT_CELL_HEIGHT } }); // bottomLeft
    createFigure(model, {
      id: "bottomRight",
      offset: {
        x: 4 * DEFAULT_CELL_WIDTH,
        y: 4 * DEFAULT_CELL_HEIGHT,
      },
    }); // bottomRight
    freezeRows(model, 2);
    freezeColumns(model, 2);
    const { width, height } = model.getters.getSheetViewDimension();
    await nextTick();

    const topLeftContainerStyle = (
      fixture.querySelector("[data-id='topLeftContainer']") as HTMLDivElement
    ).style;
    expect(topLeftContainerStyle.width).toEqual(`${width}px`);
    expect(topLeftContainerStyle.height).toEqual(`${height}px`);

    const topRightContainerStyle = (
      fixture.querySelector("[data-id='topRightContainer']") as HTMLDivElement
    ).style;
    expect(topRightContainerStyle.width).toEqual(`${width - 2 * DEFAULT_CELL_WIDTH}px`);
    expect(topRightContainerStyle.height).toEqual(`${height}px`);

    const bottomLeftContainerStyle = (
      fixture.querySelector("[data-id='bottomLeftContainer']") as HTMLDivElement
    ).style;
    expect(bottomLeftContainerStyle.width).toEqual(`${width}px`);
    expect(bottomLeftContainerStyle.height).toEqual(`${height - 2 * DEFAULT_CELL_HEIGHT}px`);

    const bottomRightContainerStyle = (
      fixture.querySelector("[data-id='bottomRightContainer']") as HTMLDivElement
    ).style;
    expect(bottomRightContainerStyle.width).toEqual(`${width - 2 * DEFAULT_CELL_WIDTH}px`);
    expect(bottomRightContainerStyle.height).toEqual(`${height - 2 * DEFAULT_CELL_HEIGHT}px`);
  });

  test("Deleting a figure does not change the DOM focus if the figure was not focused", async () => {
    createFigure(model);
    await nextTick();
    env.openSidePanel("FindAndReplace");
    await nextTick();

    const panelInput = fixture.querySelector<HTMLElement>(".o-sidePanel input");
    panelInput?.focus();
    expect(document.activeElement).toBe(panelInput);

    const figureId = model.getters.getFigures(sheetId)[0].id;
    model.dispatch("DELETE_FIGURE", { sheetId, figureId });
    await nextTick();

    expect(document.activeElement).toBe(panelInput);
  });

  describe("Figure drag & drop snap", () => {
    describe("Move figure", () => {
      test.each([
        [48, 50], // left border snaps with left border of other figure
        [77, 75 - FIGURE_BORDER_WIDTH], // left border snaps with center of other figure
        [102, 100 - FIGURE_BORDER_WIDTH], // left border snaps with right border of other figure
        [38, 40 + FIGURE_BORDER_WIDTH], // center snaps with left border of other figure
        [67, 65], // center snaps with center of other figure
        [92, 90], // center snaps with right border of other figure
        [31, 30 + FIGURE_BORDER_WIDTH], // right border snaps with left border of other figure
        [57, 55], // right border snaps with center of other figure
        [79, 80], // right border snaps with right border of other figure
      ])(
        "Snap x with horizontal mouseMove %s when moving figure",
        async (mouseMove: Pixel, expectedResult: Pixel) => {
          createFigure(model, {
            id: "f1",
            col: 5,
            row: 6,
            offset: { x: 0, y: 0 },
            width: 20,
            height: 20,
          });
          createFigure(model, {
            id: "f2",
            col: 5,
            row: 6,
            offset: { x: 50, y: 50 },
            width: 50,
            height: 50,
          });
          await nextTick();
          await clickAndDrag(".o-figure[data-id=f1]", { x: mouseMove, y: 0 }, undefined, true);
          expect(model.getters.getFigure(sheetId, "f1")).toMatchObject({
            col: 5 + Math.floor(expectedResult / DEFAULT_CELL_WIDTH),
            row: 6,
          });
          expect(model.getters.getFigure(sheetId, "f1")?.offset).toMatchObject({
            x: expectedResult % DEFAULT_CELL_WIDTH,
            y: 0,
          });
        }
      );

      test.each([
        [48, 50], // top border snaps with top border of other figure
        [77, 75 - FIGURE_BORDER_WIDTH], // top border snaps with center of other figure
        [102, 100 - FIGURE_BORDER_WIDTH], // top border snaps with bottom border of other figure
        [38, 40 + FIGURE_BORDER_WIDTH], // center snaps with top border of other figure
        [67, 65], // center snaps with center of other figure
        [92, 90], // center snaps with bottom border of other figure
        [31, 30 + FIGURE_BORDER_WIDTH], // bottom border snaps with top border of other figure
        [57, 55], // bottom border snaps with center of other figure
        [79, 80], // bottom border snaps with bottom border of other figure
      ])(
        "Snap y with vertical mouseMove %s when moving figure",
        async (mouseMove: Pixel, expectedResult: Pixel) => {
          createFigure(model, {
            id: "f1",
            col: 5,
            row: 6,
            offset: { x: 0, y: 0 },
            width: 20,
            height: 20,
          });
          createFigure(model, {
            id: "f2",
            col: 5,
            row: 6,
            offset: { x: 50, y: 50 },
            width: 50,
            height: 50,
          });
          await nextTick();
          await clickAndDrag(".o-figure[data-id=f1]", { x: 0, y: mouseMove }, undefined, true);
          expect(model.getters.getFigure(sheetId, "f1")).toMatchObject({
            col: 5,
            row: 6 + Math.floor(expectedResult / DEFAULT_CELL_HEIGHT),
          });
          expect(model.getters.getFigure(sheetId, "f1")?.offset).toMatchObject({
            x: 0,
            y: expectedResult % DEFAULT_CELL_HEIGHT,
          });
        }
      );
    });

    describe("Resize figure", () => {
      describe.each(["left", "topLeft", "bottomLeft"])(
        "Snap when resizing to the left with the %s anchor",
        (anchor: string) => {
          test.each([
            [-48, { x: 150 - FIGURE_BORDER_WIDTH, width: 150 + FIGURE_BORDER_WIDTH }], // left border snaps with right border of other figure
            [-151, { x: 50, width: 250 }], // left border snaps with left border of other figure
          ])("snap with mouseMove %s", async (mouseMove: Pixel, expectedResult) => {
            createFigure(model, {
              id: "f1",
              col: 0,
              row: 0,
              offset: { x: 200, y: 200 },
              width: 100,
              height: 100,
            });
            createFigure(model, {
              id: "f2",
              col: 0,
              row: 0,
              offset: { x: 50, y: 50 },
              width: 100,
              height: 100,
            });
            model.dispatch("SELECT_FIGURE", { figureId: "f1" });
            await nextTick();
            await dragAnchor(anchor, mouseMove, 0, true);
            const figure = model.getters.getFigure(sheetId, "f1")!;
            expect({
              x: figure.offset.x,
              col: figure.col,
              width: figure.width,
            }).toMatchObject({
              x: expectedResult.x % DEFAULT_CELL_WIDTH,
              col: Math.floor(expectedResult.x / DEFAULT_CELL_WIDTH),
              width: expectedResult.width,
            });
          });
        }
      );

      describe.each(["right", "topRight", "bottomRight"])(
        "Snap when resizing to the right with the %s anchor",
        (anchor: string) => {
          test.each([
            [47, { x: 50, width: 150 + FIGURE_BORDER_WIDTH }], // right border snaps with left border of other figure
            [152, { x: 50, width: 250 }], // right border snaps with right border of other figure
          ])("snap with mouseMove %s", async (mouseMove: Pixel, expectedResult) => {
            createFigure(model, {
              id: "f1",
              col: 0,
              row: 0,
              offset: { x: 50, y: 50 },
              width: 100,
              height: 100,
            });
            createFigure(model, {
              id: "f2",
              col: 0,
              row: 0,
              offset: { x: 200, y: 200 },
              width: 100,
              height: 100,
            });
            model.dispatch("SELECT_FIGURE", { figureId: "f1" });
            await nextTick();
            await dragAnchor(anchor, mouseMove, 0, true);
            const figure = model.getters.getFigure(sheetId, "f1")!;
            expect({
              x: figure.offset.x,
              col: figure.col,
              width: figure.width,
            }).toMatchObject({
              x: expectedResult.x % DEFAULT_CELL_WIDTH,
              col: Math.floor(expectedResult.x / DEFAULT_CELL_WIDTH),
              width: expectedResult.width,
            });
          });

          test.each([[{ wheelCol: 1, wheelRow: 0 }], [{ wheelCol: 8, wheelRow: 0 }]])(
            "Resize with scroll %s",
            async ({ wheelCol, wheelRow }) => {
              createFigure(model, {
                id: "f1",
                col: 10,
                row: 10,
                offset: { x: 0, y: 0 },
                width: 120,
                height: 120,
              });
              model.dispatch("SELECT_FIGURE", { figureId: "f1" });
              await nextTick();

              triggerMouseEvent(anchorSelectors[anchor], "pointerdown");
              triggerWheelEvent(anchorSelectors[anchor], {
                deltaY: wheelRow * DEFAULT_CELL_HEIGHT,
                deltaX: wheelCol * DEFAULT_CELL_WIDTH,
              });
              triggerMouseEvent(anchorSelectors[anchor], "pointerup");
              const figure = model.getters.getFigure(sheetId, "f1")!;
              expect(figure).toMatchObject({
                col: 10,
                row: 10,
                offset: { x: 0, y: 0 },
                width: 120 + wheelCol * DEFAULT_CELL_WIDTH,
                height: 120 + wheelRow * DEFAULT_CELL_HEIGHT,
              });
            }
          );
        }
      );

      describe.each(["bottom", "bottomRight", "bottomLeft"])(
        "Snap when resizing down with the %s anchor",
        (anchor: string) => {
          test.each([
            [46, { y: 50, height: 150 + FIGURE_BORDER_WIDTH }], // bottom border snaps with top border of other figure
            [154, { y: 50, height: 250 }], // bottom border snaps with bottom border of other figure
          ])("snap with mouseMove %s", async (mouseMove: Pixel, expectedResult) => {
            createFigure(model, {
              id: "f1",
              col: 0,
              row: 0,
              offset: { x: 50, y: 50 },
              width: 100,
              height: 100,
            });
            createFigure(model, {
              id: "f2",
              col: 0,
              row: 0,
              offset: { x: 200, y: 200 },
              width: 100,
              height: 100,
            });
            model.dispatch("SELECT_FIGURE", { figureId: "f1" });
            await nextTick();
            await dragAnchor(anchor, 0, mouseMove, true);
            const figure = model.getters.getFigure(sheetId, "f1")!;
            expect({
              y: figure.offset.y,
              row: figure.row,
              height: figure.height,
            }).toMatchObject({
              y: expectedResult.y % DEFAULT_CELL_HEIGHT,
              row: Math.floor(expectedResult.y / DEFAULT_CELL_HEIGHT),
              height: expectedResult.height,
            });
          });

          test.each([[{ wheelCol: 0, wheelRow: 1 }], [{ wheelCol: 0, wheelRow: 8 }]])(
            "snap with scroll %s",
            async ({ wheelCol, wheelRow }) => {
              createFigure(model, {
                id: "f1",
                col: 10,
                row: 10,
                offset: { x: 0, y: 0 },
                width: 120,
                height: 120,
              });
              createFigure(model, {
                id: "f2",
                col: 10 + wheelCol,
                row: 10 + wheelRow,
                offset: { x: 0, y: 2 },
                width: 120,
                height: 120,
              });
              model.dispatch("SELECT_FIGURE", { figureId: "f1" });
              await nextTick();

              triggerMouseEvent(anchorSelectors[anchor], "pointerdown");
              triggerWheelEvent(anchorSelectors[anchor], {
                deltaY: wheelRow * DEFAULT_CELL_HEIGHT,
                deltaX: wheelCol * DEFAULT_CELL_WIDTH,
              });
              triggerMouseEvent(anchorSelectors[anchor], "pointerup");

              const figure = model.getters.getFigure(sheetId, "f1")!;
              expect(figure).toMatchObject({
                col: 10,
                row: 10,
                offset: { x: 0, y: 0 },
                width: 120 + wheelCol * DEFAULT_CELL_WIDTH,
                height: 120 + wheelRow * DEFAULT_CELL_HEIGHT + 2,
              });
            }
          );

          test.each([[{ wheelCol: 0, wheelRow: 1 }], [{ wheelCol: 0, wheelRow: 1 }]])(
            "Resize with scroll %s",
            async ({ wheelCol, wheelRow }) => {
              createFigure(model, {
                id: "f1",
                col: 10,
                row: 10,
                offset: { x: 0, y: 0 },
                width: 120,
                height: 120,
              });
              model.dispatch("SELECT_FIGURE", { figureId: "f1" });
              await nextTick();
              triggerMouseEvent(anchorSelectors[anchor], "pointerdown");
              triggerWheelEvent(anchorSelectors[anchor], {
                deltaY: wheelRow * DEFAULT_CELL_HEIGHT,
                deltaX: wheelCol * DEFAULT_CELL_WIDTH,
              });
              triggerMouseEvent(anchorSelectors[anchor], "pointerup");
              const figure = model.getters.getFigure(sheetId, "f1")!;
              expect(figure).toMatchObject({
                col: 10,
                row: 10,
                offset: { x: 0, y: 0 },
                width: 120 + wheelCol * DEFAULT_CELL_WIDTH,
                height: 120 + wheelRow * DEFAULT_CELL_HEIGHT,
              });
            }
          );
        }
      );

      describe.each(["top", "topRight", "topLeft"])(
        "Snap when resizing up with the %s anchor",
        (anchor: string) => {
          test.each([
            [-54, { y: 150 - FIGURE_BORDER_WIDTH, height: 150 + FIGURE_BORDER_WIDTH }], // top border snaps with bottom border of other figure
            [-153, { y: 50, height: 250 }], // top border snaps with top border of other figure
          ])("snap with mouseMove %s", async (mouseMove: Pixel, expectedResult) => {
            createFigure(model, {
              id: "f1",
              col: 0,
              row: 0,
              offset: { x: 200, y: 200 },
              width: 100,
              height: 100,
            });
            createFigure(model, {
              id: "f2",
              col: 0,
              row: 0,
              offset: { x: 50, y: 50 },
              width: 100,
              height: 100,
            });
            model.dispatch("SELECT_FIGURE", { figureId: "f1" });
            await nextTick();
            await dragAnchor(anchor, 0, mouseMove, true);
            const figure = model.getters.getFigure(sheetId, "f1")!;
            expect({
              y: figure.offset.y,
              row: figure.row,
              height: figure.height,
            }).toMatchObject({
              y: expectedResult.y % DEFAULT_CELL_HEIGHT,
              row: Math.floor(expectedResult.y / DEFAULT_CELL_HEIGHT),
              height: expectedResult.height,
            });
          });
        }
      );
    });

    describe("Snap lines display", () => {
      describe("Snap lines are displayed during the drag & drop", () => {
        test("If the figure is snapping horizontally left of the other figure", async () => {
          createFigure(model, {
            id: "f1",
            col: 0,
            row: 0,
            offset: { x: 50, y: 0 },
            width: 20,
            height: 20,
          });
          createFigure(model, {
            id: "f2",
            col: 0,
            row: 0,
            offset: { x: 0, y: 0 },
            width: 50,
            height: 50,
          });
          await nextTick();
          const selector = ".o-figure-container[data-id=HorizontalSnapContainer]";
          expect(fixture.querySelectorAll(selector)).toHaveLength(0);
          const figureEl = fixture.querySelector<HTMLElement>(".o-figure[data-id=f2]")!;
          await clickAndDrag(figureEl, { x: 0, y: 0 }, undefined, false);
          expect(fixture.querySelectorAll(selector)).toHaveLength(1);

          expect(parseInt(getElStyle(selector, "top"))).toBe(0);
          expect(parseInt(getElStyle(selector, "left"))).toBe(FIGURE_BORDER_WIDTH);
          expect(parseInt(getElStyle(selector, "width"))).toBe(70 - FIGURE_BORDER_WIDTH);
        });

        test("If the figure is snapping horizontally right of the other figure", async () => {
          createFigure(model, {
            id: "f1",
            col: 0,
            row: 0,
            offset: { x: 0, y: 0 },
            width: 20,
            height: 20,
          });
          createFigure(model, {
            id: "f2",
            col: 0,
            row: 0,
            offset: { x: 50, y: 0 },
            width: 50,
            height: 50,
          });
          await nextTick();
          const selector = ".o-figure-container[data-id=HorizontalSnapContainer]";
          expect(fixture.querySelectorAll(selector)).toHaveLength(0);
          const figureEl = fixture.querySelector<HTMLElement>(".o-figure[data-id=f2]")!;
          await clickAndDrag(figureEl, { x: 0, y: 0 }, undefined, false);
          expect(fixture.querySelectorAll(selector)).toHaveLength(1);

          expect(parseInt(getElStyle(selector, "top"))).toBe(0);
          expect(parseInt(getElStyle(selector, "left"))).toBe(0);
          expect(parseInt(getElStyle(selector, "width"))).toBe(100);
        });

        test("If the figure is snapping vertically above the other figure", async () => {
          createFigure(model, {
            id: "f1",
            col: 0,
            row: 0,
            offset: { x: 0, y: 50 },
            width: 20,
            height: 20,
          });
          createFigure(model, {
            id: "f2",
            col: 0,
            row: 0,
            offset: { x: 0, y: 0 },
            width: 50,
            height: 50,
          });
          await nextTick();
          const selector = ".o-figure-container[data-id=VerticalSnapContainer]";
          expect(fixture.querySelectorAll(selector)).toHaveLength(0);
          const figureEl = fixture.querySelector<HTMLElement>(".o-figure[data-id=f2]")!;
          await clickAndDrag(figureEl, { x: 0, y: 0 }, undefined, false);
          expect(fixture.querySelectorAll(selector)).toHaveLength(1);

          expect(parseInt(getElStyle(selector, "left"))).toBe(0);
          expect(parseInt(getElStyle(selector, "top"))).toBe(FIGURE_BORDER_WIDTH);
          expect(parseInt(getElStyle(selector, "height"))).toBe(70 - FIGURE_BORDER_WIDTH);
        });

        test("If the figure is snapping vertically below the other figure", async () => {
          createFigure(model, {
            id: "f1",
            col: 0,
            row: 0,
            offset: { x: 0, y: 0 },
            width: 20,
            height: 20,
          });
          createFigure(model, {
            id: "f2",
            col: 0,
            row: 0,
            offset: { x: 0, y: 50 },
            width: 50,
            height: 50,
          });
          await nextTick();
          const selector = ".o-figure-container[data-id=VerticalSnapContainer]";
          expect(fixture.querySelectorAll(selector)).toHaveLength(0);
          const figureEl = fixture.querySelector<HTMLElement>(".o-figure[data-id=f2]")!;
          await clickAndDrag(figureEl, { x: 0, y: 0 }, undefined, false);
          expect(fixture.querySelectorAll(selector)).toHaveLength(1);

          expect(parseInt(getElStyle(selector, "left"))).toBe(0);
          expect(parseInt(getElStyle(selector, "top"))).toBe(0);
          expect(parseInt(getElStyle(selector, "height"))).toBe(100);
        });

        test("If there are multiple horizontal matches, the snap line include all of them", async () => {
          createFigure(model, {
            id: "f1",
            col: 0,
            row: 0,
            offset: { x: 0, y: 50 },
            width: 20,
            height: 20,
          });
          createFigure(model, {
            id: "f2",
            col: 0,
            row: 0,
            offset: { x: 50, y: 50 },
            width: 50,
            height: 50,
          });
          createFigure(model, {
            id: "f3",
            col: 0,
            row: 0,
            offset: { x: 200, y: 50 },
            width: 50,
            height: 50,
          });
          await nextTick();

          await clickAndDrag(".o-figure[data-id=f1]", { x: 0, y: 0 }, undefined, false);

          const snapContainer = ".o-figure-container[data-id=HorizontalSnapContainer]";
          expect(parseInt(getElStyle(snapContainer, "top"))).toBe(50);
          expect(parseInt(getElStyle(snapContainer, "left"))).toBe(0);
          expect(parseInt(getElStyle(snapContainer, "width"))).toBe(250);
        });

        test("If there are multiple vertical matches, the snap line include all of them", async () => {
          createFigure(model, {
            id: "f1",
            col: 0,
            row: 0,
            offset: { x: 50, y: 0 },
            width: 20,
            height: 20,
          });
          createFigure(model, {
            id: "f2",
            col: 0,
            row: 0,
            offset: { x: 50, y: 50 },
            width: 50,
            height: 50,
          });
          createFigure(model, {
            id: "f3",
            col: 0,
            row: 0,
            offset: { x: 50, y: 200 },
            width: 50,
            height: 50,
          });
          await nextTick();

          await clickAndDrag(".o-figure[data-id=f1]", { x: 0, y: 0 }, undefined, false);

          const snapContainer = ".o-figure-container[data-id=VerticalSnapContainer]";
          expect(parseInt(getElStyle(snapContainer, "left"))).toBe(50);
          expect(parseInt(getElStyle(snapContainer, "top"))).toBe(0);
          expect(parseInt(getElStyle(snapContainer, "height"))).toBe(250);
        });
      });

      test("Snap lines disappear after the drag & drop ends", async () => {
        createFigure(model, {
          id: "f1",
          col: 0,
          row: 0,
          offset: { x: 0, y: 0 },
          width: 20,
          height: 20,
        });
        createFigure(model, {
          id: "f2",
          col: 0,
          row: 0,
          offset: { x: 50, y: 50 },
          width: 50,
          height: 50,
        });
        await nextTick();
        expect(fixture.querySelectorAll(".o-figure-snap-line")).toHaveLength(0);
        await clickAndDrag(".o-figure[data-id=f1]", { x: 50, y: 50 }, undefined, false);
        expect(fixture.querySelectorAll(".o-figure-snap-line")).toHaveLength(2);
        triggerMouseEvent(".o-figure[data-id=f1]", "pointerup");
        await nextTick();
        expect(fixture.querySelectorAll(".o-figure-snap-line")).toHaveLength(0);
      });
    });

    describe("Snap with freeze pane", () => {
      test.each([
        { figHeight: 50, scrollY: 0 }, // Figure totally in frozen pane
        { figHeight: 6 * cellHeight, scrollY: 0 }, // Figure half in frozen pane, no scroll
        { figHeight: 6 * cellHeight, scrollY: 2 * cellHeight }, // Figure half in frozen pane, with scroll
      ])("Can snap with figure in frozen row, %s ", async (params) => {
        freezeRows(model, 5);
        createFigure(model, {
          id: "f1",
          col: 0,
          row: 0,
          offset: { x: 0, y: 0 },
          width: 50,
          height: params.figHeight,
        });
        createFigure(model, {
          id: "f2",
          col: 0,
          row: 0,
          offset: { x: 0, y: 0 },
          width: 50,
          height: params.figHeight,
        });
        setViewportOffset(model, 0, params.scrollY);
        await nextTick();

        await clickAndDrag(".o-figure[data-id=f1]", { x: 0, y: 0 }, undefined, false);
        expect(fixture.querySelector(".o-figure-snap-line.horizontal")).toBeTruthy();
        expect(fixture.querySelector(".o-figure-snap-line.vertical")).toBeTruthy();

        await clickAndDrag(".o-figure[data-id=f1]", { x: 0, y: 10 }, undefined, false);
        expect(fixture.querySelector(".o-figure-snap-line.horizontal")).toBeFalsy();
        expect(fixture.querySelector(".o-figure-snap-line.vertical")).toBeTruthy();

        await clickAndDrag(
          ".o-figure[data-id=f1]",
          { x: 0, y: params.figHeight - 10 },
          undefined,
          false
        );
        expect(fixture.querySelector(".o-figure-snap-line.horizontal")).toBeTruthy();
        expect(fixture.querySelector(".o-figure-snap-line.vertical")).toBeTruthy();
      });

      test.each([
        { figWidth: 50, scrollX: 0 }, // Figure totally in frozen pane
        { figWidth: 6 * cellWidth, scrollX: 0 }, // Figure half in frozen pane, no scroll
        { figWidth: 6 * cellWidth, scrollX: 2 * cellWidth }, // Figure half in frozen pane, with scroll
      ])("Can snap with figure in frozen cols, %s ", async (params) => {
        freezeColumns(model, 5);
        createFigure(model, {
          id: "f1",
          col: 0,
          row: 0,
          offset: { x: 0, y: 0 },
          width: params.figWidth,
          height: 50,
        });
        createFigure(model, {
          id: "f2",
          col: 0,
          row: 0,
          offset: { x: 0, y: 0 },
          width: params.figWidth,
          height: 50,
        });
        setViewportOffset(model, params.scrollX, 0);
        await nextTick();

        await clickAndDrag(".o-figure[data-id=f1]", { x: 0, y: 0 }, undefined, false);
        expect(fixture.querySelector(".o-figure-snap-line.vertical")).toBeTruthy();
        expect(fixture.querySelector(".o-figure-snap-line.horizontal")).toBeTruthy();

        await clickAndDrag(".o-figure[data-id=f1]", { x: 10, y: 0 }, undefined, false);
        expect(fixture.querySelector(".o-figure-snap-line.vertical")).toBeFalsy();
        expect(fixture.querySelector(".o-figure-snap-line.horizontal")).toBeTruthy();

        await clickAndDrag(
          ".o-figure[data-id=f1]",
          { x: params.figWidth - 10, y: 0 },
          undefined,
          false
        );
        expect(fixture.querySelector(".o-figure-snap-line.vertical")).toBeTruthy();
        expect(fixture.querySelector(".o-figure-snap-line.horizontal")).toBeTruthy();
      });

      test("Snap that makes the figure change pane in Y apply the right offset", async () => {
        freezeRows(model, 2);
        setViewportOffset(model, 0, 2 * cellHeight);
        createFigure(model, {
          id: "f1",
          col: 0,
          row: 0,
          offset: { x: 0, y: 0 },
          width: 50,
          height: 50,
        });
        createFigure(model, {
          id: "f2",
          col: 0,
          row: 0,
          offset: { x: 0, y: 4 * cellHeight + 1 },
          width: 50,
          height: 20,
        });
        await nextTick();

        const selector = ".o-figure[data-id=f1]";
        await clickAndDrag(selector, { x: 0, y: 2 * cellHeight - 1 }, undefined, true);
        expect(model.getters.getFigure(sheetId, "f1")).toMatchObject({
          col: 0,
          row: 4,
          offset: { x: 0, y: 1 },
        });
      });

      test("Snap that makes the figure change pane in X apply the right offset", async () => {
        freezeColumns(model, 2);
        setViewportOffset(model, 2 * cellWidth, 0);
        createFigure(model, {
          id: "f1",
          col: 0,
          row: 0,
          offset: { x: 0, y: 0 },
          width: 50,
          height: 50,
        });
        createFigure(model, {
          id: "f2",
          col: 0,
          row: 0,
          offset: { x: 4 * cellWidth + 1, y: 0 },
          width: 20,
          height: 50,
        });
        await nextTick();

        await clickAndDrag(
          ".o-figure[data-id=f1]",
          { x: 2 * cellWidth - 1, y: 0 },
          undefined,
          true
        );
        expect(model.getters.getFigure(sheetId, "f1")).toMatchObject({
          col: 4,
          row: 0,
          offset: { x: 1, y: 0 },
        });
      });
    });

    describe("Snap doesn't happen with borders that aren't visible", () => {
      test("No Y snap with top border above the viewport", async () => {
        createFigure(model, {
          id: "f1",
          col: 0,
          row: 0,
          offset: { x: 50, y: 50 },
          width: 100,
          height: 100,
        });
        createFigure(model, {
          id: "f2",
          col: 0,
          row: 0,
          offset: { x: 0, y: 0 },
          width: 20,
          height: 20,
        });
        setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT);
        await nextTick();
        await clickAndDrag(".o-figure[data-id=f1]", { x: 0, y: -49 }, undefined, true);
        expect(model.getters.getFigure(sheetId, "f1")).toMatchObject({
          col: Math.floor(50 / DEFAULT_CELL_WIDTH),
          row: 0,
          offset: { x: 50 % DEFAULT_CELL_WIDTH, y: 1 },
        });
      });

      test("No X snap with left border left of the viewport", async () => {
        createFigure(model, {
          id: "f1",
          col: 0,
          row: 0,
          offset: { x: 50, y: 50 },
          width: 100,
          height: 100,
        });
        createFigure(model, {
          id: "f2",
          col: 0,
          row: 0,
          offset: { x: 0, y: 0 },
          width: 20,
          height: 20,
        });
        setViewportOffset(model, DEFAULT_CELL_WIDTH, 0);
        await nextTick();
        await clickAndDrag(".o-figure[data-id=f1]", { x: -49, y: 0 }, undefined, true);
        expect(model.getters.getFigure(sheetId, "f1")).toMatchObject({
          col: 0,
          row: Math.floor(50 / DEFAULT_CELL_HEIGHT),
          offset: { x: 1, y: 50 % DEFAULT_CELL_HEIGHT },
        });
      });

      test("No Y snap with bottom border below the viewport", async () => {
        const { height: viewportHeight } = model.getters.getMainViewportRect();
        createFigure(model, {
          id: "f1",
          col: 0,
          row: 0,
          offset: { x: 0, y: 100 },
          width: 100,
          height: 0.85 * viewportHeight,
        });
        createFigure(model, {
          id: "f2",
          col: 0,
          row: 0,
          offset: { x: 0, y: 0 },
          width: 100,
          height: 0.85 * viewportHeight + 100,
        });
        await nextTick();
        await clickAndDrag(".o-figure[data-id=f1]", { x: 0, y: 1 }, undefined, true);
        expect(model.getters.getFigure(sheetId, "f1")).toMatchObject({
          col: 0,
          row: Math.floor(101 / DEFAULT_CELL_HEIGHT),
          offset: { x: 0, y: 101 % DEFAULT_CELL_HEIGHT },
        });
      });

      test("No X snap with right border right of the viewport", async () => {
        const { width: viewportWidth } = model.getters.getMainViewportRect();
        createFigure(model, {
          id: "f1",
          col: 0,
          row: 0,
          offset: { x: 100, y: 0 },
          width: 0.85 * viewportWidth,
          height: 100,
        });
        createFigure(model, {
          id: "f2",
          col: 0,
          row: 0,
          offset: { x: 0, y: 0 },
          width: 0.85 * viewportWidth + 100,
          height: 100,
        });
        await nextTick();
        await clickAndDrag(".o-figure[data-id=f1]", { x: 1, y: 0 }, undefined, true);
        expect(model.getters.getFigure(sheetId, "f1")).toMatchObject({
          col: Math.floor(101 / DEFAULT_CELL_WIDTH),
          row: 0,
          offset: { x: 101 % DEFAULT_CELL_WIDTH, y: 0 },
        });
      });

      test("No Y snap with top border below a frozen pane", async () => {
        freezeRows(model, 3);
        createFigure(model, {
          id: "f1",
          col: 0,
          row: 0,
          offset: { x: 50, y: 0 },
          width: 20,
          height: 20,
        });
        createFigure(model, {
          id: "f2",
          col: 0,
          row: 0,
          offset: { x: 50, y: 4 * DEFAULT_CELL_HEIGHT },
          width: 100,
          height: 100,
        });
        setViewportOffset(model, 0, 2 * DEFAULT_CELL_HEIGHT);
        await nextTick();
        await clickAndDrag(
          ".o-figure[data-id=f1]",
          { x: 0, y: 2 * DEFAULT_CELL_HEIGHT - 1 },
          undefined,
          true
        );
        expect(model.getters.getFigure(sheetId, "f1")).toMatchObject({
          col: 0,
          row: 1,
          offset: { x: 50, y: DEFAULT_CELL_HEIGHT - 1 },
        });
      });

      test("No X snap with left border below a frozen pane", async () => {
        freezeColumns(model, 3);
        createFigure(model, {
          id: "f1",
          col: 0,
          row: 0,
          offset: { x: 0, y: 50 },
          width: 20,
          height: 20,
        });
        createFigure(model, {
          id: "f2",
          offset: {
            x: 4 * DEFAULT_CELL_WIDTH,
            y: 50,
          },
          width: 100,
          height: 100,
        });
        setViewportOffset(model, 2 * DEFAULT_CELL_WIDTH, 0);
        await nextTick();
        await clickAndDrag(
          '.o-figure[data-id="f1"]',
          { x: 2 * DEFAULT_CELL_WIDTH - 1, y: 0 },
          undefined,
          true
        );
        expect(model.getters.getFigure(sheetId, "f1")).toMatchObject({
          col: 1,
          row: Math.floor(50 / DEFAULT_CELL_HEIGHT),
          offset: {
            x: DEFAULT_CELL_WIDTH - 1,
            y: 50 % DEFAULT_CELL_HEIGHT,
          },
        });
      });
    });
  });
});

describe.each(ZOOM_VALUES.map((zoom) => zoom / 100))("figures with zoom %s", (zoom) => {
  beforeEach(async () => {
    notifyUser = jest.fn();
    mockSpreadsheetRect = { top: 100, left: 200, height: 1000, width: 1000 };
    mockFigureMenuItemRect = { top: 500, left: 500 };
    ({ model, parent, fixture, env } = await mountSpreadsheet(undefined, { notifyUser }));
    sheetId = model.getters.getActiveSheetId();
    model.dispatch("SET_ZOOM", { zoom: zoom });
  });

  test("focus a figure", async () => {
    createFigure(model);
    await nextTick();
    expect(fixture.querySelector(".o-figure")).not.toBeNull();
    await simulateClick(".o-figure");
    expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));
  });

  test("select a figure, it should have the  resize handles", async () => {
    createFigure(model);
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    await nextTick();
    const anchors = fixture.querySelectorAll(".o-fig-anchor");
    expect(anchors).toHaveLength(8);
  });

  test.each([
    [
      "top",
      { mouseOffsetX: 0, mouseOffsetY: -50 },
      { width: 100, height: Math.round(100 + 50 / zoom) },
    ],
    [
      "topRight",
      { mouseOffsetX: 50, mouseOffsetY: -50 },
      { width: Math.round(100 + 50 / zoom), height: Math.round(100 + 50 / zoom) },
    ],
    [
      "right",
      { mouseOffsetX: 50, mouseOffsetY: 0 },
      { width: Math.round(100 + 50 / zoom), height: 100 },
    ],
    [
      "bottomRight",
      { mouseOffsetX: 50, mouseOffsetY: 50 },
      { width: Math.round(100 + 50 / zoom), height: Math.round(100 + 50 / zoom) },
    ],
    [
      "bottom",
      { mouseOffsetX: 0, mouseOffsetY: 50 },
      { width: 100, height: Math.round(100 + 50 / zoom) },
    ],
    [
      "bottomLeft",
      { mouseOffsetX: -50, mouseOffsetY: 50 },
      { width: Math.round(100 + 50 / zoom), height: Math.round(100 + 50 / zoom) },
    ],
    [
      "left",
      { mouseOffsetX: -50, mouseOffsetY: 0 },
      { width: Math.round(100 + 50 / zoom), height: 100 },
    ],
    [
      "topLeft",
      { mouseOffsetX: -50, mouseOffsetY: -50 },
      { width: Math.round(100 + 50 / zoom), height: Math.round(100 + 50 / zoom) },
    ],
  ])("Can resize a figure through its anchors", async (anchor: string, mouseMove, expectedSize) => {
    const figureId = "someuuid";
    createFigure(model, {
      id: figureId,
      col: 0,
      row: 0,
      offset: { x: 200, y: 200 },
      width: 100,
      height: 100,
    });
    model.dispatch("SELECT_FIGURE", { figureId });
    await nextTick();
    await dragAnchor(anchor, mouseMove.mouseOffsetX, mouseMove.mouseOffsetY, true);
    expect(model.getters.getFigure(sheetId, figureId)).toMatchObject(expectedSize);
  });

  test("Can move a figure with drag & drop", async () => {
    createFigure(model, {
      id: "someuuid",
      col: 2,
      row: 3,
      offset: { x: 20, y: 10 },
    });
    await nextTick();
    await clickAndDrag(
      ".o-figure",
      { x: (DEFAULT_CELL_WIDTH * 2 + 20) * zoom, y: (DEFAULT_CELL_HEIGHT * 3 + 10) * zoom },
      undefined,
      true
    );

    expect(model.getters.getFigure(model.getters.getActiveSheetId(), "someuuid")).toMatchObject({
      col: 4,
      row: 6,
      offset: { x: expect.toBeBetween(39, 41), y: expect.toBeBetween(19, 21) },
    });
  });
});
