import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  MIN_CF_ICON_MARGIN,
} from "../../src/constants";
import { fontSizeMap } from "../../src/fonts";
import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { RendererPlugin } from "../../src/plugins/ui/renderer";
import { Box, GridRenderingContext, Viewport } from "../../src/types";
import { MockCanvasRenderingContext2D } from "../setup/canvas.mock";
import {
  addColumns,
  deleteColumns,
  merge,
  resizeColumns,
  resizeRows,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { createEqualCF, getPlugin, target } from "../test_helpers/helpers";
import { watchClipboardOutline } from "../test_helpers/renderer_helpers";

MockCanvasRenderingContext2D.prototype.measureText = function (text: string) {
  return { width: text.length };
};
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

function getBoxFromText(model: Model, text: string): Box {
  const rendererPlugin = getPlugin(model, RendererPlugin);
  // @ts-ignore
  return (rendererPlugin.boxes as Box[]).find((b) => b.content?.text === text);
}

interface ContextObserver {
  onSet?(key, val): void;
  onGet?(key): void;
  onFunctionCall?(fn: string, args: any[]): void;
}

const MOCK_THIN_LINE_WIDTH = 0.4;

registerFont(join(__dirname, "../helpers/fonts/Roboto-Regular.ttf"), { family: "Roboto" });
registerFont(join(__dirname, "../helpers/fonts/Roboto-Bold.ttf"), {
  family: "Roboto",
  weight: "bold",
});
registerFont(join(__dirname, "../helpers/fonts/Roboto-BoldItalic.ttf"), {
  family: "Roboto",
  weight: "bold",
  style: "italic",
});
registerFont(join(__dirname, "../helpers/fonts/Roboto-Italic.ttf"), {
  family: "Roboto",
  style: "italic",
});

function defaultPixelZone(rangeXC: string): Zone {
  const { top, left, bottom, right } = toZone(rangeXC);
  return {
    top: top * DEFAULT_CELL_HEIGHT,
    bottom: (bottom + 1) * DEFAULT_CELL_HEIGHT,
    left: left * DEFAULT_CELL_WIDTH,
    right: (right + 1) * DEFAULT_CELL_WIDTH,
  };
}

export class ImageGridRenderingContext implements GridRenderingContext {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  dpr = 1;
  thinLineWidth = MOCK_THIN_LINE_WIDTH;
  private canvas: Canvas;

  constructor(model: Model, zone: Zone) {
    const width = zone.right - zone.left + HEADER_WIDTH;
    const height = zone.bottom - zone.top + HEADER_HEIGHT;
    model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: zone.left,
      offsetY: zone.top,
    });
    model.dispatch("RESIZE_VIEWPORT", { width, height });

    this.canvas = createCanvas(width, height);
    this.ctx = this.canvas.getContext("2d");
    this.viewport = model.getters.getActiveViewport();
  }

  screenshot() {
    return this.canvas.toBuffer("image/png");
  }
}

class MockGridRenderingContext implements GridRenderingContext {
  _context = document.createElement("canvas").getContext("2d");
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  dpr = 1;
  thinLineWidth = MOCK_THIN_LINE_WIDTH;

  constructor(model: Model, width: number, height: number, observer: ContextObserver) {
    model.dispatch("RESIZE_VIEWPORT", {
      width: width - HEADER_WIDTH,
      height: height - HEADER_HEIGHT,
    });
    this.viewport = model.getters.getActiveViewport();

    const handler = {
      get: (target, val) => {
        if (val in (this._context as any).__proto__) {
          return (...args) => {
            if (observer.onFunctionCall) {
              observer.onFunctionCall(val, args);
            }
          };
        } else {
          if (observer.onGet) {
            observer.onGet(val);
          }
        }
        return target[val];
      },
      set: (target, key, val) => {
        if (observer.onSet) {
          observer.onSet(key, val);
        }
        target[key] = val;
        return true;
      },
    };
    this.ctx = new Proxy({}, handler);
  }
}

describe("renderer", () => {
  test("snapshot for a simple grid rendering", () => {
    const model = new Model();

    setCellContent(model, "A1", "1");
    const instructions: string[] = [];
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        instructions.push(`context.${key}=${JSON.stringify(value)};`);
      },
      onGet: (key) => {
        instructions.push(`GET:${key}`);
      },
      onFunctionCall: (key, args) => {
        instructions.push(`context.${key}(${args.map((a) => JSON.stringify(a)).join(", ")})`);
      },
    });

    model.drawGrid(ctx);
    expect(instructions).toMatchSnapshot();
  });

  test("formulas evaluating to a string are properly aligned", () => {
    const model = new Model();

    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "=A1");

    let textAligns: string[] = [];
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });

    model.drawGrid(ctx);
    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    textAligns = [];
    setCellContent(model, "A1", "asdf");
    model.drawGrid(ctx);
    expect(textAligns).toEqual(["left", "left", "center"]); // center for headers
  });

  test("Cells evaluating to a number are properly aligned on overflow", () => {
    const model = new Model({
      sheets: [
        {
          id: 1,
          cols: { 0: { size: 5 }, 2: { size: 25 } },
          colNumber: 3,
          cells: {
            A1: { content: "123456" },
            A2: { content: "=A1" },
            C1: { content: "123456" },
            C2: { content: "=C1" },
          },
          conditionalFormats: [
            {
              id: "1",
              ranges: ["C1:C2"],
              rule: {
                type: "IconSetRule",
                upperInflectionPoint: { type: "number", value: "1000", operator: "gt" },
                lowerInflectionPoint: { type: "number", value: "0", operator: "gt" },
                icons: {
                  upper: "arrowGood",
                  middle: "arrowNeutral",
                  lower: "arrowBad",
                },
              },
            },
          ],
        },
      ],
    });

    let textAligns: string[] = [];
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });

    model.drawGrid(ctx);
    expect(textAligns).toEqual(["left", "left", "left", "left", "center"]); // A1-C1-A2-C2 and center for headers

    textAligns = [];
    setCellContent(model, "A1", "1");
    setCellContent(model, "C1", "1");
    model.drawGrid(ctx);
    expect(textAligns).toEqual(["right", "right", "right", "right", "center"]); // A1-C1-A2-C2 and center for headers
  });

  test("fillstyle of cell will be rendered", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 1,
          rowNumber: 3,
        },
      ],
    });
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [toZone("A1")],
      style: { fillColor: "#DC6CDF" },
    });

    let fillStyle: any[] = [];
    let fillStyleColor1Called = false;
    let fillStyleColor2Called = false;
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "fillStyle" && value === "#DC6CDF") {
          fillStyleColor1Called = true;
          fillStyleColor2Called = false;
        }
        if (key === "fillStyle" && value === "#DC6CDE") {
          fillStyleColor2Called = true;
          fillStyleColor1Called = false;
        }
      },
      onFunctionCall: (val, args) => {
        if (val === "fillRect" && fillStyleColor1Called) {
          fillStyle.push({ color: "#DC6CDF", x: args[0], y: args[1], w: args[2], h: args[3] });
          fillStyleColor1Called = false;
          fillStyleColor2Called = false;
        }
        if (val === "fillRect" && fillStyleColor2Called) {
          fillStyle.push({ color: "#DC6CDE", x: args[0], y: args[1], w: args[2], h: args[3] });
          fillStyleColor1Called = false;
          fillStyleColor2Called = false;
        }
      },
    });

    model.drawGrid(ctx);
    expect(fillStyle).toEqual([{ color: "#DC6CDF", h: 23, w: 96, x: 48, y: 26 }]);

    fillStyle = [];
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [toZone("A1")],
      style: { fillColor: "#DC6CDE" },
    });
    model.drawGrid(ctx);
    expect(fillStyle).toEqual([{ color: "#DC6CDE", h: 23, w: 96, x: 48, y: 26 }]);
  });

  test("fillstyle of merge will be rendered for all cells in merge", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 1,
          rowNumber: 3,
        },
      ],
    });
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: [toZone("A1")],
      style: { fillColor: "#DC6CDF" },
    });
    merge(model, "A1:A3");

    let fillStyle: any[] = [];
    let fillStyleColor1Called = false;
    let fillStyleColor2Called = false;
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "fillStyle" && value === "#DC6CDF") {
          fillStyleColor1Called = true;
          fillStyleColor2Called = false;
        }
        if (key === "fillStyle" && value === "#DC6CDE") {
          fillStyleColor2Called = true;
          fillStyleColor1Called = false;
        }
      },
      onFunctionCall: (val, args) => {
        if (val === "fillRect" && fillStyleColor1Called) {
          fillStyle.push({ color: "#DC6CDF", x: args[0], y: args[1], w: args[2], h: args[3] });
          fillStyleColor1Called = false;
          fillStyleColor2Called = false;
        }
        if (val === "fillRect" && fillStyleColor2Called) {
          fillStyle.push({ color: "#DC6CDE", x: args[0], y: args[1], w: args[2], h: args[3] });
          fillStyleColor1Called = false;
          fillStyleColor2Called = false;
        }
      },
    });

    model.drawGrid(ctx);
    expect(fillStyle).toEqual([{ color: "#DC6CDF", h: 3 * 23, w: 96, x: 48, y: 26 }]);

    fillStyle = [];
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [toZone("A1")],
      style: { fillColor: "#DC6CDE" },
    });
    model.drawGrid(ctx);
    expect(fillStyle).toEqual([{ color: "#DC6CDE", h: 3 * 23, w: 96, x: 48, y: 26 }]);
  });

  test("fillstyle of cell works with CF", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 1,
          rowNumber: 3,
        },
      ],
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#DC6CDF" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
      target: [toZone("A1")],
    });

    let fillStyle: any[] = [];
    let fillStyleColor1Called = false;
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "fillStyle" && value === "#DC6CDF") {
          fillStyleColor1Called = true;
        }
      },
      onFunctionCall: (val, args) => {
        if (val === "fillRect" && fillStyleColor1Called) {
          fillStyle.push({ color: "#DC6CDF", x: args[0], y: args[1], w: args[2], h: args[3] });
          fillStyleColor1Called = false;
        }
      },
    });

    model.drawGrid(ctx);
    expect(fillStyle).toEqual([]);

    fillStyle = [];
    setCellContent(model, "A1", "1");
    model.drawGrid(ctx);
    expect(fillStyle).toEqual([{ color: "#DC6CDF", h: 23, w: 96, x: 48, y: 26 }]);
  });

  test("fillstyle of merge works with CF", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 1,
          rowNumber: 3,
        },
      ],
    });
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#DC6CDF" }, "1"),
      target: [toZone("A1")],
      sheetId,
    });
    merge(model, "A1:A3");
    let fillStyle: any[] = [];
    let fillStyleColor1Called = false;
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "fillStyle" && value === "#DC6CDF") {
          fillStyleColor1Called = true;
        }
      },
      onFunctionCall: (val, args) => {
        if (val === "fillRect" && fillStyleColor1Called) {
          fillStyle.push({ color: "#DC6CDF", x: args[0], y: args[1], w: args[2], h: args[3] });
          fillStyleColor1Called = false;
        }
      },
    });

    model.drawGrid(ctx);
    expect(fillStyle).toEqual([]);

    fillStyle = [];
    setCellContent(model, "A1", "1");
    model.drawGrid(ctx);
    expect(fillStyle).toEqual([{ color: "#DC6CDF", h: 23 * 3, w: 96, x: 48, y: 26 }]);
  });

  test("formulas in a merge, evaluating to a string are properly aligned", () => {
    const model = new Model();
    merge(model, "A2:B2");
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "=A1");

    let textAligns: string[] = [];

    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    model.drawGrid(ctx);

    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    setCellContent(model, "A1", "asdf");

    textAligns = [];
    model.drawGrid(ctx);
    expect(textAligns).toEqual(["left", "left", "center"]); // center for headers
  });

  test("formulas evaluating to a boolean are properly aligned", () => {
    const model = new Model();

    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "=A1");

    let textAligns: string[] = [];
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    model.drawGrid(ctx);
    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    textAligns = [];
    setCellContent(model, "A1", "true");
    model.drawGrid(ctx);
    expect(textAligns).toEqual(["center", "center", "center"]); // center for headers
  });

  test("Cells in a merge evaluating to a number are properly aligned on overflow", () => {
    const model = new Model({
      sheets: [
        {
          id: 1,
          colNumber: 4,
          cols: { 0: { size: 2 }, 1: { size: 2 }, 2: { size: 12 }, 3: { size: 12 } },
          merges: ["A2:B2", "C2:D2"],
          cells: {
            A1: { content: "123456" },
            A2: { content: "=A1" },
            C1: { content: "123456891" },
            C2: { content: "=C1" },
          },
          conditionalFormats: [
            {
              id: "1",
              ranges: ["C1:D2"],
              rule: {
                type: "IconSetRule",
                upperInflectionPoint: { type: "number", value: "1000", operator: "gt" },
                lowerInflectionPoint: { type: "number", value: "0", operator: "gt" },
                icons: {
                  upper: "arrowGood",
                  middle: "arrowNeutral",
                  lower: "arrowBad",
                },
              },
            },
          ],
        },
      ],
    });

    let textAligns: string[] = [];
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });

    model.drawGrid(ctx);
    expect(textAligns).toEqual(["left", "left", "left", "left", "center"]); // A1-C1-A2:B2-C2:D2 and center for headers

    textAligns = [];
    setCellContent(model, "A1", "1");
    setCellContent(model, "C1", "1");
    model.drawGrid(ctx);
    expect(textAligns).toEqual(["right", "left", "right", "right", "center"]); // A1-C1-A2:B2-C2:D2 and center for headers. C1 is still in overflow
  });

  test("formulas in a merge, evaluating to a boolean are properly aligned", () => {
    const model = new Model();
    merge(model, "A2:B2");
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "=A1");

    let textAligns: string[] = [];

    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    model.drawGrid(ctx);

    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    setCellContent(model, "A1", "false");

    textAligns = [];
    model.drawGrid(ctx);
    expect(textAligns).toEqual(["center", "center", "center"]); // center for headers
  });

  test("errors are aligned to the center", () => {
    const model = new Model();

    setCellContent(model, "A1", "=A1");

    let textAligns: string[] = [];

    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    model.drawGrid(ctx);

    // 1 center for headers, 1 for cell content
    expect(textAligns).toEqual(["center", "center"]);
  });

  test("dates are aligned to the right", () => {
    const model = new Model();

    setCellContent(model, "A1", "03/23/2010");

    let textAligns: string[] = [];

    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    model.drawGrid(ctx);

    // 1 center for headers, 1 for cell content
    expect(textAligns).toEqual(["right", "center"]);
  });

  test("functions are aligned to the left", () => {
    const model = new Model();

    setCellContent(model, "A1", "=SUM(1,2)");
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    let textAligns: string[] = [];

    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });

    const getCellTextMock = jest.fn(() => "=SUM(1,2)");
    model.getters.getCellText = getCellTextMock;

    model.drawGrid(ctx);

    // 1 center for headers, 1 for cell content
    expect(textAligns).toEqual(["left", "center"]);
    expect(getCellTextMock).toHaveBeenLastCalledWith(expect.objectContaining({}), true);
  });

  test("functions with centered content are aligned to the left", () => {
    const model = new Model();
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: target("A1"),
      style: { align: "center" },
    });
    setCellContent(model, "A1", "=SUM(1,2)");
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    let textAligns: string[] = [];

    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });

    const getCellTextMock = jest.fn(() => "=SUM(1,2)");
    model.getters.getCellText = getCellTextMock;

    model.drawGrid(ctx);

    // 1 center for headers, 1 for cell content
    expect(textAligns).toEqual(["left", "center"]);
    expect(getCellTextMock).toHaveBeenLastCalledWith(expect.objectContaining({}), true);
  });
  test("CF on empty cell", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 1,
          rowNumber: 1,
        },
      ],
    });
    let fillStyle: any[] = [];
    let fillStyleColor1Called = false;
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "fillStyle" && value === "#DC6CDF") {
          fillStyleColor1Called = true;
        }
      },
      onFunctionCall: (val, args) => {
        if (val === "fillRect" && fillStyleColor1Called) {
          fillStyle.push({ color: "#DC6CDF", x: args[0], y: args[1], w: args[2], h: args[3] });
          fillStyleColor1Called = false;
        }
      },
    });

    model.drawGrid(ctx);
    expect(fillStyle).toEqual([]);
    fillStyle = [];
    let result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("", { fillColor: "#DC6CDF" }, "1"),
      target: [toZone("A1")],
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(result).toBeSuccessfullyDispatched();
    model.drawGrid(ctx);
    expect(fillStyle).toEqual([{ color: "#DC6CDF", h: 23, w: 96, x: 48, y: 26 }]);
  });

  test("simple content", () => {
    const model = new Model();
    setCellContent(model, "B2", "Hello !");
    const ctx = new ImageGridRenderingContext(model, defaultPixelZone("B2"));
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
  });
});
