import { Highlight } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, HIGHLIGHT_COLOR } from "../../src/constants";
import { HighlightPlugin, HighlightProvider } from "../../src/owl_plugins/highlight_plugin";
import { RendererPlugin } from "../../src/owl_plugins/renderer_plugin";

import { Model } from "../../src";
import { toZone } from "../../src/helpers/zones";
import { ViewportsStore } from "../../src/stores/viewports_store";
import { merge } from "../test_helpers";
import { makeOwlPluginManager } from "../test_helpers/owl_plugins_helpers";
import { MockGridRenderingContext } from "../test_helpers/renderer_helpers";

function setupHighlightPlugin() {
  const model = new Model();
  const sheetId = model.getters.getActiveSheetId();
  const { container, getPlugin } = makeOwlPluginManager([], { model });
  const highlightPlugin = getPlugin(HighlightPlugin);

  const ctxInstructions: string[] = [];
  const ctx = new MockGridRenderingContext(model, container, 1000, 1000, {
    onSet: (key, value) => {
      ctxInstructions.push(`context.${key}=${JSON.stringify(value)};`);
    },
    onFunctionCall: (key, args) => {
      ctxInstructions.push(`context.${key}(${args.map((a) => JSON.stringify(a)).join(", ")})`);
    },
  });

  const drawHighlight = (highlight: Highlight) => {
    const provider: HighlightProvider = { highlights: [highlight] };
    highlightPlugin.register(provider);
    highlightPlugin.drawLayer(ctx, "Highlights");
  };

  return {
    model,
    sheetId,
    highlightPlugin,
    ctx,
    ctxInstructions,
    drawHighlight,
    getPlugin,
    container,
  };
}

describe("Highlight plugin", () => {
  test("Can add a highlight provider", () => {
    const { model, sheetId, highlightPlugin, ctx, ctxInstructions } = setupHighlightPlugin();
    const testHighlight = {
      range: model.getters.getRangeFromZone(sheetId, toZone("A1")),
      color: "#FF0000",
    };
    const provider: HighlightProvider = { highlights: [testHighlight] };
    highlightPlugin.register(provider);

    highlightPlugin.drawLayer(ctx, "Highlights");
    expect(ctxInstructions).not.toHaveLength(0);
  });

  test("Can remove a highlight provider", () => {
    const { model, sheetId, highlightPlugin, ctx, ctxInstructions } = setupHighlightPlugin();
    const testHighlight = {
      range: model.getters.getRangeFromZone(sheetId, toZone("A1")),
      color: "#FF0000",
    };
    const provider: HighlightProvider = { highlights: [testHighlight] };
    highlightPlugin.register(provider);

    highlightPlugin.drawLayer(ctx, "Highlights");
    expect(ctxInstructions).not.toHaveLength(0);
    const length = ctxInstructions.length;

    highlightPlugin.unRegister(provider);
    highlightPlugin.drawLayer(ctx, "Highlights");
    expect(ctxInstructions).toHaveLength(length);
  });

  test("Highlights are correctly drawn", () => {
    const { model, sheetId, ctxInstructions, drawHighlight } = setupHighlightPlugin();
    const testHighlight = {
      range: model.getters.getRangeFromZone(sheetId, toZone("A1")),
      color: HIGHLIGHT_COLOR,
    };
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
    const { model, sheetId, ctxInstructions, drawHighlight } = setupHighlightPlugin();
    const testHighlight = {
      range: model.getters.getRangeFromZone(sheetId, toZone("A1")),
      color: "#FF0000",
    };
    drawHighlight(testHighlight);

    expect(ctxInstructions).toContain(`context.strokeStyle="#FF0000";`);
    expect(ctxInstructions).toContain('context.fillStyle="#FF00001F";');
  });

  test("Can change highlight line width", () => {
    const { model, sheetId, ctxInstructions, drawHighlight } = setupHighlightPlugin();
    const testHighlight = {
      range: model.getters.getRangeFromZone(sheetId, toZone("A1")),
      color: "#FF0000",
    };
    drawHighlight(testHighlight);
    expect(ctxInstructions).toContain(`context.lineWidth=2;`);

    ctxInstructions.length = 0;
    drawHighlight({ ...testHighlight, thinLine: true });
    expect(ctxInstructions).toContain(`context.lineWidth=1;`);
  });

  test("Can draw highlights without fill", () => {
    const { model, sheetId, ctxInstructions, drawHighlight } = setupHighlightPlugin();
    const testHighlight = {
      range: model.getters.getRangeFromZone(sheetId, toZone("A1")),
      color: "#FF0000",
      noFill: true,
    };
    drawHighlight(testHighlight);

    expect(ctxInstructions).not.toContain('context.fillStyle="#FF00001F";');
    expect(ctxInstructions).not.toContain(
      `context.fillRect(0, 0, ${DEFAULT_CELL_WIDTH}, ${DEFAULT_CELL_HEIGHT})`
    );
  });

  test("Can draw highlights without border", () => {
    const { model, sheetId, ctxInstructions, drawHighlight } = setupHighlightPlugin();
    const testHighlight = {
      range: model.getters.getRangeFromZone(sheetId, toZone("A1")),
      color: "#FF0000",
      noBorder: true,
    };
    drawHighlight(testHighlight);

    expect(ctxInstructions).not.toContain(
      `context.strokeRect(0.5, 0.5, ${DEFAULT_CELL_WIDTH}, ${DEFAULT_CELL_HEIGHT})`
    );
  });

  test("Can change highlights fill color transparency", () => {
    const { model, sheetId, ctxInstructions, drawHighlight } = setupHighlightPlugin();
    const testHighlight = {
      range: model.getters.getRangeFromZone(sheetId, toZone("A1")),
      color: "#FF0000",
      fillAlpha: 0.5,
    };
    drawHighlight(testHighlight);

    expect(ctxInstructions).toContain('context.fillStyle="#FF000080";');
  });

  test("Highlights are drawn through the RendererPlugin", () => {
    const { model, sheetId, highlightPlugin, ctx, ctxInstructions, getPlugin } =
      setupHighlightPlugin();
    const testHighlight = {
      range: model.getters.getRangeFromZone(sheetId, toZone("A1")),
      color: "#FF0000",
    };
    highlightPlugin.register({ highlights: [testHighlight] });

    getPlugin(RendererPlugin).draw(ctx);
    expect(ctxInstructions).toContain(`context.strokeStyle="#FF0000";`);
  });

  test("Highlight on a merge stays visible when its top-left cell is scrolled out", () => {
    const { model, sheetId, highlightPlugin, container } = setupHighlightPlugin();
    merge(model, "A1:C3");
    highlightPlugin.register({
      highlights: [
        { range: model.getters.getRangeFromZone(sheetId, toZone("A1")), color: "#FF0000" },
      ],
    });
    const viewStore = container.get(ViewportsStore);
    viewStore.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH, offsetY: DEFAULT_CELL_HEIGHT });

    expect(highlightPlugin.highlights.map((h) => h.range.zone)).toEqual([toZone("A1:C3")]);
  });

  test("Highlight on a merge stays visible when its top-left cell is scrolled out", () => {
    const { model, sheetId, highlightPlugin, container } = setupHighlightPlugin();
    highlightPlugin.register({
      highlights: [
        { range: model.getters.getRangeFromZone(sheetId, toZone("A1")), color: "#FF0000" },
      ],
    });
    const viewStore = container.get(ViewportsStore);
    viewStore.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH, offsetY: DEFAULT_CELL_HEIGHT });

    expect(highlightPlugin.highlights.map((h) => h.range.zone)).toEqual([]);
  });
});
