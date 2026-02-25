import { Model } from "../../src";
import { getSpreadsheetTheme } from "../../src/helpers/rendering";
import { GridRenderer } from "../../src/stores/grid_renderer_store";
import { RendererStore } from "../../src/stores/renderer_store";
import { GridRenderingContext, Viewport } from "../../src/types";
import { setCellContent, setStyle, setZoneBorders } from "../test_helpers/commands_helpers";
import { createEqualCF, toRangesData } from "../test_helpers/helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

function setRenderer(model: Model = new Model()) {
  const { container, store: gridRendererStore } = makeStoreWithModel(model, GridRenderer);
  const rendererManager = container.get(RendererStore);
  const drawGridRenderer = (ctx: GridRenderingContext) => {
    rendererManager.draw(ctx);
  };
  return { model, gridRendererStore, drawGridRenderer, container };
}

class MockGridRenderingContextWithDarkMode implements GridRenderingContext {
  _context = document.createElement("canvas").getContext("2d")!;
  ctx: CanvasRenderingContext2D = new Proxy({ font: "" } as any, {
    get: (target, key) => {
      if (key in target) {
        return target[key];
      }
      return (...args: any[]) => {};
    },
    set: (target, key, val) => {
      target[key] = val;
      return true;
    },
  }) as any;
  viewport: Viewport;
  dpr = 1;
  thinLineWidth = 0.4;
  theme: any;

  constructor(model: Model, isDarkMode: boolean) {
    this.viewport = { left: 0, right: 0, top: 0, bottom: 0 } as any;
    this.theme = getSpreadsheetTheme(isDarkMode);
  }
}

describe("Grid features dark mode tests", () => {
  test("Cell Background (fillColor) is adapted in dark mode", () => {
    const model = new Model({}, { colorScheme: "dark" });
    const { drawGridRenderer } = setRenderer(model);
    const CUSTOM_COLOR = "#FF0000";
    setStyle(model, "A1", { fillColor: CUSTOM_COLOR });

    const ctx = new MockGridRenderingContextWithDarkMode(model, true);
    const adaptSpy = jest.spyOn(model.getters as any, "getAdaptedColor"); // ANHE : other way than as any ?

    drawGridRenderer(ctx);

    expect(adaptSpy).toHaveBeenCalledWith(CUSTOM_COLOR);
  });

  test("Cell Text Color is adapted in dark mode", () => {
    const model = new Model({}, { colorScheme: "dark" });
    const { drawGridRenderer } = setRenderer(model);
    const CUSTOM_COLOR = "#0000FF"; // Blue
    setStyle(model, "A1", { textColor: CUSTOM_COLOR });
    setCellContent(model, "A1", "Hello");

    const ctx = new MockGridRenderingContextWithDarkMode(model, true);
    const adaptSpy = jest.spyOn(model.getters as any, "getAdaptedColor");

    drawGridRenderer(ctx);

    expect(adaptSpy).toHaveBeenCalledWith(CUSTOM_COLOR);
  });

  test("Cell Borders are adapted in dark mode", () => {
    const model = new Model({}, { colorScheme: "dark" });
    const { drawGridRenderer } = setRenderer(model);
    const CUSTOM_COLOR = "#00FF00"; // Green
    setZoneBorders(model, { position: "top", color: CUSTOM_COLOR, style: "thin" }, ["A1"]);

    const ctx = new MockGridRenderingContextWithDarkMode(model, true);
    const adaptSpy = jest.spyOn(model.getters as any, "getAdaptedColor");

    drawGridRenderer(ctx);

    expect(adaptSpy).toHaveBeenCalledWith(CUSTOM_COLOR);
  });

  test("Conditional Formatting: Background color is adapted in dark mode", () => {
    const model = new Model({}, { colorScheme: "dark" });
    const { drawGridRenderer } = setRenderer(model);
    const CUSTOM_COLOR = "#FFFF00"; // Yellow
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: CUSTOM_COLOR }, "1"),
      sheetId,
      ranges: toRangesData(sheetId, "A1"),
    });
    setCellContent(model, "A1", "1");

    const ctx = new MockGridRenderingContextWithDarkMode(model, true);
    const adaptSpy = jest.spyOn(model.getters as any, "getAdaptedColor");

    drawGridRenderer(ctx);

    expect(adaptSpy).toHaveBeenCalledWith(CUSTOM_COLOR);
  });

  test("Conditional Formatting: Data Bar color is adapted in dark mode", () => {
    const model = new Model({}, { colorScheme: "dark" });
    const { drawGridRenderer } = setRenderer(model);
    const CUSTOM_COLOR = "#FF00FF"; // Magenta
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "DataBarRule",
          color: colorToNumber(CUSTOM_COLOR),
          min: { type: "number", value: "0" },
          max: { type: "number", value: "10" },
        } as any,
      },
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    setCellContent(model, "A1", "5");

    const ctx = new MockGridRenderingContextWithDarkMode(model, true);
    const adaptSpy = jest.spyOn(model.getters as any, "getAdaptedColor");

    drawGridRenderer(ctx);

    expect(adaptSpy).toHaveBeenCalledWith(CUSTOM_COLOR);
  });

  test("Data Validation: Chip colors are adapted in dark mode", () => {
    const model = new Model({}, { colorScheme: "dark" });
    const { drawGridRenderer } = setRenderer(model);
    const CUSTOM_COLOR = "#00FFFF"; // Cyan
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_DATA_VALIDATION_RULE", {
      sheetId,
      ranges: toRangesData(sheetId, "A1"),
      rule: {
        id: "rule-1",
        criterion: {
          type: "isValueInList",
          values: ["test"],
          displayStyle: "chip",
          colors: { test: CUSTOM_COLOR },
        },
      } as any,
    });
    setCellContent(model, "A1", "test");

    const ctx = new MockGridRenderingContextWithDarkMode(model, true);
    const adaptSpy = jest.spyOn(model.getters as any, "getAdaptedColor");

    drawGridRenderer(ctx);

    expect(adaptSpy).toHaveBeenCalledWith(CUSTOM_COLOR);
  });

  test("Icons are adapted in dark mode", () => {
    const model = new Model({}, { colorScheme: "dark" });
    const { drawGridRenderer } = setRenderer(model);

    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "IconSetRule",
          upperInflectionPoint: { type: "number", value: "10", operator: "gt" },
          lowerInflectionPoint: { type: "number", value: "0", operator: "gt" },
          icons: { upper: "arrowGood", middle: "arrowNeutral", lower: "arrowBad" },
        } as any,
      },
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    setCellContent(model, "A1", "15");

    const ctx = new MockGridRenderingContextWithDarkMode(model, true);
    const adaptSpy = jest.spyOn(model.getters as any, "getAdaptedColor");

    drawGridRenderer(ctx);

    expect(adaptSpy).toHaveBeenCalledWith("#6AA84F");
  });
});

function colorToNumber(color: string): number {
  return parseInt(color.slice(1), 16);
}
