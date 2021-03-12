import { join } from "path";
import { Canvas, createCanvas, registerFont } from "canvas";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "../../src/constants";
import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";

jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));


import { GridRenderingContext, Viewport, Zone } from "../../src/types";
import { merge, setBorder, setCellContent, setSelection } from "../test_helpers/commands_helpers";
import { createEqualCF } from "../test_helpers/helpers";

function selectZone(model: Model, zoneXc: string) {
  setSelection(model, [zoneXc])
}

jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

const MOCK_THIN_LINE_WIDTH = 0.4;

registerFont(join(__dirname, "../helpers/fonts/Roboto-Regular.ttf"), { family: "Roboto" });
registerFont(join(__dirname, "../helpers/fonts/Roboto-Bold.ttf"), {
  family: "Roboto",
});
registerFont(join(__dirname, "../helpers/fonts/Roboto-BoldItalic.ttf"), {
  family: "Roboto",
});
registerFont(join(__dirname, "../helpers/fonts/Roboto-Italic.ttf"), {
  family: "Roboto",
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

export class MockGridRenderingContext implements GridRenderingContext {
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

beforeEach(() => {
});
describe("renderer", () => {
  test("formulas evaluating to a string are properly aligned", () => {
    const model = new Model();
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "=A1");
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A2"));
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
  });

  test("formulas evaluating to an integer are properly aligned", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "=A1");
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A2"));
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
  });

  // test("Cells evaluating to a number are properly aligned on overflow", () => {
  //   const model = new Model({
  //     sheets: [
  //       {
  //         id: 1,
  //         cols: { 0: { size: 5 }, 2: { size: 25 } },
  //         colNumber: 3,
  //         cells: {
  //           A1: { content: "123456" },
  //           A2: { content: "=A1" },
  //           C1: { content: "123456" },
  //           C2: { content: "=C1" },
  //         },
  //         conditionalFormats: [
  //           {
  //             id: "1",
  //             ranges: ["C1:C2"],
  //             rule: {
  //               type: "IconSetRule",
  //               upperInflectionPoint: { type: "number", value: "1000", operator: "gt" },
  //               lowerInflectionPoint: { type: "number", value: "0", operator: "gt" },
  //               icons: {
  //                 upper: "arrowGood",
  //                 middle: "arrowNeutral",
  //                 lower: "arrowBad",
  //               },
  //             },
  //           },
  //         ],
  //       },
  //     ],
  //   });

  //   let textAligns: string[] = [];
  //   let ctx = new MockGridRenderingContext(model, 1000, 1000, {
  //     onSet: (key, value) => {
  //       if (key === "textAlign") {
  //         textAligns.push(value);
  //       }
  //     },
  //   });

  //   model.drawGrid(ctx);
  //   expect(textAligns).toEqual(["left", "left", "left", "left", "center"]); // A1-C1-A2-C2 and center for headers

  //   textAligns = [];
  //   setCellContent(model, "A1", "1");
  //   setCellContent(model, "C1", "1");
  //   model.drawGrid(ctx);
  //   expect(textAligns).toEqual(["right", "right", "right", "right", "center"]); // A1-C1-A2-C2 and center for headers
  // });

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
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A1"));
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [toZone("A1")],
      style: { fillColor: "#FCBA03" },
    });
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
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
    selectZone(model, "A1:A3");
    merge(model, "A1:A3");
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A1:A3"));

    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [toZone("A1")],
      style: { fillColor: "#FCBA03" },
    });
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
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
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A1"));

    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
    setCellContent(model, "A1", "1");
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
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
    selectZone(model, "A1:A3");
    merge(model, "A1:A3");
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A1:A3"));

    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
    setCellContent(model, "A1", "1");
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
  });

  test("formulas in a merge, evaluating to a string are properly aligned", () => {
    const model = new Model();
    selectZone(model, "A2:B2");
    merge(model, "A2:B2");
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "=A1");
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A2:B2"));
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
  });

  test("formulas in a merge, evaluating to an integer are properly aligned", () => {
    const model = new Model();
    selectZone(model, "A2:B2");
    merge(model, "A2:B2");
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "=A1");
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A2:B2"));
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
  });

  test("formulas evaluating to a boolean are properly aligned", () => {
    const model = new Model();
    setCellContent(model, "A1", "true");
    setCellContent(model, "A2", "=A1");
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A2"));
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
  });

  // test("Cells in a merge evaluating to a number are properly aligned on overflow", () => {
  //   const model = new Model({
  //     sheets: [
  //       {
  //         id: 1,
  //         colNumber: 4,
  //         cols: { 0: { size: 2 }, 1: { size: 2 }, 2: { size: 12 }, 3: { size: 12 } },
  //         merges: ["A2:B2", "C2:D2"],
  //         cells: {
  //           A1: { content: "123456" },
  //           A2: { content: "=A1" },
  //           C1: { content: "123456891" },
  //           C2: { content: "=C1" },
  //         },
  //         conditionalFormats: [
  //           {
  //             id: "1",
  //             ranges: ["C1:D2"],
  //             rule: {
  //               type: "IconSetRule",
  //               upperInflectionPoint: { type: "number", value: "1000", operator: "gt" },
  //               lowerInflectionPoint: { type: "number", value: "0", operator: "gt" },
  //               icons: {
  //                 upper: "arrowGood",
  //                 middle: "arrowNeutral",
  //                 lower: "arrowBad",
  //               },
  //             },
  //           },
  //         ],
  //       },
  //     ],
  //   });

  //   let textAligns: string[] = [];
  //   let ctx = new MockGridRenderingContext(model, 1000, 1000, {
  //     onSet: (key, value) => {
  //       if (key === "textAlign") {
  //         textAligns.push(value);
  //       }
  //     },
  //   });

  //   model.drawGrid(ctx);
  //   expect(textAligns).toEqual(["left", "left", "left", "left", "center"]); // A1-C1-A2:B2-C2:D2 and center for headers

  //   textAligns = [];
  //   setCellContent(model, "A1", "1");
  //   setCellContent(model, "C1", "1");
  //   model.drawGrid(ctx);
  //   expect(textAligns).toEqual(["right", "left", "right", "right", "center"]); // A1-C1-A2:B2-C2:D2 and center for headers. C1 is still in overflow
  // });

  test("formulas in a merge, evaluating to a boolean are properly aligned", () => {
    const model = new Model();
    selectZone(model, "A2:B2");
    merge(model, "A2:B2");
    setCellContent(model, "A1", "false");
    setCellContent(model, "A2", "=A1");
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A2:B2"));
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
  });

  test("errors are aligned to the center", () => {
    const model = new Model();
    setCellContent(model, "A1", "=A1");
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A1"));
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
  });

  test("dates are aligned to the right", () => {
    const model = new Model();
    setCellContent(model, "A1", "03/23/2010");
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A1"));
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
  });

  test("functions are aligned to the left", () => {
    const model = new Model();
    setCellContent(model, "A1", "=SUM(1,2)");
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A1"));
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
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
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("A1"));
    let result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("", { fillColor: "#DC6CDF" }, "1"),
      target: [toZone("A1")],
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(result).toBeSuccessfullyDispatched();
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
  });

  test("simple content", () => {
    const model = new Model();
    setCellContent(model, "B2", "Hello !");
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("B2"));
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
  });
  test("bottom right cell border does not impact merge", () => {
    const model = new Model();
    merge(model, "B1:B2");
    setBorder(model, "right", "C3");
    const ctx = new MockGridRenderingContext(model, defaultPixelZone("B1:C2"));
    model.drawGrid(ctx);
    expect(ctx.screenshot()).toMatchImageSnapshot();
  });
});
