import { App, Component, xml } from "@odoo/owl";
import { Model } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, MENU_WIDTH } from "../../src/constants";
import { figureRegistry } from "../../src/registries";
import { CreateFigureCommand, Figure, SpreadsheetChildEnv, UID } from "../../src/types";
import {
  activateSheet,
  createChart,
  createGaugeChart,
  createImage,
  createScorecardChart,
  createSheet,
  paste,
  selectCell,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { simulateClick, triggerMouseEvent } from "../test_helpers/dom_helper";
import { getCellContent, getCellText } from "../test_helpers/getters_helpers";
import {
  getFigureDefinition,
  getFigureIds,
  makeTestFixture,
  MockClipboard,
  mountSpreadsheet,
  nextTick,
} from "../test_helpers/helpers";
import { TEST_CHART_DATA } from "./charts.test";

let fixture: HTMLElement;
let model: Model;
let app: App;

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

  model.dispatch("CREATE_FIGURE", {
    sheetId,
    figure: { ...defaultParameters, ...figureParameters },
  });
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

beforeAll(() => {
  figureRegistry.add("text", { Component: TextFigure });
});
afterAll(() => {
  figureRegistry.remove("text");
});

describe("figures", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    ({ app, model } = await mountSpreadsheet(fixture));
  });

  afterEach(() => {
    app.destroy();
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

  test("deleting a figure focuses the grid hidden input", async () => {
    createFigure(model);
    await nextTick();
    const figure = fixture.querySelector(".o-figure")!;
    await simulateClick(".o-figure");
    expect(document.activeElement).toBe(figure);
    figure.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
    await nextTick();
    expect(fixture.querySelector(".o-figure")).toBeNull();
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid>input"));
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
    const anchors = fixture.querySelectorAll(".o-anchor");
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

  test("Can resize a figure through its anchors", async () => {
    const figureId = "someuuid";
    createFigure(model, { id: figureId, y: 200 });
    await nextTick();
    await simulateClick(".o-figure");
    expect(model.getters.getSelectedFigureId()).toBe(figureId);
    expect(model.getters.getFigure(model.getters.getActiveSheetId(), figureId)!.height).toBe(100);
    // increase height by 50 pixels from the top anchor
    const resizeTopSelector = fixture.querySelector(".o-anchor.o-top");
    triggerMouseEvent(resizeTopSelector, "mousedown", 0, 200);
    await nextTick();
    triggerMouseEvent(resizeTopSelector, "mousemove", 0, 150);
    await nextTick();
    triggerMouseEvent(resizeTopSelector, "mouseup");
    await nextTick();
    expect(model.getters.getFigure(model.getters.getActiveSheetId(), figureId)!.height).toBe(150);
  });

  test("Cannot select/move figure in readonly mode", async () => {
    const figureId = "someuuid";
    createFigure(model, { id: figureId, y: 200 });
    model.updateMode("readonly");
    await nextTick();
    const figure = fixture.querySelector(".o-figure")!;
    await simulateClick(".o-figure");
    expect(document.activeElement).not.toBe(figure);
    expect(fixture.querySelector(".o-anchor")).toBeNull();

    triggerMouseEvent(figure, "mousedown", 300, 200);
    await nextTick();
    expect(figure.classList).not.toContain("o-dragging");
  });

  test("Figure border disabled on dashboard mode", async () => {
    const figureId = "someuuid";
    createFigure(model, { id: figureId, y: 200 });
    await nextTick();
    let figure = fixture.querySelector(".o-figure")! as HTMLElement;
    expect(window.getComputedStyle(figure)["border-width"]).toEqual("1px");

    model.updateMode("dashboard");
    await nextTick();
    figure = fixture.querySelector(".o-figure")! as HTMLElement;
    expect(window.getComputedStyle(figure)["border-width"]).toEqual("0px");
  });

  test("Figures are cropped to avoid overlap with headers", async () => {
    const figureId = "someuuid";
    createFigure(model, { id: figureId, x: 100, y: 20, height: 200, width: 100 });
    await nextTick();
    const figure = fixture.querySelector(".o-figure-wrapper")!;
    expect(window.getComputedStyle(figure).width).toBe("102px"); // width + borders
    expect(window.getComputedStyle(figure).height).toBe("202px"); // height + borders
    model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: 2 * DEFAULT_CELL_WIDTH,
      offsetY: 3 * DEFAULT_CELL_HEIGHT,
    });
    await nextTick();

    const expectedWidth = 102 - (2 * DEFAULT_CELL_WIDTH - 100); // = width + borders - (overflow = viewport offset X - x)
    const expectedHeight = 202 - (3 * DEFAULT_CELL_HEIGHT - 20); // = height + borders - (overflow = viewport offset Y - y)

    expect(window.getComputedStyle(figure).width).toBe(`${expectedWidth}px`);
    expect(window.getComputedStyle(figure).height).toBe(`${expectedHeight}px`);
  });

  test("Selected figure isn't removed by scroll", async () => {
    createFigure(model);
    model.dispatch("SELECT_FIGURE", { id: "someuuid" });
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
        const clipboard = new MockClipboard();
        Object.defineProperty(navigator, "clipboard", {
          get() {
            return clipboard;
          },
          configurable: true,
        });
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

      test("Can open context menu on right click", async () => {
        triggerMouseEvent(".o-figure", "contextmenu");
        await nextTick();
        expect(document.querySelectorAll(".o-menu").length).toBe(1);
      });

      test("Cannot open context menu on right click in dashboard mode", async () => {
        model.updateMode("dashboard");
        triggerMouseEvent(".o-figure", "contextmenu");
        await nextTick();
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
});
