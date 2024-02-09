import { Model } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, HIGHLIGHT_COLOR } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { HighlightProvider, HighlightStore } from "../../src/stores/highlight_store";
import { Color, Highlight, Rect, RectBorder, UID } from "../../src/types";
import { MockCanvasRenderingContext2D } from "../setup/canvas.mock";
import { MockGridRenderingContext } from "../test_helpers/renderer_helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

let highlightStore: HighlightStore;
let ctx: MockGridRenderingContext;
let ctxInstructions: string[];
let model: Model;
let sheetId: UID;

// Mock drawRectBorders, it will now call a mocked method on the canvas context for easier testing
jest.mock("../../src/helpers/rendering.ts", () => {
  return {
    ...jest.requireActual("../../src/helpers/rendering.ts"),
    drawHighlight() {},
    drawRectBorders(
      canvasContext: MockCanvasRenderingContext2D,
      rect: Rect,
      borders: RectBorder[],
      lineWidth: number,
      color: Color
    ) {
      canvasContext.drawRectBorders(rect, borders, lineWidth, color);
    },
  };
});

function drawHighlight(highlight: Highlight) {
  const provider: HighlightProvider = { highlights: [highlight] };
  highlightStore.register(provider);
  highlightStore.drawLayer(ctx, "Highlights");
}

describe("Highlight store", () => {
  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    ({ store: highlightStore } = makeStoreWithModel(model, HighlightStore));

    ctxInstructions = [];
    ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        ctxInstructions.push(`context.${key}=${JSON.stringify(value)};`);
      },
      onFunctionCall: (key, args) => {
        ctxInstructions.push(`context.${key}(${args.map((a) => JSON.stringify(a)).join(", ")});`);
      },
    });
  });

  test("Can add a highlight provider", () => {
    const testHighlight = { zone: toZone("A1"), sheetId, color: "#FF0000" };
    const provider: HighlightProvider = { highlights: [testHighlight] };
    highlightStore.register(provider);

    highlightStore.drawLayer(ctx, "Highlights");
    expect(ctxInstructions).not.toHaveLength(0);
  });

  test("Can remove a highlight provider", () => {
    const testHighlight = { zone: toZone("A1"), sheetId, color: "#FF0000" };
    const provider: HighlightProvider = { highlights: [testHighlight] };
    highlightStore.register(provider);

    highlightStore.drawLayer(ctx, "Highlights");
    expect(ctxInstructions).not.toHaveLength(0);
    const length = ctxInstructions.length;

    highlightStore.unRegister(provider);
    highlightStore.drawLayer(ctx, "Highlights");
    expect(ctxInstructions).toHaveLength(length);
  });

  test("Highlights are correctly drawn", () => {
    const testHighlight = { zone: toZone("A1"), sheetId };
    drawHighlight(testHighlight);

    const rect = { x: 0, y: 0, width: DEFAULT_CELL_WIDTH, height: DEFAULT_CELL_HEIGHT };
    const rectStr = JSON.stringify(rect);
    expect(ctxInstructions).toContain(
      `context.drawRectBorders(${rectStr}, ["left","top","right","bottom"], 2, "${HIGHLIGHT_COLOR}");`
    );
    expect(ctxInstructions).toContain(`context.fillStyle="${HIGHLIGHT_COLOR}1F";`);
    expect(ctxInstructions).toContain(
      `context.fillRect(0, 0, ${DEFAULT_CELL_WIDTH}, ${DEFAULT_CELL_HEIGHT});`
    );
  });

  test("Can change highlight color", () => {
    const testHighlight = { zone: toZone("A1"), sheetId, color: "#FF0000" };
    drawHighlight(testHighlight);

    expect(ctxInstructions.join()).toContain("#FF0000");
    expect(ctxInstructions).toContain('context.fillStyle="#FF00001F";');
  });

  test("Can draw highlights without fill", () => {
    const testHighlight = { zone: toZone("A1"), sheetId, color: "#FF0000", noFill: true };
    drawHighlight(testHighlight);

    expect(ctxInstructions).not.toContain('context.fillStyle="#FF00001F";');
    expect(ctxInstructions).not.toContain(
      `context.fillRect(0, 0, ${DEFAULT_CELL_WIDTH}, ${DEFAULT_CELL_HEIGHT})`
    );
  });

  test("Can change highlights fill color transparency", () => {
    const testHighlight = { zone: toZone("A1"), sheetId, color: "#FF0000", fillAlpha: 0.5 };
    drawHighlight(testHighlight);

    expect(ctxInstructions).toContain('context.fillStyle="#FF000080";');
  });
});
