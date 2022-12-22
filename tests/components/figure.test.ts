import { Component, xml } from "@odoo/owl";
import { Model, Spreadsheet } from "../../src";
import { ChartJsComponent } from "../../src/components/figures/chart/chartJs/chartjs";
import { ScorecardChart } from "../../src/components/figures/chart/scorecard/chart_scorecard";
import {
  FIGURE_BORDER_COLOR,
  MENU_WIDTH,
  MIN_FIG_SIZE,
  SELECTION_BORDER_COLOR,
} from "../../src/constants";
import { chartComponentRegistry, figureRegistry } from "../../src/registries";
import { CreateFigureCommand, Figure, SpreadsheetChildEnv, UID } from "../../src/types";

import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
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
} from "../test_helpers/commands_helpers";
import {
  dragElement,
  getElComputedStyle,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import { getCellContent, getCellText } from "../test_helpers/getters_helpers";
import {
  getFigureDefinition,
  getFigureIds,
  mockChart,
  mountSpreadsheet,
  nextTick,
} from "../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../test_helpers/mock_helpers";
import { TEST_CHART_DATA } from "./../test_helpers/constants";

let env: SpreadsheetChildEnv;
let parent: Spreadsheet;
let fixture: HTMLElement;
let model: Model;

function createFigure(
  model: Model,
  figureParameters: Partial<CreateFigureCommand["figure"]> = {},
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const defaultParameters: CreateFigureCommand["figure"] = {
    id: "someuuid",
    x: 1,
    y: 1,
    height: 100,
    width: 100,
    tag: "text",
  };

  return model.dispatch("CREATE_FIGURE", {
    sheetId,
    figure: { ...defaultParameters, ...figureParameters },
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
  await dragElement(anchorSelectors[anchor], dragX, dragY, mouseUp);
}

//Test Component required as we don't especially want/need to load an entire chart
const TEMPLATE = xml/* xml */ `
  <div class="o-fig-text">
    <t t-esc='"coucou"'/>
  </div>
`;

interface Props {
  figure: Figure;
}
class TextFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = TEMPLATE;
}

mockChart();

let mockSpreadsheetRect: Partial<DOMRect>;
let mockFigureMenuItemRect: Partial<DOMRect>;
mockGetBoundingClientRect({
  "o-popover": () => ({ height: 0, width: 0 }),
  "o-spreadsheet": () => ({ ...mockSpreadsheetRect }),
  "o-figure-menu-item": () => ({ ...mockFigureMenuItemRect }),
});

beforeAll(() => {
  figureRegistry.add("text", { Component: TextFigure });
  // TODO : remove this once #1861 is merged
  chartComponentRegistry.add("line", ChartJsComponent);
  chartComponentRegistry.add("bar", ChartJsComponent);
  chartComponentRegistry.add("pie", ChartJsComponent);
  chartComponentRegistry.add("gauge", ChartJsComponent);
  chartComponentRegistry.add("scorecard", ScorecardChart);
});
afterAll(() => {
  figureRegistry.remove("text");
});

describe("figures", () => {
  beforeEach(async () => {
    ({ model, env, parent, fixture } = await mountSpreadsheet());
    mockSpreadsheetRect = { top: 100, left: 200, height: 1000, width: 1000 };
    mockFigureMenuItemRect = { top: 500, left: 500 };
  });

  test("can create a figure with some data", () => {
    createFigure(model);
    expect(model.getters.getFigures(model.getters.getActiveSheetId())).toEqual([
      { id: "someuuid", height: 100, tag: "text", width: 100, x: 1, y: 1 },
    ]);
  });
  test("focus a figure", async () => {
    createFigure(model);
    await nextTick();
    expect(fixture.querySelector(".o-figure")).not.toBeNull();
    await simulateClick(".o-figure");
    expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));
  });

  test.skip("deleting a figure focuses the grid hidden input", async () => {
    createFigure(model);
    await nextTick();
    const figure = fixture.querySelector(".o-figure")!;
    await simulateClick(".o-figure");
    expect(document.activeElement).toBe(figure);
    figure.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
    await nextTick();
    expect(fixture.querySelector(".o-figure")).toBeNull();
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer"));
  });

  test("deleting a figure doesn't delete selection", async () => {
    createFigure(model);
    setCellContent(model, "A1", "content");
    selectCell(model, "A1");
    await nextTick();
    const figure = fixture.querySelector(".o-figure")!;
    await simulateClick(".o-figure");
    figure.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    await nextTick();
    expect(fixture.querySelector(".o-figure")).toBeNull();
    expect(getCellContent(model, "A1")).toBe("content");
  });

  test("Add a figure on sheet2, scroll down on sheet 1, switch to sheet 2, the figure should be displayed", async () => {
    createSheet(model, { sheetId: "42", position: 1 });
    createFigure(model, {}, "42");
    fixture.querySelector(".o-grid")!.dispatchEvent(new WheelEvent("wheel", { deltaX: 1500 }));
    fixture.querySelector(".o-scrollbar.vertical")!.dispatchEvent(new Event("scroll"));
    await nextTick();
    activateSheet(model, "42");
    await nextTick();
    expect(fixture.querySelectorAll(".o-figure")).toHaveLength(1);
  });

  test("Can move a figure with keyboard", async () => {
    const sheetId = model.getters.getActiveSheetId();
    createFigure(model);
    let figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({ id: "someuuid", x: 1, y: 1 });
    await nextTick();
    const figureContainer = fixture.querySelector(".o-figure")!;
    await simulateClick(".o-figure");
    await nextTick();
    const selectedFigure = model.getters.getSelectedFigureId();
    expect(selectedFigure).toBe("someuuid");
    //down
    figureContainer.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    figureContainer.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    await nextTick();
    figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({ id: "someuuid", x: 1, y: 3 });
    //right
    figureContainer.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    figureContainer.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    await nextTick();
    figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({ id: "someuuid", x: 3, y: 3 });
    //left
    figureContainer.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })
    );
    await nextTick();
    figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({ id: "someuuid", x: 2, y: 3 });
    //up
    figureContainer.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    await nextTick();
    figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({ id: "someuuid", x: 2, y: 2 });
  });

  test("figure is focused after a SELECT_FIGURE", async () => {
    createFigure(model);
    await nextTick();
    model.dispatch("SELECT_FIGURE", { id: "someuuid" });
    await nextTick();
    expect(document.activeElement?.classList).toContain("o-figure");
  });

  test("select a figure, it should have the  resize handles", async () => {
    createFigure(model);
    model.dispatch("SELECT_FIGURE", { id: "someuuid" });
    await nextTick();
    const anchors = fixture.querySelectorAll(".o-fig-anchor");
    expect(anchors).toHaveLength(8);
  });

  test("Can undo/redo with a figure focused", async () => {
    createFigure(model);
    await nextTick();
    setCellContent(model, "A1", "hello");
    await simulateClick(".o-figure");
    fixture
      .querySelector(".o-figure")
      ?.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
    expect(getCellText(model, "A1")).toBe("");
  });

  test.each([
    ["top", { mouseOffsetX: 0, mouseOffsetY: -50 }, { width: 100, height: 150 }],
    ["topRight", { mouseOffsetX: 50, mouseOffsetY: -50 }, { width: 150, height: 150 }],
    ["right", { mouseOffsetX: 50, mouseOffsetY: 0 }, { width: 150, height: 100 }],
    ["bottomRight", { mouseOffsetX: 50, mouseOffsetY: 50 }, { width: 150, height: 150 }],
    ["bottom", { mouseOffsetX: 0, mouseOffsetY: 50 }, { width: 100, height: 150 }],
    ["bottomLeft", { mouseOffsetX: -50, mouseOffsetY: 50 }, { width: 150, height: 150 }],
    ["left", { mouseOffsetX: -50, mouseOffsetY: 0 }, { width: 150, height: 100 }],
    ["topLeft", { mouseOffsetX: -50, mouseOffsetY: -50 }, { width: 150, height: 150 }],
  ])("Can resize a figure through its anchors", async (anchor: string, mouseMove, expectedSize) => {
    const figureId = "someuuid";
    createFigure(model, { id: figureId, y: 200, x: 200, width: 100, height: 100 });
    await nextTick();
    await simulateClick(".o-figure");
    await dragAnchor(anchor, mouseMove.mouseOffsetX, mouseMove.mouseOffsetY, true);
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getFigure(sheetId, figureId)).toMatchObject(expectedSize);
  });

  test.each([
    ["top", { mouseOffsetX: 0, mouseOffsetY: -100 }],
    ["left", { mouseOffsetX: -100, mouseOffsetY: 0 }],
    ["topLeft", { mouseOffsetX: -100, mouseOffsetY: -100 }],
  ])(
    "Resizing a figure through its top and left anchor does not change size beyond header boundaries",
    async (anchor: string, mouseMove: { mouseOffsetX: number; mouseOffsetY: number }) => {
      const figureId = "someuuid";
      const sheetId = model.getters.getActiveSheetId();
      const figure = { width: 100, height: 100 };
      createFigure(model, { id: figureId, y: 0, x: 0, ...figure });
      await nextTick();
      await simulateClick(".o-figure");
      await dragAnchor(anchor, mouseMove.mouseOffsetX, mouseMove.mouseOffsetY, true);
      expect(model.getters.getFigure(sheetId, figureId)).toMatchObject(figure);
    }
  );

  test.each([
    [
      "topLeft",
      { mouseOffsetX: 200, mouseOffsetY: 200 },
      {
        x: 200 + 100 - MIN_FIG_SIZE,
        y: 200 + 100 - MIN_FIG_SIZE,
        width: MIN_FIG_SIZE,
        height: MIN_FIG_SIZE,
      },
    ],
    [
      "topRight",
      { mouseOffsetX: -200, mouseOffsetY: 200 },
      {
        x: 200,
        y: 200 + 100 - MIN_FIG_SIZE,
        width: MIN_FIG_SIZE,
        height: MIN_FIG_SIZE,
      },
    ],
    [
      "bottomLeft",
      { mouseOffsetX: 200, mouseOffsetY: -200 },
      {
        x: 200 + 100 - MIN_FIG_SIZE,
        y: 200,
        width: MIN_FIG_SIZE,
        height: MIN_FIG_SIZE,
      },
    ],
    [
      "bottomRight",
      { mouseOffsetX: -200, mouseOffsetY: -200 },
      {
        x: 200,
        y: 200,
        width: MIN_FIG_SIZE,
        height: MIN_FIG_SIZE,
      },
    ],
  ])("resize a figure don't move it", async (anchor: string, mouseMove, expectedSize) => {
    const figureId = "someuuid";
    const sheetId = model.getters.getActiveSheetId();
    createFigure(model, { id: figureId, y: 200, x: 200, width: 100, height: 100 });
    await nextTick();
    await simulateClick(".o-figure");
    await dragAnchor(anchor, mouseMove.mouseOffsetX, mouseMove.mouseOffsetY, true);
    expect(model.getters.getFigure(sheetId, figureId)).toMatchObject(expectedSize);
  });

  test("clicking the sheet without dragging it does not update the figure", async () => {
    const spyDispatch = jest.spyOn(model, "dispatch");
    createFigure(model);
    await nextTick();
    await simulateClick(".o-figure");
    expect(spyDispatch).not.toHaveBeenLastCalledWith("UPDATE_FIGURE", expect.anything());
  });

  test("clicking the resizers without dragging it does not update the figure", async () => {
    const spyDispatch = jest.spyOn(model, "dispatch");
    createFigure(model);
    await nextTick();
    await simulateClick(".o-figure");
    await simulateClick(".o-fig-anchor.o-top");
    expect(spyDispatch).not.toHaveBeenLastCalledWith("UPDATE_FIGURE", expect.anything());
  });

  describe("Move a figure with drag & drop ", () => {
    test("Can move a figure with drag & drop", async () => {
      createFigure(model, { id: "someuuid", x: 200, y: 100 });
      await nextTick();
      await dragElement(".o-figure", 150, 100, true);
      await nextTick();
      expect(model.getters.getFigure(model.getters.getActiveSheetId(), "someuuid")).toMatchObject({
        x: 350,
        y: 200,
      });
    });

    describe("Figure drag & drop with frozen pane", () => {
      const cellWidth = DEFAULT_CELL_WIDTH;
      const cellHeight = DEFAULT_CELL_HEIGHT;
      const id = "someId";
      const figureSelector = ".o-figure";
      let sheetId: UID;

      beforeEach(async () => {
        sheetId = model.getters.getActiveSheetId();
        freezeRows(model, 5);
        freezeColumns(model, 5);
        model.dispatch("SET_VIEWPORT_OFFSET", {
          offsetX: 10 * cellWidth,
          offsetY: 10 * cellHeight,
        });
      });
      test("Figure in frozen rows can be dragged to main viewport", async () => {
        createFigure(model, { id, x: 16 * cellWidth, y: 4 * cellHeight });
        await nextTick();
        await dragElement(figureSelector, 0, 3 * cellHeight, true);
        expect(model.getters.getFigure(sheetId, id)).toMatchObject({
          x: 16 * cellWidth,
          y: 17 * cellHeight, // initial position + drag offset + scroll offset
        });
      });
      test("Figure in main viewport can be dragged to frozen rows", async () => {
        createFigure(model, { id, x: 16 * cellWidth, y: 16 * cellHeight });
        await nextTick();
        await dragElement(figureSelector, 0, -3 * cellHeight, true);
        expect(model.getters.getFigure(sheetId, id)).toMatchObject({
          x: 16 * cellWidth,
          y: 3 * cellHeight, // initial position + drag offset - scroll offset
        });
      });
      test("Dragging figure that is half hidden by frozen rows will put in on top of the freeze pane", async () => {
        createFigure(model, { id, x: 16 * cellWidth, y: 14 * cellHeight, height: 5 * cellHeight });
        await nextTick();
        await dragElement(figureSelector, 1, 0, true);
        expect(model.getters.getFigure(sheetId, id)).toMatchObject({
          x: 16 * cellWidth + 1,
          y: 4 * cellHeight, // initial position - scroll offset
        });
      });
      test("Figure in frozen cols can be dragged to main viewport", async () => {
        createFigure(model, { id, x: 4 * cellWidth, y: 16 * cellHeight });
        await nextTick();
        await dragElement(figureSelector, 3 * cellWidth, 0, true);
        expect(model.getters.getFigure(sheetId, id)).toMatchObject({
          x: 17 * cellWidth, // initial position + drag offset + scroll offset
          y: 16 * cellHeight,
        });
      });
      test("Figure in main viewport can be dragged to frozen cols", async () => {
        createFigure(model, { id, x: 16 * cellWidth, y: 16 * cellHeight });
        await nextTick();
        await dragElement(figureSelector, -3 * cellWidth, 0, true);
        expect(model.getters.getFigure(sheetId, id)).toMatchObject({
          x: 3 * cellWidth, // initial position + drag offset - scroll offset
          y: 16 * cellHeight,
        });
      });
      test("Dragging figure that is half hidden by frozen cols will put in on top of the freeze pane", async () => {
        createFigure(model, { id, x: 14 * cellWidth, y: 16 * cellHeight, width: 5 * cellWidth });
        await nextTick();
        await dragElement(figureSelector, 0, 1, true);
        expect(model.getters.getFigure(sheetId, id)).toMatchObject({
          x: 4 * cellWidth, // initial position - scroll offset
          y: 16 * cellHeight + 1,
        });
      });
    });

    test.each([
      [{ wheelX: 0, wheelY: 10 * DEFAULT_CELL_HEIGHT }],
      [{ wheelX: 10 * DEFAULT_CELL_WIDTH, wheelY: 0 }],
      [{ wheelX: 0, wheelY: 50 * DEFAULT_CELL_HEIGHT }], // scroll out of original viewport
      [{ wheelX: 40 * DEFAULT_CELL_WIDTH, wheelY: 0 }], // scroll out of original viewport
    ])(
      "Can scroll while dragging a figure",
      async ({ wheelX, wheelY }: { wheelX: number; wheelY: number }) => {
        addColumns(model, "after", "A", 50);
        createFigure(model, { id: "someuuid", x: 200, y: 100 });
        await nextTick();
        const figureEl = fixture.querySelector(".o-figure")!;

        triggerMouseEvent(figureEl, "mousedown");
        figureEl.dispatchEvent(
          new WheelEvent("wheel", { deltaY: wheelY, deltaX: wheelX, bubbles: true })
        );
        triggerMouseEvent(figureEl, "mouseup");
        await nextTick();

        expect(model.getters.getFigure(model.getters.getActiveSheetId(), "someuuid")).toMatchObject(
          {
            x: 200 + wheelX,
            y: 100 + wheelY,
          }
        );
      }
    );
  });

  test("Cannot select/move figure in readonly mode", async () => {
    const figureId = "someuuid";
    createFigure(model, { id: figureId, y: 200 });
    model.updateMode("readonly");
    await nextTick();
    const figure = fixture.querySelector(".o-figure")!;
    await simulateClick(".o-figure");
    expect(document.activeElement).not.toBe(figure);
    expect(fixture.querySelector(".o-fig-anchor")).toBeNull();

    triggerMouseEvent(figure, "mousedown", 300, 200);
    await nextTick();
    expect(figure.classList).not.toContain("o-dragging");
  });

  describe("Figure border", () => {
    test("Border for figure", async () => {
      createFigure(model);
      await nextTick();
      expect(getElComputedStyle(".o-figure-border", "border")).toEqual(
        `1px solid ${FIGURE_BORDER_COLOR}`
      );
    });

    test("Border for selected figure", async () => {
      createFigure(model, { id: "figureId" });
      model.dispatch("SELECT_FIGURE", { id: "figureId" });
      await nextTick();
      expect(getElComputedStyle(".o-figure-border", "border")).toEqual(
        `2px solid ${SELECTION_BORDER_COLOR}`
      );
    });

    test("Border for image figure", async () => {
      createImage(model, { figureId: "figureId" });
      await nextTick();
      expect(getElComputedStyle(".o-figure-border", "border")).toEqual(
        `0px solid ${FIGURE_BORDER_COLOR}`
      );
    });

    test("Border for selected image figure", async () => {
      createImage(model, { figureId: "figureId" });
      model.dispatch("SELECT_FIGURE", { id: "figureId" });
      await nextTick();
      expect(getElComputedStyle(".o-figure-border", "border")).toEqual(
        `2px solid ${SELECTION_BORDER_COLOR}`
      );
    });

    test("No border in dashboard mode", async () => {
      createFigure(model, { id: "figureId" });
      await nextTick();
      expect(getElComputedStyle(".o-figure-border", "border-width")).toEqual("1px");
      model.updateMode("dashboard");
      await nextTick();
      expect(getElComputedStyle(".o-figure-border", "border-width")).toEqual("0px");
    });
  });

  test("Selected figure isn't removed by scroll", async () => {
    createFigure(model);
    model.dispatch("SELECT_FIGURE", { id: "someuuid" });
    await nextTick();
    fixture.querySelector(".o-grid")!.dispatchEvent(new WheelEvent("wheel", { deltaX: 1500 }));
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
            createChart(model, TEST_CHART_DATA.basicChart, figureId);
            break;
          case "scorecard":
            createScorecardChart(model, TEST_CHART_DATA.scorecard, figureId);
            break;
          case "gauge":
            createGaugeChart(model, TEST_CHART_DATA.gauge, figureId);
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
        const envClipBoardContent = await env.clipboard.readText();
        if (envClipBoardContent.status === "ok") {
          expect(envClipBoardContent.content).toEqual(
            model.getters.getClipboardContent()["text/plain"]
          );
        }
        paste(model, "A4");
        expect(getFigureIds(model, sheetId)).toHaveLength(2);
        const figureIds = getFigureIds(model, sheetId);
        expect(getFigureDefinition(model, figureIds[0], type)).toEqual(figureDef);
        expect(getFigureDefinition(model, figureIds[1], type)).toEqual(figureDef);
      });

      test(`Can cut/paste a figure ${type} with its context menu`, async () => {
        const figureDef = getFigureDefinition(model, figureId, type);
        await simulateClick(".o-figure");
        await simulateClick(".o-figure-menu-item");
        await simulateClick(".o-menu div[data-name='cut']");
        const envClipBoardContent = await env.clipboard.readText();
        if (envClipBoardContent.status === "ok") {
          expect(envClipBoardContent.content).toEqual(
            model.getters.getClipboardContent()["text/plain"]
          );
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
        expect(menuPopover.style.top).toBe(`${500 - 25}px`); // 25 : spreadsheet offset of the mockGetBoundingClientRect
        expect(menuPopover.style.left).toBe(`${500 - 25 - MENU_WIDTH}px`);
      });

      test(`figure menu position is correct when menu button position < MENU_WIDTH for ${type}`, async () => {
        mockSpreadsheetRect = { top: 25, left: 25, height: 1000, width: 1000 };
        mockFigureMenuItemRect = { top: 500, left: MENU_WIDTH - 50, width: 32 };
        parent.render(true); // force a render to update `useAbsoluteBoundingRect` with new mocked values
        await nextTick();
        await simulateClick(".o-figure-menu-item");
        const menuPopover = fixture.querySelector<HTMLElement>(".o-popover")!;
        expect(menuPopover.style.top).toBe(`${500 - 25}px`); // 25 : spreadsheet offset of the mockGetBoundingClientRect
        expect(menuPopover.style.left).toBe(`${MENU_WIDTH - 50 - 25 + 32}px`);
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

      test("Click on Menu button open context menu", async () => {
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
        const menuPopover = fixture.querySelector(".o-menu")?.parentElement;
        expect(menuPopover?.style.top).toBe(`${500 - 100}px`);
        expect(menuPopover?.style.left).toBe(`${500 - 200 - MENU_WIDTH}px`);
      });

      test("Selecting a figure and hitting Ctrl does not unselect it", async () => {
        await simulateClick(".o-figure");
        expect(model.getters.getSelectedFigureId()).toBe(figureId);
        document.activeElement!.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Control", bubbles: true })
        );
        expect(model.getters.getSelectedFigureId()).toBe(figureId);
        document.activeElement!.dispatchEvent(
          new KeyboardEvent("keyup", { key: "Control", bubbles: true })
        );
        expect(model.getters.getSelectedFigureId()).toBe(figureId);
      });
    }
  );

  test("Clicking a figure does not mark it a 'dragging'", async () => {
    createFigure(model);
    await nextTick();
    triggerMouseEvent(".o-figure", "mousedown", 0, 0);
    await nextTick();
    expect(fixture.querySelector(".o-figure")?.classList.contains("o-dragging")).toBeFalsy();
  });
});
