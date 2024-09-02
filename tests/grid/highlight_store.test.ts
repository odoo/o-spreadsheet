import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, HIGHLIGHT_COLOR } from "../../src/constants";
import { HighlightProvider, HighlightStore } from "../../src/stores/highlight_store";
import { Highlight, UID } from "../../src/types";

import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { MockGridRenderingContext } from "../test_helpers/renderer_helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

let highlightStore: HighlightStore;
let ctx: MockGridRenderingContext;
let ctxInstructions: string[];
let model: Model;
let sheetId: UID;

function drawHighlight(highlight: Highlight) {
  const provider: HighlightProvider = { highlights: [highlight] };
  highlightStore.register(provider);
  highlightStore.drawLayer(ctx, "Highlights");
}

describe("Highlight store", () => {
  beforeEach(() => {
    model = Model.BuildSync();
    sheetId = model.getters.getActiveSheetId();
    ({ store: highlightStore } = makeStoreWithModel(model, HighlightStore));

    ctxInstructions = [];
    ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        ctxInstructions.push(`context.${key}=${JSON.stringify(value)};`);
      },
      onFunctionCall: (key, args) => {
        ctxInstructions.push(`context.${key}(${args.map((a) => JSON.stringify(a)).join(", ")})`);
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
    const testHighlight = { zone: toZone("A1"), sheetId, color: HIGHLIGHT_COLOR };
    drawHighlight(testHighlight);

    expect(ctxInstructions).toContain(`context.strokeStyle="${HIGHLIGHT_COLOR}";`);
    expect(ctxInstructions).toContain("context.lineWidth=2;");
    // 0.5 offset for sharp lines (compensate 0.5 global offset of drawGridHook )
    expect(ctxInstructions).toContain(
      `context.strokeRect(0.5, 0.5, ${DEFAULT_CELL_WIDTH}, ${DEFAULT_CELL_HEIGHT})`
    );
    expect(ctxInstructions).toContain(`context.fillStyle="${HIGHLIGHT_COLOR}1F";`);
    expect(ctxInstructions).toContain(
      `context.fillRect(0, 0, ${DEFAULT_CELL_WIDTH}, ${DEFAULT_CELL_HEIGHT})`
    );
  });

  test("Can change highlight color", () => {
    const testHighlight = { zone: toZone("A1"), sheetId, color: "#FF0000" };
    drawHighlight(testHighlight);

    expect(ctxInstructions).toContain(`context.strokeStyle="#FF0000";`);
    expect(ctxInstructions).toContain('context.fillStyle="#FF00001F";');
  });

  test("Can change highlight line width", () => {
    const testHighlight = { zone: toZone("A1"), sheetId, color: "#FF0000" };
    drawHighlight(testHighlight);
    expect(ctxInstructions).toContain(`context.lineWidth=2;`);

    ctxInstructions = [];
    drawHighlight({ ...testHighlight, thinLine: true });
    expect(ctxInstructions).toContain(`context.lineWidth=1;`);
  });

  test("Can draw highlights without fill", () => {
    const testHighlight = { zone: toZone("A1"), sheetId, color: "#FF0000", noFill: true };
    drawHighlight(testHighlight);

    expect(ctxInstructions).not.toContain('context.fillStyle="#FF00001F";');
    expect(ctxInstructions).not.toContain(
      `context.fillRect(0, 0, ${DEFAULT_CELL_WIDTH}, ${DEFAULT_CELL_HEIGHT})`
    );
  });

  test("Can draw highlights without border", () => {
    const testHighlight = { zone: toZone("A1"), sheetId, color: "#FF0000", noBorder: true };
    drawHighlight(testHighlight);

    expect(ctxInstructions).not.toContain(
      `context.strokeRect(0.5, 0.5, ${DEFAULT_CELL_WIDTH}, ${DEFAULT_CELL_HEIGHT})`
    );
  });

  test("Can change highlights fill color transparency", () => {
    const testHighlight = { zone: toZone("A1"), sheetId, color: "#FF0000", fillAlpha: 0.5 };
    drawHighlight(testHighlight);

    expect(ctxInstructions).toContain('context.fillStyle="#FF000080";');
  });
});
