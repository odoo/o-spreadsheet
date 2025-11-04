import { ICONS } from "@odoo/o-spreadsheet-engine/components/icons/icons";
import {
  DEFAULT_BORDER_DESC,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  MIN_CELL_TEXT_MARGIN,
} from "@odoo/o-spreadsheet-engine/constants";
import { Box, GridRenderingContext, Model } from "../../src";
import { toZone } from "../../src/helpers";
import { EASING_FN, cellAnimationRegistry } from "../../src/registries/cell_animation_registry";
import { CELL_ANIMATION_DURATION, GridRenderer } from "../../src/stores/grid_renderer_store";
import { RendererStore } from "../../src/stores/renderer_store";
import { MockCanvasRenderingContext2D } from "../setup/canvas.mock";
import {
  activateSheet,
  addDataBarCF,
  addEqualCf,
  addIconCF,
  addRows,
  copy,
  createSheet,
  deleteColumns,
  paste,
  redo,
  renameSheet,
  resizeColumns,
  setCellContent,
  setFormat,
  setStyle,
  setViewportOffset,
  setZoneBorders,
  undo,
} from "../test_helpers/commands_helpers";
import { setGrid, toRangesData } from "../test_helpers/helpers";
import { MockGridRenderingContext } from "../test_helpers/renderer_helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

let boxesOfLastRender: Box[] = [];
let model: Model;
let drawGrid: Function;
let gridRenderer: GridRenderer;
let rendererStore: RendererStore;
let animationFrameCallback: Function;
let spyRequestAnimationFrame: jest.SpyInstance;

function getBoxFromXc(xc: string): Box {
  return boxesOfLastRender.find((b) => b.id === xc)!;
}

const originalEasingFns: Record<string, keyof typeof EASING_FN> = {};
beforeAll(() => {
  // Make all animation linear for easier testing
  for (const item of cellAnimationRegistry.getAll()) {
    originalEasingFns[item.id] = item.easingFn;
    item.easingFn = "linear";
  }
});

afterAll(() => {
  for (const item of cellAnimationRegistry.getAll()) {
    item.easingFn = originalEasingFns[item.id];
  }
});

beforeEach(() => {
  model = new Model();
  const { container, store: gridRendererStore } = makeStoreWithModel(model, GridRenderer);
  rendererStore = container.get(RendererStore);
  jest
    .spyOn(MockCanvasRenderingContext2D.prototype, "measureText")
    .mockImplementation((text: string) => ({
      width: text.length,
      fontBoundingBoxAscent: 1,
      fontBoundingBoxDescent: 1,
    }));

  const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
  drawGrid = () => rendererStore.draw(ctx);
  gridRenderer = gridRendererStore;

  jest // @ts-expect-error
    .spyOn(gridRendererStore, "drawBackground") // @ts-expect-error
    .mockImplementation((ctx: GridRenderingContext, boxes: Box[]) => {
      boxesOfLastRender = boxes;
    });

  spyRequestAnimationFrame = jest
    .spyOn(window, "requestAnimationFrame")
    .mockImplementation((callback) => {
      animationFrameCallback = callback;
      return 1;
    });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Grid renderer animations", () => {
  test("Animation frames are requested at the start of an animation, and stopped at the end of the animation", () => {
    const spyCancelAnimationFrame = jest.spyOn(window, "cancelAnimationFrame");
    setCellContent(model, "A2", "=A1");
    drawGrid();
    setCellContent(model, "A1", "2");
    drawGrid();

    expect(spyRequestAnimationFrame).toHaveBeenCalled();
    expect(gridRenderer["animations"].size).toEqual(1);
    animationFrameCallback(0);
    animationFrameCallback(CELL_ANIMATION_DURATION);
    expect(spyCancelAnimationFrame).toHaveBeenCalled();
    expect(gridRenderer["animations"].size).toEqual(0);
  });

  test("Animations are not run on updated cells", () => {
    drawGrid();
    setCellContent(model, "A2", "58");
    drawGrid();
    expect(spyRequestAnimationFrame).not.toHaveBeenCalled();
  });

  test("When changing sheet, animations are cancelled and no new animations are run for the new sheet", () => {
    const spyCancelAnimationFrame = jest.spyOn(window, "cancelAnimationFrame");
    createSheet(model, { sheetId: "sh2" });
    setCellContent(model, "A1", "22", "sh2");
    setCellContent(model, "A2", "=A1");
    drawGrid();
    setCellContent(model, "A1", "2");
    drawGrid();

    expect(gridRenderer["animations"].size).toEqual(1);

    activateSheet(model, "sh2");
    drawGrid();
    expect(spyCancelAnimationFrame).toHaveBeenCalled();
    expect(gridRenderer["animations"].size).toEqual(0);
  });

  test("Animations are not run the on copy/paste zone ", () => {
    const sheetId = model.getters.getActiveSheetId();
    const style = { fillColor: "#ff0f0f" };
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: { rule: { type: "CellIsRule", operator: "isEmpty", values: [], style }, id: "11" },
      ranges: toRangesData(sheetId, "A1:A3"),
      sheetId,
    });
    setCellContent(model, "A3", "2");
    setCellContent(model, "D8", "=SUM(B1:B3)");
    drawGrid();

    copy(model, "A1:A3");
    paste(model, "B1");
    drawGrid();
    animationFrameCallback(0);

    expect(gridRenderer["animations"].size).toEqual(1);
    expect(getBoxFromXc("D8-text-slide-in")).toBeDefined();
  });

  test("Animations are not canceled on unrelated model update", () => {
    setCellContent(model, "A2", "=A1");
    drawGrid();
    setCellContent(model, "A1", "2");
    drawGrid();
    expect(gridRenderer["animations"].size).toEqual(1);

    renameSheet(model, model.getters.getActiveSheetId(), "newName");
    setCellContent(model, "B12", "2");
    drawGrid();
    expect(gridRenderer["animations"].size).toEqual(1);
  });

  test("Animations are correctly updated on scroll", () => {
    setGrid(model, { A1: "hi", B2: "=A1" });
    drawGrid();
    setCellContent(model, "A1", "hello");
    drawGrid();
    animationFrameCallback(0);
    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("B2-text-slide-in")).toMatchObject({
      x: DEFAULT_CELL_WIDTH,
      y: DEFAULT_CELL_HEIGHT - DEFAULT_CELL_HEIGHT / 2,
    });

    setViewportOffset(model, DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT);
    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("B2-text-slide-in")).toMatchObject({
      x: 0,
      y: -DEFAULT_CELL_HEIGHT / 2,
    });
  });

  test("Animations are run on undo/redo", () => {
    setCellContent(model, "A2", "Hello");
    drawGrid();
    expect(gridRenderer["animations"].size).toEqual(0);

    undo(model);
    drawGrid();
    expect(gridRenderer["animations"].size).toEqual(1);
    animationFrameCallback(0);
    animationFrameCallback(CELL_ANIMATION_DURATION);
    expect(gridRenderer["animations"].size).toEqual(0);

    redo(model);
    drawGrid();
    expect(gridRenderer["animations"].size).toEqual(1);
  });

  test("Animations are cancelled on add/remove columns", () => {
    const spyCancelAnimationFrame = jest.spyOn(window, "cancelAnimationFrame");

    setCellContent(model, "A2", "=A1");
    drawGrid();
    setCellContent(model, "A1", "2");
    drawGrid();
    expect(gridRenderer["animations"].size).toEqual(1);

    addRows(model, "before", 0, 1);
    drawGrid();
    expect(spyCancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(gridRenderer["animations"].size).toEqual(0);

    setCellContent(model, "A2", "5");
    drawGrid();
    expect(gridRenderer["animations"].size).toEqual(1);

    deleteColumns(model, ["E"]);
    drawGrid();
    expect(spyCancelAnimationFrame).toHaveBeenCalledTimes(2);
    expect(gridRenderer["animations"].size).toEqual(0);
  });

  test("Animations are replaced if the cell content changes again", () => {
    setCellContent(model, "A2", "=A1");
    drawGrid();

    setCellContent(model, "A1", "hello");
    drawGrid();
    animationFrameCallback(0);
    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("A2-text-slide-in")).toMatchObject({ content: { textLines: ["hello"] } });
    expect(getBoxFromXc("A2-text-slide-out")).toMatchObject({ content: { textLines: ["0"] } });

    setCellContent(model, "A1", "world");
    drawGrid();
    expect(getBoxFromXc("A2-text-slide-in")).toMatchObject({ content: { textLines: ["world"] } });
    expect(getBoxFromXc("A2-text-slide-out")).toMatchObject({ content: { textLines: ["hello"] } });
  });

  test("Star format does not trigger animations on resize", () => {
    setCellContent(model, "A1", "5");
    setFormat(model, "A1", "0* ");
    drawGrid();

    expect(gridRenderer["animations"].size).toEqual(0);
    resizeColumns(model, ["A"], 200);
    drawGrid();
    expect(gridRenderer["animations"].size).toEqual(0);

    undo(model);
    drawGrid();
    expect(gridRenderer["animations"].size).toEqual(0);

    redo(model);
    drawGrid();
    expect(gridRenderer["animations"].size).toEqual(0);
  });
});

describe("Individual animation tests", () => {
  test("Can animate a text fading in", async () => {
    setCellContent(model, "A2", "=MUNIT(A1)");
    drawGrid();

    setCellContent(model, "A1", "2");
    drawGrid();
    expect(getBoxFromXc("A3").textOpacity ?? 1).toBe(0);

    animationFrameCallback(0);
    expect(getBoxFromXc("A3").textOpacity ?? 1).toBe(0);

    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("A3").textOpacity ?? 1).toBe(0.5);

    animationFrameCallback(CELL_ANIMATION_DURATION);
    expect(getBoxFromXc("A3").textOpacity ?? 1).toBe(1);
  });

  test("Can animate a text fading out", () => {
    setGrid(model, { A1: "2", A2: "=MUNIT(A1)" });
    drawGrid();

    setCellContent(model, "A1", "1");
    drawGrid();

    expect(getBoxFromXc("A3")).toMatchObject({ textOpacity: 1, content: { textLines: ["0"] } });

    animationFrameCallback(0);
    expect(getBoxFromXc("A3")).toMatchObject({ textOpacity: 1, content: { textLines: ["0"] } });

    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("A3")).toMatchObject({ textOpacity: 0.5, content: { textLines: ["0"] } });

    animationFrameCallback(CELL_ANIMATION_DURATION);
    expect(getBoxFromXc("A3").content).toBe(undefined);
  });

  test("Text fading out has the correct clipRect", () => {
    resizeColumns(model, ["A"], 10);
    setGrid(model, { A1: "TRUE", A2: '=IF(A1, "very long string that is clipped", "")', B2: "a" });
    drawGrid();

    expect(getBoxFromXc("A2").clipRect).toEqual({
      width: 10,
      x: 0,
      y: DEFAULT_CELL_HEIGHT,
      height: DEFAULT_CELL_HEIGHT,
    });
    setCellContent(model, "A1", "FALSE");
    drawGrid();
    animationFrameCallback(0);
    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("A2").clipRect).toEqual({
      width: 10,
      x: 0,
      y: DEFAULT_CELL_HEIGHT,
      height: DEFAULT_CELL_HEIGHT,
    });
  });

  test("Can animate a text changing", () => {
    setCellContent(model, "A2", "=A1");
    setCellContent(model, "A1", "oldText");
    drawGrid();

    setCellContent(model, "A1", "newText");
    drawGrid();
    const a2Box = getBoxFromXc("A2");
    const originalContentY = a2Box.y + DEFAULT_CELL_HEIGHT - 13 - MIN_CELL_TEXT_MARGIN + 1; // 13: text height, 1: to avoid borders
    expect(a2Box.content).toEqual(undefined);
    expect(getBoxFromXc("A2-text-slide-in")).toMatchObject({
      content: { textLines: ["newText"], y: originalContentY - DEFAULT_CELL_HEIGHT },
      x: 0,
      y: a2Box.y - DEFAULT_CELL_HEIGHT,
      width: DEFAULT_CELL_WIDTH,
      height: DEFAULT_CELL_HEIGHT,
      style: { hideGridLines: true },
    });
    expect(getBoxFromXc("A2-text-slide-out")).toMatchObject({
      content: { textLines: ["oldText"], y: originalContentY },
      x: 0,
      y: a2Box.y,
      width: DEFAULT_CELL_WIDTH,
      height: DEFAULT_CELL_HEIGHT,
      style: { hideGridLines: true },
    });

    animationFrameCallback(0);
    expect(getBoxFromXc("A2-text-slide-in").y).toEqual(a2Box.y - DEFAULT_CELL_HEIGHT);
    expect(getBoxFromXc("A2-text-slide-out").y).toEqual(a2Box.y);
    expect(getBoxFromXc("A2-text-slide-in").content?.y).toEqual(
      originalContentY - DEFAULT_CELL_HEIGHT
    );
    expect(getBoxFromXc("A2-text-slide-out").content?.y).toEqual(originalContentY);

    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("A2-text-slide-in").y).toEqual(a2Box.y - DEFAULT_CELL_HEIGHT / 2);
    expect(getBoxFromXc("A2-text-slide-out").y).toEqual(a2Box.y + DEFAULT_CELL_HEIGHT / 2);
    expect(getBoxFromXc("A2-text-slide-in").content?.y).toEqual(
      originalContentY - DEFAULT_CELL_HEIGHT / 2
    );
    expect(getBoxFromXc("A2-text-slide-out").content?.y).toEqual(
      originalContentY + DEFAULT_CELL_HEIGHT / 2
    );

    animationFrameCallback(CELL_ANIMATION_DURATION);
    expect(getBoxFromXc("A2")).toMatchObject({ content: { textLines: ["newText"] } });
    expect(getBoxFromXc("A2-text-slide-in")).toBe(undefined);
    expect(getBoxFromXc("A2-text-slide-out")).toBe(undefined);
  });

  test("Text change animation has a correct clipRect", () => {
    resizeColumns(model, ["B"], 10);
    setGrid(model, { B2: "=A1" });
    drawGrid();
    const longText = "Very long text that is clipped";
    setCellContent(model, "A1", longText);
    drawGrid();
    animationFrameCallback(0);

    // For the sliding animation, even if the original box isn't clipped we still need to clip the texts of the animation
    // to make one appear and the other one disappear. The y/height should be the box y/height, and the width/x should be
    // larger than the text so it doesn't get clipped
    const getClipRectForText = (text: string) => ({
      width: 10 + 2 * (text.length + MIN_CELL_TEXT_MARGIN),
      x: DEFAULT_CELL_WIDTH - (text.length + MIN_CELL_TEXT_MARGIN),
      y: DEFAULT_CELL_HEIGHT,
      height: DEFAULT_CELL_HEIGHT,
    });

    // Text don't need to be clipped; we still need to clip the Y/height for the animation.
    expect(getBoxFromXc("B2-text-slide-in").clipRect).toMatchObject(getClipRectForText(longText));
    expect(getBoxFromXc("B2-text-slide-out").clipRect).toMatchObject(getClipRectForText("0"));
    animationFrameCallback(CELL_ANIMATION_DURATION);

    setCellContent(model, "C2", "blocking text");
    drawGrid();
    const clipRectOfLongText = getBoxFromXc("B2").clipRect!;
    expect(clipRectOfLongText).toBeDefined();

    setCellContent(model, "A1", "small");
    drawGrid();
    animationFrameCallback(0);

    // Text was clipped, but don't need to be clipped anymore
    expect(getBoxFromXc("B2-text-slide-in").clipRect).toMatchObject(getClipRectForText("small"));
    expect(getBoxFromXc("B2-text-slide-out").clipRect).toMatchObject(clipRectOfLongText);
    animationFrameCallback(CELL_ANIMATION_DURATION);

    setCellContent(model, "A1", longText);
    drawGrid();
    animationFrameCallback(0);

    // Text wasn't clipped, but need to be clipped now
    expect(getBoxFromXc("B2-text-slide-in").clipRect).toMatchObject(clipRectOfLongText);
    expect(getBoxFromXc("B2-text-slide-out").clipRect).toMatchObject(getClipRectForText("small"));
  });

  test("Text change animation boxes have the correct empty icons", () => {
    setGrid(model, { A1: "2", A2: "=A1" });
    addIconCF(model, "A2", ["3", "7"], "arrows");
    drawGrid();
    setCellContent(model, "A1", "1");
    drawGrid();
    animationFrameCallback(0);

    const a2Box = getBoxFromXc("A2");
    expect(a2Box.icons.left).toBeDefined();

    // We want the icons in the box (for text positioning) but don't want the actual svg/components to be rendered
    const emptyIcon = { ...a2Box.icons.left, svg: undefined, component: undefined };
    expect(getBoxFromXc("A2-text-slide-in").icons.left).toEqual(emptyIcon);
    expect(getBoxFromXc("A2-text-slide-out").icons.left).toEqual(emptyIcon);
  });

  test("Can animate a background color change", () => {
    addEqualCf(model, "A1", { fillColor: "#0000FF" }, "15");
    setCellContent(model, "A1", "=A2");
    drawGrid();

    setCellContent(model, "A2", "15");
    drawGrid();
    expect(getBoxFromXc("A1").style.fillColor).toEqual("#FFFFFF");

    animationFrameCallback(0);
    expect(getBoxFromXc("A1").style.fillColor).toEqual("#FFFFFF");

    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("A1").style.fillColor).toEqual("#8080FF");

    animationFrameCallback(CELL_ANIMATION_DURATION);
    expect(getBoxFromXc("A1").style.fillColor).toEqual("#0000FF");
  });

  test("Can animate both a text fading out and a background color change at the same time", () => {
    addEqualCf(model, "B3", { fillColor: "#0000FF" }, "1");
    setGrid(model, { A1: "2", A2: "=MUNIT(A1)" });
    setStyle(model, "B3", { textColor: "#FF00FF" });

    drawGrid();
    expect(getBoxFromXc("B3").style).toMatchObject({ fillColor: "#0000FF", textColor: "#FF00FF" });

    setCellContent(model, "A1", "1");
    drawGrid();
    expect(getBoxFromXc("B3").style).toMatchObject({ fillColor: "#0000FF", textColor: "#FF00FF" });
    expect(getBoxFromXc("B3").textOpacity).toEqual(1);
    expect(getBoxFromXc("B3").content).toMatchObject({ textLines: ["1"] });

    animationFrameCallback(0);
    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("B3").style).toMatchObject({ fillColor: "#8080FF", textColor: "#FF00FF" });
    expect(getBoxFromXc("B3").textOpacity).toEqual(0.5);
    expect(getBoxFromXc("B3").content).toMatchObject({ textLines: ["1"] });

    animationFrameCallback(CELL_ANIMATION_DURATION);
    expect(getBoxFromXc("B3").style).toEqual({ textColor: "#FF00FF" });
    expect(getBoxFromXc("B3").content).toBe(undefined);
  });

  test("Can animate a text color change", () => {
    addEqualCf(model, "A1", { textColor: "#0000FF" }, "15");
    setCellContent(model, "A1", "=A2");
    drawGrid();

    setCellContent(model, "A2", "15");
    drawGrid();
    expect(getBoxFromXc("A1").style.textColor).toEqual("#000000");

    animationFrameCallback(0);
    expect(getBoxFromXc("A1").style.textColor).toEqual("#000000");

    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("A1").style.textColor).toEqual("#000080");

    animationFrameCallback(CELL_ANIMATION_DURATION);
    expect(getBoxFromXc("A1").style.textColor).toEqual("#0000FF");
  });

  test("Can animate a border fading in", () => {
    drawGrid();
    expect(getBoxFromXc("A3").border).toEqual(undefined);
    setZoneBorders(model, { ...DEFAULT_BORDER_DESC, position: "top" }, ["A3"]);
    drawGrid();
    expect(getBoxFromXc("A3").border).toEqual({
      top: { ...DEFAULT_BORDER_DESC, opacity: 0 },
    });

    animationFrameCallback(0);
    expect(getBoxFromXc("A3").border).toEqual({
      top: { ...DEFAULT_BORDER_DESC, opacity: 0 },
    });

    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("A3").border).toEqual({
      top: { ...DEFAULT_BORDER_DESC, opacity: 0.5 },
    });

    animationFrameCallback(CELL_ANIMATION_DURATION);
    expect(getBoxFromXc("A3").border).toEqual({
      top: { ...DEFAULT_BORDER_DESC, opacity: undefined },
    });
  });

  test("Can animate a border fading out", () => {
    setZoneBorders(model, { ...DEFAULT_BORDER_DESC, position: "top" }, ["A3"]);
    drawGrid();
    expect(getBoxFromXc("A3").border).toEqual({
      top: DEFAULT_BORDER_DESC,
    });

    setZoneBorders(model, { position: "clear" }, ["A3"]);
    drawGrid();
    expect(getBoxFromXc("A3").border).toEqual({
      top: { ...DEFAULT_BORDER_DESC, opacity: 1 },
    });

    animationFrameCallback(0);
    expect(getBoxFromXc("A3").border).toEqual({
      top: { ...DEFAULT_BORDER_DESC, opacity: 1 },
    });

    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("A3").border).toEqual({
      top: { ...DEFAULT_BORDER_DESC, opacity: 0.5 },
    });

    animationFrameCallback(CELL_ANIMATION_DURATION);
    expect(getBoxFromXc("A3").border).toEqual(undefined);
  });

  test("Can animate a border changing color", () => {
    setZoneBorders(model, { ...DEFAULT_BORDER_DESC, position: "top" }, ["B2"]);
    drawGrid();
    expect(getBoxFromXc("B2").border).toEqual({
      top: { ...DEFAULT_BORDER_DESC, color: "#000000" },
    });

    setZoneBorders(model, { color: "#346B90", position: "top" }, ["B2"]);
    drawGrid();
    expect(getBoxFromXc("B2").border).toEqual({
      top: { ...DEFAULT_BORDER_DESC, color: "#000000" },
    });

    animationFrameCallback(0);
    expect(getBoxFromXc("B2").border).toEqual({
      top: { ...DEFAULT_BORDER_DESC, color: "#000000" },
    });

    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("B2").border).toEqual({
      top: { ...DEFAULT_BORDER_DESC, color: "#1A3648" },
    });

    animationFrameCallback(CELL_ANIMATION_DURATION);
    expect(getBoxFromXc("B2").border).toEqual({
      top: { ...DEFAULT_BORDER_DESC, color: "#346B90" },
    });
  });

  test("Can animate an icon svg change", () => {
    addIconCF(model, "B3", ["3", "7"], "arrows");
    setGrid(model, { A1: "2", B3: "=A1" });
    drawGrid();
    expect(getBoxFromXc("B3").icons.left?.svg).toEqual(ICONS.arrowBad.svg);

    setCellContent(model, "A1", "8");
    drawGrid();
    const b3Box = getBoxFromXc("B3");
    expect(b3Box.icons.left?.svg).toEqual(undefined);
    expect(getBoxFromXc("B3-icon-left-slide-in")).toMatchObject({
      icons: { left: { svg: ICONS.arrowGood.svg } },
      x: b3Box.x,
      y: b3Box.y - DEFAULT_CELL_HEIGHT,
      width: b3Box.width,
      height: b3Box.height,
    });
    expect(getBoxFromXc("B3-icon-left-slide-out")).toMatchObject({
      icons: { left: { svg: ICONS.arrowBad.svg } },
      x: b3Box.x,
      y: b3Box.y,
      width: b3Box.width,
      height: b3Box.height,
    });

    animationFrameCallback(0);
    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("B3-icon-left-slide-in").y).toEqual(b3Box.y - DEFAULT_CELL_HEIGHT / 2);
    expect(getBoxFromXc("B3-icon-left-slide-out").y).toEqual(b3Box.y + DEFAULT_CELL_HEIGHT / 2);

    animationFrameCallback(CELL_ANIMATION_DURATION);
    expect(getBoxFromXc("B3")).toMatchObject({ icons: { left: { svg: ICONS.arrowGood.svg } } });
    expect(getBoxFromXc("B3-icon-left-slide-in")).toBe(undefined);
    expect(getBoxFromXc("B3-icon-left-slide-out")).toBe(undefined);
  });

  test("Icon appearing without text change trigger a text sliding animation containing the icon", () => {
    setGrid(model, { B3: "8" });
    addIconCF(model, "B3", ["3", "7"], "arrows");
    undo(model);
    drawGrid();
    expect(getBoxFromXc("B3").icons.left?.svg).toEqual(undefined);

    redo(model);
    drawGrid();

    animationFrameCallback(0);
    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    const b3Box = getBoxFromXc("B3");
    expect(b3Box.icons.left?.svg).toEqual(undefined);
    expect(getBoxFromXc("B3-text-slide-in")).toMatchObject({
      icons: { left: { svg: ICONS.arrowGood.svg, clipRect: model.getters.getRect(toZone("B3")) } },
      content: { textLines: ["8"] },
      y: b3Box.y - DEFAULT_CELL_HEIGHT / 2,
    });
    expect(getBoxFromXc("B3-text-slide-out")).toMatchObject({
      icons: { left: undefined },
      content: { textLines: ["8"] },
      y: b3Box.y + DEFAULT_CELL_HEIGHT / 2,
    });
    expect(getBoxFromXc("B3-icon-left-slide-in")).toBe(undefined);
    expect(getBoxFromXc("B3-icon-left-slide-out")).toBe(undefined);
  });

  test("Both icon and text appearing at once triggers a fade in animation", () => {
    setGrid(model, { A1: '=""', B3: "=A1" });
    addIconCF(model, "B3", ["3", "7"], "arrows");
    drawGrid();
    expect(getBoxFromXc("B3").icons.left?.svg).toEqual(undefined);

    setCellContent(model, "A1", "8");
    drawGrid();

    animationFrameCallback(0);
    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("B3")).toMatchObject({
      icons: { left: { opacity: 0.5 } },
      textOpacity: 0.5,
    });
    expect(getBoxFromXc("B3-text-slide-in")).toBe(undefined);
    expect(getBoxFromXc("B3-text-slide-out")).toBe(undefined);
  });

  test("Icon disappearing with text staying triggers a text sliding animation containing the icon", () => {
    setGrid(model, { A1: "9", B3: "=A1" });
    addIconCF(model, "B3", ["3", "7"], "arrows");
    drawGrid();
    expect(getBoxFromXc("B3").icons.left?.svg).toEqual(ICONS.arrowGood.svg);

    undo(model);
    drawGrid();

    animationFrameCallback(0);
    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    const b3Box = getBoxFromXc("B3");
    expect(b3Box.icons.left?.svg).toEqual(undefined);
    expect(getBoxFromXc("B3-text-slide-in")).toMatchObject({
      icons: { left: undefined },
      content: { textLines: ["9"] },
      y: b3Box.y - DEFAULT_CELL_HEIGHT / 2,
    });
    expect(getBoxFromXc("B3-text-slide-out")).toMatchObject({
      icons: { left: { svg: ICONS.arrowGood.svg, clipRect: model.getters.getRect(toZone("B3")) } },
      content: { textLines: ["9"] },
      y: b3Box.y + DEFAULT_CELL_HEIGHT / 2,
    });
    expect(getBoxFromXc("B3-icon-left-slide-in")).toBe(undefined);
    expect(getBoxFromXc("B3-icon-left-slide-out")).toBe(undefined);
  });

  test("Icon and text both disappearing at once triggers a fade out animation", () => {
    setGrid(model, { A1: "9", B3: "=A1" });
    addIconCF(model, "B3", ["3", "7"], "arrows");
    drawGrid();
    expect(getBoxFromXc("B3").icons.left?.svg).toEqual(ICONS.arrowGood.svg);

    setCellContent(model, "A1", '=""');
    drawGrid();

    animationFrameCallback(0);
    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("B3")).toMatchObject({
      icons: { left: { opacity: 0.5 } },
      textOpacity: 0.5,
    });
    expect(getBoxFromXc("B3-text-slide-in")).toBe(undefined);
    expect(getBoxFromXc("B3-text-slide-out")).toBe(undefined);
  });

  test("Can animate a data bar change", () => {
    addDataBarCF(model, "B1:B2", "#00FF00");
    setGrid(model, { A1: "5", B1: "=A1", B2: "10" });
    drawGrid();
    expect(getBoxFromXc("B1").dataBarFill).toMatchObject({ color: "#00FF00", percentage: 50 });

    setCellContent(model, "A1", "10");
    drawGrid();
    expect(getBoxFromXc("B1").dataBarFill).toMatchObject({ color: "#00FF00", percentage: 50 });

    animationFrameCallback(0);
    expect(getBoxFromXc("B1").dataBarFill).toMatchObject({ color: "#00FF00", percentage: 50 });

    animationFrameCallback(CELL_ANIMATION_DURATION / 2);
    expect(getBoxFromXc("B1").dataBarFill).toMatchObject({ color: "#00FF00", percentage: 75 });

    animationFrameCallback(CELL_ANIMATION_DURATION);
    expect(getBoxFromXc("B1").dataBarFill).toMatchObject({ color: "#00FF00", percentage: 100 });
  });
});
