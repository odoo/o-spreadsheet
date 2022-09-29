import { App, Component, xml } from "@odoo/owl";
import { Model, Spreadsheet } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { figureRegistry } from "../../src/registries";
import { CreateFigureCommand, Figure, SpreadsheetChildEnv, UID } from "../../src/types";
import {
  activateSheet,
  createSheet,
  selectCell,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { simulateClick, triggerMouseEvent } from "../test_helpers/dom_helper";
import { getCellContent } from "../test_helpers/getters_helpers";
import { makeTestFixture, mountSpreadsheet, nextTick } from "../test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;
let parent: Spreadsheet;
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
    ({ app, parent } = await mountSpreadsheet(fixture));
    model = parent.model;
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

  test("deleting a figure focuses the grid", async () => {
    createFigure(model);
    await nextTick();
    const figure = fixture.querySelector(".o-figure")!;
    await simulateClick(".o-figure");
    expect(document.activeElement).toBe(figure);
    figure.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
    await nextTick();
    expect(fixture.querySelector(".o-figure")).toBeNull();
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid"));
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

  test("select a figure, it should have the  resize handles", async () => {
    createFigure(model);
    model.dispatch("SELECT_FIGURE", { id: "someuuid" });
    await nextTick();
    const anchors = fixture.querySelectorAll(".o-anchor");
    expect(anchors).toHaveLength(8);
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
    const figure = fixture.querySelector(".o-figure-container")!;
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
});
