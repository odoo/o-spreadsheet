import {
  BACKGROUND_HEADER_ACTIVE_COLOR,
  BACKGROUND_HEADER_SELECTED_COLOR,
  CANVAS_SHIFT,
  CELL_BORDER_COLOR,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  MIN_CELL_TEXT_MARGIN,
  MIN_CF_ICON_MARGIN,
  NEWLINE,
  SELECTION_BORDER_COLOR,
  TABLE_HOVER_BACKGROUND_COLOR,
} from "@odoo/o-spreadsheet-engine/constants";
import { Mode } from "@odoo/o-spreadsheet-engine/types/model";
import { Canvas, createCanvas, Image } from "canvas";
import { Model } from "../../src";
import { HoveredTableStore } from "../../src/components/tables/hovered_table_store";
import {
  blendColors,
  fontSizeInPixels,
  getContextFontSize,
  toHex,
  toZone,
} from "../../src/helpers";
import { FormulaFingerprintStore } from "../../src/stores/formula_fingerprints_store";
import { GridRenderer } from "../../src/stores/grid_renderer_store";
import { RendererStore } from "../../src/stores/renderer_store";
import {
  Align,
  BorderPosition,
  Box,
  DataValidationCriterion,
  GridRenderingContext,
  Viewport,
  Zone,
} from "../../src/types";
import { MockCanvasRenderingContext2D } from "../setup/canvas.mock";
import {
  addColumns,
  addDataValidation,
  copy,
  createTable,
  deleteColumns,
  freezeColumns,
  freezeRows,
  merge,
  paste,
  resizeColumns,
  resizeRows,
  setCellContent,
  setCellFormat,
  setFormat,
  setSelection,
  setStyle,
  setZoneBorders,
} from "../test_helpers/commands_helpers";
import { getCell } from "../test_helpers/getters_helpers";
import { createEqualCF, getFingerprint, target, toRangesData } from "../test_helpers/helpers";
import { watchClipboardOutline } from "../test_helpers/renderer_helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

MockCanvasRenderingContext2D.prototype.measureText = function (text: string) {
  const fontSize = getContextFontSize(this.font);
  return {
    width: text.length,
    fontBoundingBoxAscent: fontSize / 2,
    fontBoundingBoxDescent: fontSize / 2,
  };
};

function getBoxFromText(gridRenderer: GridRenderer, text: string): Box {
  const sheetId = gridRenderer["getters"].getActiveSheetId();
  const zone = {
    left: 0,
    right: gridRenderer["getters"].getNumberCols(sheetId) - 1,
    top: 0,
    bottom: gridRenderer["getters"].getNumberRows(sheetId) - 1,
  };
  return (gridRenderer["getGridBoxes"](zone)! as Box[]).find(
    (b) => (b.content?.textLines || []).join(" ") === text
  )!;
}

/**
 * Cell fills are drawn with a 0.5 offset from the cell rect so they fill all of the cell and are not
 * affected with the 0.5 offset we use to make the canvas lines sharp.
 */
function removeOffsetOfFillStyles(fillStyles: any[]): any[] {
  return fillStyles.map((fs) => ({
    ...fs,
    x: fs.x + CANVAS_SHIFT,
    y: fs.y + CANVAS_SHIFT,
    w: fs.w - CANVAS_SHIFT * 2,
    h: fs.h - CANVAS_SHIFT * 2,
  }));
}

interface ContextObserver {
  onSet?(key, val): void;
  onGet?(key): void;
  onFunctionCall?(fn: string, args: any[], renderingContext: MockGridRenderingContext): void;
}

function setRenderer(model: Model = new Model()) {
  const { container, store: gridRendererStore } = makeStoreWithModel(model, GridRenderer);
  gridRendererStore["getBoxesWithAnimations"] = (boxes) => boxes;
  const rendererManager = container.get(RendererStore);
  const drawGridRenderer = (ctx: GridRenderingContext) => {
    rendererManager.draw(ctx);
  };
  return { model, gridRendererStore, drawGridRenderer, container };
}

class MockGridRenderingContext implements GridRenderingContext {
  _context = document.createElement("canvas").getContext("2d");
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  dpr = 1;
  thinLineWidth = 0.4;

  constructor(model: Model, width: number, height: number, observer: ContextObserver) {
    model.dispatch("RESIZE_SHEETVIEW", {
      width: width - HEADER_WIDTH,
      height: height - HEADER_HEIGHT,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    this.viewport = model.getters.getActiveMainViewport();

    const handler = {
      get: (target, val) => {
        // roundRect isn't implemented
        if (val in (this._context as any).__proto__ || val === "roundRect") {
          return (...args) => {
            if (observer.onFunctionCall) {
              observer.onFunctionCall(val, args, this);
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

const characters = new Image();
characters.src =
  "data:image/png;base64,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";
// the data url image size
const imgWidth = 256;
const imgHeight = 256;
// individual characted bounding box
const cellWidth = 17;
const cellHeight = 17;
// char code for [0, 0]
const startIndex = 32;
// number of columns in image
const columns = Math.floor(imgWidth / cellWidth);
// number of rows in image
const rows = Math.floor(imgHeight / cellHeight);
// font height (in pixels)
const fontHeight = 16;
// the font widths by char code, starting at startIndex
const fontWidth = [
  4, 4, 6, 7, 7, 10, 9, 3, 4, 4, 5, 8, 4, 4, 4, 4, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 4, 4, 8, 8, 8, 8,
  13, 9, 9, 9, 9, 8, 8, 10, 9, 4, 7, 9, 8, 11, 9, 10, 9, 10, 9, 9, 8, 9, 9, 13, 9, 8, 7, 4, 4, 4, 8,
  7, 4, 8, 8, 7, 8, 8, 4, 8, 8, 4, 4, 7, 4, 12, 8, 8, 8, 8, 5, 6, 4, 8, 7, 11, 8, 7, 7, 5, 3, 5, 8,
  10, 7, 10, 4, 7, 7, 13, 7, 7, 4, 12, 9, 4, 14, 10, 7, 10, 10, 4, 4, 7, 7, 5, 7, 13, 4, 13, 6, 4,
  12, 10, 7, 8, 4, 4, 7, 7, 7, 7, 3, 7, 4, 10, 5, 7, 8, 4, 10, 7, 5, 7, 4, 4, 4, 7, 7, 4, 4, 4, 5,
  7, 11, 11, 11, 8, 9, 9, 9, 9, 9, 9, 13, 9, 8, 8, 8, 8, 4, 4, 4, 4, 9, 9, 10, 10, 10, 10, 10, 8,
  10, 9, 9, 9, 9, 8, 9, 8, 8, 8, 8, 8, 8, 8, 12, 7, 8, 8, 8, 8, 4, 4, 4, 4, 8, 8, 8, 8, 8, 8, 8, 7,
  8, 8, 8, 8, 8, 7, 8, 7,
];

// get coordinates and size for one character
function getChar(asciiCode) {
  const index = asciiCode - startIndex;
  const x = Math.min(index % columns, columns - 1);
  const y = Math.min(Math.floor(index / columns), rows - 1);
  return { sx: x * cellWidth, sy: y * cellHeight, w: fontWidth[index], h: fontHeight };
}

function measureText(text) {
  let width = 0;
  if (text && text.charCodeAt) {
    for (let i = 0; i < text.length; ++i) {
      width += fontWidth[Math.min(223, text.charCodeAt(i) - startIndex)];
    }
  }
  return { width };
}

class BetterMockGridRenderingContext implements GridRenderingContext {
  viewport: Viewport;
  dpr = 1;
  thinLineWidth = 0.4;
  private canvas: Canvas;
  ctx: CanvasRenderingContext2D;

  constructor(model: Model, width: number, height: number) {
    model.dispatch("RESIZE_SHEETVIEW", {
      width: width - HEADER_WIDTH,
      height: height - HEADER_HEIGHT,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    this.viewport = model.getters.getActiveMainViewport();
    this.canvas = createCanvas(width, height);
    this.ctx = this.canvas.getContext("2d") as any as CanvasRenderingContext2D; // ADRM TODO
    this.ctx.fillText = function (text, x, y) {
      if (text && text.charCodeAt) {
        const align = this.textAlign;
        if (align === "center" || align === "right") {
          const w = measureText(text).width;
          // const w = text.length;
          x -= align === "center" ? w / 2 : w;
        }
        const base = this.textBaseline;
        switch (base) {
          case "top":
          case "hanging":
            y -= fontHeight;
            break;
          case "middle":
          case "alphabetic":
            y -= fontHeight / 2;
            break;
        }
        for (let i = 0; i < text.length; ++i) {
          const { sx, sy, w, h } = getChar(text.charCodeAt(i));
          // @ts-ignore - ADRM TODO
          this.drawImage(characters, sx, sy, w, h, x, y, w, h);
          x += w;
        }
      }
    };
  }

  screenshot() {
    return this.canvas.toBuffer("image/png");
  }
}

test("Image snapshot", () => {
  const { drawGridRenderer, model } = setRenderer();

  setCellContent(model, "B2", "2");
  const ctx = new BetterMockGridRenderingContext(model, 1000, 1000);

  drawGridRenderer(ctx);

  expect(ctx.screenshot()).toMatchImageSnapshot();
});

describe("renderer", () => {
  test("snapshot for a simple grid rendering", () => {
    const { drawGridRenderer, model } = setRenderer();

    setCellContent(model, "A1", "1");
    const instructions: string[] = [];
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
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

    drawGridRenderer(ctx);

    expect(instructions).toMatchSnapshot();
  });

  describe("Headers background color", () => {
    function getFirstRowHeaderFillColor() {
      const index = instructions.findIndex(
        (instr) =>
          instr === `ctx.fillRect(${0}, ${HEADER_HEIGHT}, ${HEADER_WIDTH}, ${DEFAULT_CELL_HEIGHT})`
      );
      let instruction = instructions[index - 1];
      instruction = instruction.replace('ctx.fillStyle="', "");
      instruction = instruction.replace('";', "");
      return instruction;
    }

    function getFirstColHeaderFillColor() {
      const index = instructions.findIndex(
        (instr) =>
          instr === `ctx.fillRect(${HEADER_WIDTH}, ${0}, ${DEFAULT_CELL_WIDTH}, ${HEADER_HEIGHT})`
      );
      let instruction = instructions[index - 1];
      instruction = instruction.replace('ctx.fillStyle="', "");
      instruction = instruction.replace('";', "");
      return instruction;
    }

    let model: Model;
    let instructions: string[];
    let ctx: MockGridRenderingContext;
    let drawGridRenderer: (ctx: GridRenderingContext) => void;

    beforeEach(() => {
      ({ drawGridRenderer, model } = setRenderer(
        new Model({ sheets: [{ colNumber: 2, rowNumber: 2 }] })
      ));
      const { width, height } = model.getters.getSheetViewDimension();
      instructions = [];
      ctx = new MockGridRenderingContext(model, 1000, 1000, {
        onSet: (key, value) => {
          instructions.push(`ctx.${key}=${JSON.stringify(value)};`);
        },
        onGet: (key) => {
          instructions.push(`GET:${key}`);
        },
        onFunctionCall: (key, args) => {
          instructions.push(`ctx.${key}(${args.map((a) => JSON.stringify(a)).join(", ")})`);
        },
      });
      model.dispatch("RESIZE_SHEETVIEW", {
        width,
        height,
        gridOffsetX: HEADER_WIDTH,
        gridOffsetY: HEADER_HEIGHT,
      });
    });

    test("Color of headers containing the selection", () => {
      setSelection(model, ["A1"]);
      drawGridRenderer(ctx);

      const fillColHeaderInstr = getFirstColHeaderFillColor();
      expect(fillColHeaderInstr).toEqual(BACKGROUND_HEADER_SELECTED_COLOR);
      const fillRowHeaderInstr = getFirstRowHeaderFillColor();
      expect(fillRowHeaderInstr).toEqual(BACKGROUND_HEADER_SELECTED_COLOR);
    });

    test("Color of active headers", () => {
      setSelection(model, ["A1:B2"]);
      drawGridRenderer(ctx);

      const fillColHeaderInstr = getFirstColHeaderFillColor();
      expect(fillColHeaderInstr).toEqual(BACKGROUND_HEADER_ACTIVE_COLOR);
      const fillRowHeaderInstr = getFirstRowHeaderFillColor();
      expect(fillRowHeaderInstr).toEqual(BACKGROUND_HEADER_ACTIVE_COLOR);
    });
  });

  test("formulas evaluating to a string are properly aligned", () => {
    const { drawGridRenderer, model } = setRenderer();

    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "=A1");

    let textAligns: string[] = [];
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });

    drawGridRenderer(ctx);
    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    textAligns = [];
    setCellContent(model, "A1", "asdf");
    drawGridRenderer(ctx);
    expect(textAligns).toEqual(["left", "left", "center"]); // center for headers
  });

  test("formulas referencing an empty cell are properly aligned", () => {
    const { drawGridRenderer, model } = setRenderer();

    setCellContent(model, "A1", "=A2");

    const textAligns: string[] = [];
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });

    drawGridRenderer(ctx);

    expect(textAligns).toEqual(["right", "center"]); // center for headers
  });

  test("numbers are aligned right when overflowing vertically", () => {
    const { drawGridRenderer, model } = setRenderer();

    setCellContent(model, "A1", "1");
    setStyle(model, "A1", { fontSize: 36 });

    const textAligns: string[] = [];
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });

    drawGridRenderer(ctx);

    expect(textAligns).toEqual(["right", "center"]); // center for headers
  });

  test("Cells evaluating to a number are properly aligned on overflow", () => {
    const { drawGridRenderer, model } = setRenderer(
      new Model({
        sheets: [
          {
            id: 1,
            cols: { 0: { size: 5 }, 2: { size: 25 } },
            colNumber: 3,
            cells: {
              A1: "123456",
              A2: "=A1",
              C1: "123456",
              C2: "=C1",
            },
            conditionalFormats: [
              {
                id: "1",
                ranges: ["C1:C2"],
                rule: {
                  type: "IconSetRule",
                  upperInflectionPoint: { type: "number", value: "1000", operator: "gt" },
                  lowerInflectionPoint: { type: "number", value: "0", operator: "gt" },
                  icons: { upper: "arrowGood", middle: "arrowNeutral", lower: "arrowBad" },
                },
              },
            ],
          },
        ],
      })
    );

    let textAligns: string[] = [];
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });

    drawGridRenderer(ctx);

    expect(textAligns).toEqual(["left", "left", "left", "left", "center"]); // A1-C1-A2-C2 and center for headers

    textAligns = [];
    setCellContent(model, "A1", "1");
    setCellContent(model, "C1", "1");
    drawGridRenderer(ctx);

    expect(textAligns).toEqual(["right", "right", "right", "right", "center"]); // A1-C1-A2-C2 and center for headers
  });

  test("fillstyle of cell will be rendered", () => {
    const { drawGridRenderer, model } = setRenderer(
      new Model({ sheets: [{ colNumber: 1, rowNumber: 3 }] })
    );

    setStyle(model, "A1", { fillColor: "#DC6CDF" });

    let fillStyle: any[] = [];
    let fillStyleColor1Called = false;
    let fillStyleColor2Called = false;
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
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

    drawGridRenderer(ctx);

    expect(removeOffsetOfFillStyles(fillStyle)).toEqual([
      { color: "#DC6CDF", h: 23, w: 96, x: 0, y: 0 },
    ]);

    fillStyle = [];
    setStyle(model, "A1", { fillColor: "#DC6CDE" });
    drawGridRenderer(ctx);

    expect(removeOffsetOfFillStyles(fillStyle)).toEqual([
      { color: "#DC6CDE", h: 23, w: 96, x: 0, y: 0 },
    ]);
  });

  test("fillstyle of merge will be rendered for all cells in merge", () => {
    const { drawGridRenderer, model } = setRenderer(
      new Model({ sheets: [{ colNumber: 1, rowNumber: 3 }] })
    );
    setStyle(model, "A1", { fillColor: "#DC6CDF" });
    merge(model, "A1:A3");

    let fillStyle: any[] = [];
    let fillStyleColor1Called = false;
    let fillStyleColor2Called = false;
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
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

    drawGridRenderer(ctx);

    expect(removeOffsetOfFillStyles(fillStyle)).toEqual([
      { color: "#DC6CDF", h: 3 * 23, w: 96, x: 0, y: 0 },
    ]);

    fillStyle = [];
    setStyle(model, "A1", { fillColor: "#DC6CDE" });
    drawGridRenderer(ctx);

    expect(removeOffsetOfFillStyles(fillStyle)).toEqual([
      { color: "#DC6CDE", h: 3 * 23, w: 96, x: 0, y: 0 },
    ]);
  });

  test("fillstyle of cell works with CF", () => {
    const { drawGridRenderer, model } = setRenderer(
      new Model({ sheets: [{ colNumber: 1, rowNumber: 3 }] })
    );
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#DC6CDF" }, "1"),
      sheetId,
      ranges: toRangesData(sheetId, "A1"),
    });

    let fillStyle: any[] = [];
    let fillStyleColor1Called = false;
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
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

    drawGridRenderer(ctx);

    expect(removeOffsetOfFillStyles(fillStyle)).toEqual([]);

    fillStyle = [];
    setCellContent(model, "A1", "1");
    drawGridRenderer(ctx);

    expect(removeOffsetOfFillStyles(fillStyle)).toEqual([
      { color: "#DC6CDF", h: 23, w: 96, x: 0, y: 0 },
    ]);
  });

  test("fill style of hovered clickable cells goes over regular fill style", () => {
    const { drawGridRenderer, model, container } = setRenderer(
      new Model({ sheets: [{ colNumber: 1, rowNumber: 3 }] })
    );
    const background = "#DC6CDF";
    const hoverColor = blendColors(background, TABLE_HOVER_BACKGROUND_COLOR);
    createTable(model, "A1", { numberOfHeaders: 0 });
    setStyle(model, "A1", { fillColor: background });
    setCellContent(model, "A1", "Data");
    model.updateMode("dashboard");

    let fillStyle = "";
    let fillStyles: any[] = [];
    let fillStyleCalled = false;
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "fillStyle" && [background, hoverColor].includes(value)) {
          fillStyle = value;
          fillStyleCalled = true;
        }
      },
      onFunctionCall: (val, args) => {
        if (val === "fillRect" && fillStyleCalled) {
          fillStyles.push({ color: fillStyle, x: args[0], y: args[1], w: args[2], h: args[3] });
          fillStyleCalled = false;
        }
      },
    });

    drawGridRenderer(ctx);
    expect(removeOffsetOfFillStyles(fillStyles)).toEqual([
      { color: background, h: 23, w: 96, x: 0, y: 0 },
    ]);

    fillStyles = [];
    container.get(HoveredTableStore).hover({ col: 0, row: 0 });
    drawGridRenderer(ctx);

    expect(removeOffsetOfFillStyles(fillStyles)).toEqual([
      { color: background, h: 23, w: 96, x: 0, y: 0 },
      { color: hoverColor, h: 23, w: 96, x: 0, y: 0 },
    ]);
  });

  test("fillstyle of merge works with CF", () => {
    const { drawGridRenderer, model } = setRenderer(
      new Model({ sheets: [{ colNumber: 1, rowNumber: 3 }] })
    );
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#DC6CDF" }, "1"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    merge(model, "A1:A3");
    let fillStyle: any[] = [];
    let fillStyleColor1Called = false;
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
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

    drawGridRenderer(ctx);

    expect(removeOffsetOfFillStyles(fillStyle)).toEqual([]);

    fillStyle = [];
    setCellContent(model, "A1", "1");
    drawGridRenderer(ctx);

    expect(removeOffsetOfFillStyles(fillStyle)).toEqual([
      { color: "#DC6CDF", h: 23 * 3, w: 96, x: 0, y: 0 },
    ]);
  });

  test("formula fingerprints", () => {
    const { drawGridRenderer, model, gridRendererStore, container } = setRenderer(
      new Model({ sheets: [{ colNumber: 1, rowNumber: 6 }] })
    );
    const fingerprints = container.get(FormulaFingerprintStore);
    fingerprints.enable();

    // a colored cell but no fingerprint (it's a string)
    setStyle(model, "A2", { fillColor: "#DC6CDF" });
    setCellContent(model, "A2", "Hi");

    // a cell with a formula
    setCellContent(model, "A3", '="hello"');

    // a formula within a merge
    merge(model, "A4:A5");
    setCellContent(model, "A4", '="merge"');

    const renderingCtx = new MockGridRenderingContext(model, 1000, 1000, {});
    drawGridRenderer(renderingCtx);

    expect(getBoxFromText(gridRendererStore, "Hi")).toMatchObject({
      ...model.getters.getVisibleRect(toZone("A2")),
      style: { fillColor: undefined },
    });
    expect(getBoxFromText(gridRendererStore, "hello")).toMatchObject({
      ...model.getters.getVisibleRect(toZone("A3")),
      style: { fillColor: getFingerprint(fingerprints, "A3") },
    });
    expect(getBoxFromText(gridRendererStore, "merge")).toMatchObject({
      ...model.getters.getVisibleRect(toZone("A4:A5")),
      style: { fillColor: getFingerprint(fingerprints, "A4") },
    });
  });

  test("formulas in a merge, evaluating to a string are properly aligned", () => {
    const { drawGridRenderer, model } = setRenderer();
    merge(model, "A2:B2");
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "=A1");

    let textAligns: string[] = [];

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    drawGridRenderer(ctx);

    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    setCellContent(model, "A1", "asdf");

    textAligns = [];
    drawGridRenderer(ctx);

    expect(textAligns).toEqual(["left", "left", "center"]); // center for headers
  });

  test("formulas evaluating to a boolean are properly aligned", () => {
    const { drawGridRenderer, model } = setRenderer();

    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "=A1");

    let textAligns: string[] = [];
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    drawGridRenderer(ctx);

    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    textAligns = [];
    setCellContent(model, "A1", "true");
    drawGridRenderer(ctx);

    expect(textAligns).toEqual(["center", "center", "center"]); // center for headers
  });

  test("Cells in a merge evaluating to a number are properly aligned on overflow", () => {
    const { drawGridRenderer, model } = setRenderer(
      new Model({
        sheets: [
          {
            id: 1,
            colNumber: 4,
            cols: {
              0: { size: 2 + MIN_CELL_TEXT_MARGIN },
              1: { size: 2 + MIN_CELL_TEXT_MARGIN },
              2: { size: 12 + MIN_CELL_TEXT_MARGIN },
              3: { size: 12 + MIN_CELL_TEXT_MARGIN },
            },
            merges: ["A2:B2", "C2:D2"],
            cells: {
              A1: "123456789",
              A2: "=A1",
              C1: "123456891234",
              C2: "=C1",
            },
            conditionalFormats: [
              {
                id: "1",
                ranges: ["C1:D2"],
                rule: {
                  type: "IconSetRule",
                  upperInflectionPoint: { type: "number", value: "1000", operator: "gt" },
                  lowerInflectionPoint: { type: "number", value: "0", operator: "gt" },
                  icons: { upper: "arrowGood", middle: "arrowNeutral", lower: "arrowBad" },
                },
              },
            ],
          },
        ],
      })
    );

    let textAligns: string[] = [];
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });

    drawGridRenderer(ctx);

    expect(textAligns).toEqual(["left", "left", "left", "left", "center"]); // A1-C1-A2:B2-C2:D2 and center for headers

    textAligns = [];
    setCellContent(model, "A1", "1");
    setCellContent(model, "C1", "1");
    drawGridRenderer(ctx);

    expect(textAligns).toEqual(["right", "left", "right", "right", "center"]); // A1-C1-A2:B2-C2:D2 and center for headers. C1 is stil lin overflow
  });

  test("formulas in a merge, evaluating to a boolean are properly aligned", () => {
    const { drawGridRenderer, model } = setRenderer();
    merge(model, "A2:B2");
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "=A1");

    let textAligns: string[] = [];

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    drawGridRenderer(ctx);

    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    setCellContent(model, "A1", "false");

    textAligns = [];
    drawGridRenderer(ctx);

    expect(textAligns).toEqual(["center", "center", "center"]); // center for headers
  });

  test("errors are aligned to the center", () => {
    const { drawGridRenderer, model } = setRenderer();

    setCellContent(model, "A1", "=A1");

    const textAligns: string[] = [];

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    drawGridRenderer(ctx);

    // 1 center for headers, 1 for cell content
    expect(textAligns).toEqual(["center", "center"]);
  });

  test("dates are aligned to the right", () => {
    const { drawGridRenderer, model } = setRenderer();

    setCellContent(model, "A1", "03/23/2010");

    const textAligns: string[] = [];

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    drawGridRenderer(ctx);

    // 1 center for headers, 1 for cell content
    expect(textAligns).toEqual(["right", "center"]);
  });

  test("functions are aligned to the left", () => {
    const { drawGridRenderer, model } = setRenderer();

    setCellContent(model, "A1", "=SUM(1,2)");
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    const textAligns: string[] = [];

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });

    const getCellTextMock = jest.fn(() => "=SUM(1,2)");
    model.getters.getCellText = getCellTextMock;

    drawGridRenderer(ctx);

    // 1 center for headers, 1 for cell content
    expect(textAligns).toEqual(["left", "center"]);
    expect(getCellTextMock).toHaveBeenLastCalledWith(
      { sheetId: expect.any(String), col: 0, row: 0 },
      { showFormula: true, availableWidth: DEFAULT_CELL_WIDTH - 2 * MIN_CELL_TEXT_MARGIN }
    );
  });

  test("functions with centered content are aligned to the left", () => {
    const { drawGridRenderer, model } = setRenderer();
    setStyle(model, "A1", { align: "center" });

    setCellContent(model, "A1", "=SUM(1,2)");
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    const textAligns: string[] = [];

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });

    const getCellTextMock = jest.fn(() => "=SUM(1,2)");
    model.getters.getCellText = getCellTextMock;

    drawGridRenderer(ctx);

    // 1 center for headers, 1 for cell content
    expect(textAligns).toEqual(["left", "center"]);
    expect(getCellTextMock).toHaveBeenLastCalledWith(
      { sheetId: expect.any(String), col: 0, row: 0 },
      { showFormula: true, availableWidth: DEFAULT_CELL_WIDTH - 2 * MIN_CELL_TEXT_MARGIN }
    );
  });

  test("CF on empty cell", () => {
    const { drawGridRenderer, model } = setRenderer(
      new Model({ sheets: [{ colNumber: 1, rowNumber: 1 }] })
    );
    let fillStyle: any[] = [];
    let fillStyleColor1Called = false;
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
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

    drawGridRenderer(ctx);

    expect(removeOffsetOfFillStyles(fillStyle)).toEqual([]);
    fillStyle = [];
    const sheetId = model.getters.getActiveSheetId();
    const result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        rule: {
          type: "CellIsRule",
          operator: "isEmpty",
          values: [],
          style: { fillColor: "#DC6CDF" },
        },
      },
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    expect(result).toBeSuccessfullyDispatched();
    drawGridRenderer(ctx);

    expect(removeOffsetOfFillStyles(fillStyle)).toEqual([
      { color: "#DC6CDF", h: 23, w: 96, x: 0, y: 0 },
    ]);
  });

  test.each(["I am a very long text", "100000000000000"])(
    "Overflowing left-aligned content is correctly clipped",
    (overflowingContent) => {
      let box: Box;
      const { drawGridRenderer, model, gridRendererStore } = setRenderer(
        new Model({
          sheets: [
            {
              id: "sheet1",
              colNumber: 3,
              rowNumber: 1,
              cols: { 1: { size: 5 } },
              cells: { B1: overflowingContent },
              styles: { B1: 1 },
            },
          ],
          styles: { 1: { align: "left" } },
        })
      );

      const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
      drawGridRenderer(ctx);

      box = getBoxFromText(gridRendererStore, overflowingContent);
      // no clip
      expect(box.clipRect).toBeUndefined();
      expect(box.isOverflow).toBeTruthy();

      // no clipping at the left
      setCellContent(model, "A1", "Content at the left");
      drawGridRenderer(ctx);

      box = getBoxFromText(gridRendererStore, overflowingContent);
      expect(box.clipRect).toBeUndefined();
      expect(box.isOverflow).toBeTruthy();

      // clipping at the right
      setCellContent(model, "C1", "Content at the right");
      drawGridRenderer(ctx);

      box = getBoxFromText(gridRendererStore, overflowingContent);
      expect(box.clipRect).toEqual({
        x: DEFAULT_CELL_WIDTH,
        y: 0,
        width: 5,
        height: DEFAULT_CELL_HEIGHT,
      });
    }
  );

  test.each([{ align: "left" }, { align: undefined }])(
    "Overflowing number with % align is correctly clipped",
    (style) => {
      const overflowingNumber = "100000000000000";
      let box: Box;
      const { drawGridRenderer, model, gridRendererStore } = setRenderer(
        new Model({
          sheets: [
            {
              id: "sheet1",
              colNumber: 3,
              rowNumber: 1,
              cols: { 1: { size: 5 } },
              cells: { B1: overflowingNumber },
              styles: { B1: 1 },
            },
          ],
          styles: { 1: style },
        })
      );

      const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
      drawGridRenderer(ctx);

      box = getBoxFromText(gridRendererStore, overflowingNumber);
      // no clip
      expect(box.clipRect).toBeUndefined();
      expect(box.isOverflow).toBeTruthy();

      // no clipping at the left
      setCellContent(model, "A1", "Content at the left");
      drawGridRenderer(ctx);

      box = getBoxFromText(gridRendererStore, overflowingNumber);
      expect(box.clipRect).toBeUndefined();
      expect(box.isOverflow).toBeTruthy();

      // clipping at the right
      setCellContent(model, "C1", "Content at the right");
      drawGridRenderer(ctx);

      box = getBoxFromText(gridRendererStore, overflowingNumber);
      expect(box.clipRect).toEqual({
        x: DEFAULT_CELL_WIDTH,
        y: 0,
        width: 5,
        height: DEFAULT_CELL_HEIGHT,
      });
    }
  );

  test("Overflowing right-aligned text is correctly clipped", () => {
    const overflowingText = "I am a very long text";
    let box: Box;
    const { drawGridRenderer, model, gridRendererStore } = setRenderer(
      new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 3,
            rowNumber: 1,
            cols: { 1: { size: 5 } },
            cells: { B1: overflowingText },
            styles: { B1: 1 },
          },
        ],
        styles: { 1: { align: "right" } },
      })
    );

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
    drawGridRenderer(ctx);

    box = getBoxFromText(gridRendererStore, overflowingText);
    // no clip
    expect(box.clipRect).toBeUndefined();
    expect(box.isOverflow).toBeTruthy();

    // no clipping at the right
    setCellContent(model, "C1", "Content at the left");
    drawGridRenderer(ctx);

    box = getBoxFromText(gridRendererStore, overflowingText);
    expect(box.clipRect).toBeUndefined();
    expect(box.isOverflow).toBeTruthy();

    // clipping at the left
    setCellContent(model, "A1", "Content at the right");
    drawGridRenderer(ctx);

    box = getBoxFromText(gridRendererStore, overflowingText);
    expect(box.clipRect).toEqual({
      x: DEFAULT_CELL_WIDTH,
      y: 0,
      width: 5,
      height: DEFAULT_CELL_HEIGHT,
    });
  });

  test("Overflowing centered content is clipped on left side correctly without overlapping", () => {
    const overflowingContent = "I am a very long long long long long long text";
    // using alternative col size to clarify the computations
    const colSize = 5;
    const { drawGridRenderer, model, gridRendererStore } = setRenderer(
      new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 5,
            rowNumber: 1,
            cols: { 1: { size: colSize }, 2: { size: colSize } },
            cells: { C1: overflowingContent, A1: "left" },
            styles: { C1: 1 },
          },
        ],
        styles: { 1: { align: "center" } },
      })
    );
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
    drawGridRenderer(ctx);

    const centeredBox = getBoxFromText(gridRendererStore, overflowingContent);
    expect(centeredBox.clipRect).toEqual({
      x: DEFAULT_CELL_WIDTH, // clipped to the left
      y: 0,
      width: 2 * (colSize + DEFAULT_CELL_WIDTH),
      height: DEFAULT_CELL_HEIGHT,
    });
  });

  test("Overflowing centered content is clipped on right side correctly without overlapping", () => {
    const overflowingContent = "I am a very long long long long long long text";
    // using alternative col size to clarify the computations
    const colSize = 5;
    const { drawGridRenderer, model, gridRendererStore } = setRenderer(
      new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 10,
            rowNumber: 1,
            cols: { 2: { size: colSize }, 3: { size: colSize } },
            cells: { C1: overflowingContent, E1: "right" },
            styles: { C1: 2 },
          },
        ],
        styles: { 2: { align: "center" } },
      })
    );
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
    drawGridRenderer(ctx);

    const centeredBox = getBoxFromText(gridRendererStore, overflowingContent);
    const cell = getCell(model, "C1")!;
    const contentWidth =
      model.getters.getTextWidth(cell.content, cell.style || {}) + MIN_CELL_TEXT_MARGIN;
    const expectedClipX = 2 * DEFAULT_CELL_WIDTH + colSize / 2 - contentWidth / 2;
    expect(centeredBox.clipRect).toEqual({
      x: expectedClipX,
      y: 0,
      width: 2 * DEFAULT_CELL_WIDTH + 2 * colSize - expectedClipX,
      height: DEFAULT_CELL_HEIGHT,
    });
  });

  test.each(["left", "right", "center"])(
    "Content in merge is clipped and cannot overflow",
    (align) => {
      const overflowingText = "I am a very long text";
      const { drawGridRenderer, model, gridRendererStore } = setRenderer(
        new Model({
          sheets: [
            {
              id: "sheet1",
              colNumber: 5,
              rowNumber: 5,
              cols: { 1: { size: 5 }, 2: { size: 5 } },
              cells: { B1: overflowingText },
              styles: { B1: 1 },
              merges: ["B1:C2"],
            },
          ],
          styles: { 1: { align } },
        })
      );

      const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
      drawGridRenderer(ctx);

      const box = getBoxFromText(gridRendererStore, overflowingText);
      expect(box.clipRect).toEqual({
        x: DEFAULT_CELL_WIDTH,
        y: 0,
        width: 10,
        height: DEFAULT_CELL_HEIGHT * 2,
      });
    }
  );

  test.each([
    ["right", "A1:A2"],
    ["left", "C1:C2"],
    ["center", "A1:A2", "C1:C2"],
  ])("Content cannot overflow over merge with align %s", (align, ...merges) => {
    const overflowingText = "I am a very long text";
    const { drawGridRenderer, model, gridRendererStore } = setRenderer(
      new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 5,
            rowNumber: 5,
            cols: { 1: { size: 5 } },
            cells: { B2: overflowingText },
            styles: { B2: 1 },
            merges,
          },
        ],
        styles: { 1: { align } },
      })
    );

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
    drawGridRenderer(ctx);

    const box = getBoxFromText(gridRendererStore, overflowingText);
    expect(box.clipRect).toEqual({
      x: DEFAULT_CELL_WIDTH,
      y: DEFAULT_CELL_HEIGHT,
      width: 5,
      height: DEFAULT_CELL_HEIGHT,
    });
  });

  test.each(["left", "right", "center"])(
    'Cells with the wrapping style "wrap" cannot overflow long text content',
    (align) => {
      const overflowingText = "I am a very very very long text";
      const { drawGridRenderer, model, gridRendererStore } = setRenderer(
        new Model({
          sheets: [
            {
              id: "sheet1",
              colNumber: 3,
              rowNumber: 1,
              cols: { 1: { size: 20 } },
              cells: { B1: overflowingText },
              styles: { B1: 1 },
            },
          ],
          styles: { 1: { align, wrapping: "wrap" } },
        })
      );

      const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
      drawGridRenderer(ctx);

      const box = getBoxFromText(gridRendererStore, overflowingText);
      expect(box.clipRect).toEqual({
        x: DEFAULT_CELL_WIDTH, // clipped to the left
        y: 0,
        width: 20, // clipped to the right
        height: model.getters.getRowSize("sheet1", 0),
      });
    }
  );

  test.each(["left", "right", "center"])(
    'Cells with the wrapping style "crop" cannot overflow long text content',
    (align) => {
      const overflowingText = "I am a very very very long text";
      const { drawGridRenderer, model, gridRendererStore } = setRenderer(
        new Model({
          sheets: [
            {
              id: "sheet1",
              colNumber: 3,
              rowNumber: 1,
              cols: { 1: { size: 20 } },
              cells: { B1: overflowingText },
              styles: { B1: 1 },
            },
          ],
          styles: { 1: { align, wrapping: "clip" } },
        })
      );

      const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
      drawGridRenderer(ctx);

      const box = getBoxFromText(gridRendererStore, overflowingText);
      expect(box.clipRect).toEqual({
        x: DEFAULT_CELL_WIDTH, // clipped to the left
        y: 0,
        width: 20, // clipped to the right
        height: model.getters.getRowSize("sheet1", 0),
      });
    }
  );

  test("cells with a fontsize too big for the row height are clipped", () => {
    const overflowingText = "TOO HIGH";
    const fontSize = 26;
    let box: Box;
    const { drawGridRenderer, model, gridRendererStore } = setRenderer(
      new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 1,
            rowNumber: 1,
            rows: { 0: { size: Math.floor(fontSizeInPixels(fontSize) + 5) } },
            cells: { A1: overflowingText },
            styles: { A1: 1 },
          },
        ],
        styles: { 1: { fontSize } },
      })
    );

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
    drawGridRenderer(ctx);

    box = getBoxFromText(gridRendererStore, overflowingText);
    expect(box.clipRect).toBeUndefined();

    resizeRows(model, [0], Math.floor(fontSizeInPixels(fontSize) / 2));
    drawGridRenderer(ctx);

    box = getBoxFromText(gridRendererStore, overflowingText);
    expect(box.clipRect).toEqual({
      x: 0,
      y: 0,
      width: DEFAULT_CELL_WIDTH,
      height: Math.floor(fontSizeInPixels(fontSize) / 2),
    });
  });

  test("cells overflowing in Y have a correct clipRect", () => {
    const { drawGridRenderer, model, gridRendererStore } = setRenderer();
    const overflowingText = "I am a very very very long text that is also too high";
    const fontSize = 26;

    setCellContent(model, "A1", overflowingText);
    setStyle(model, "A1", { fontSize });
    resizeRows(model, [0], Math.floor(fontSizeInPixels(fontSize) / 2));
    resizeColumns(model, ["A"], 10);

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
    drawGridRenderer(ctx);

    expect(getBoxFromText(gridRendererStore, overflowingText).clipRect).toEqual({
      x: 0,
      y: 0,
      width: 952,
      height: Math.floor(fontSizeInPixels(fontSize) / 2),
    });
  });

  test("cells with icon CF are correctly clipped", () => {
    let box: Box;
    const cellContent = "10000";
    const { drawGridRenderer, model, gridRendererStore } = setRenderer(
      new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 1,
            rowNumber: 1,
            cells: { A1: "10000" },
            conditionalFormats: [
              {
                id: "1",
                ranges: ["A1"],
                rule: {
                  type: "IconSetRule",
                  upperInflectionPoint: { type: "number", value: "1000", operator: "gt" },
                  lowerInflectionPoint: { type: "number", value: "0", operator: "gt" },
                  icons: { upper: "arrowGood", middle: "arrowNeutral", lower: "arrowBad" },
                },
              },
            ],
          },
        ],
      })
    );

    let instructions: string[] = [];
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
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
    const getCFClipRectInstruction = () => {
      const cfFillInstrIndex = instructions.findIndex((instr) => instr.includes("#6AA84F"));
      return instructions
        .slice(0, cfFillInstrIndex)
        .reverse()
        .find((instr) => instr.includes("rect"));
    };

    drawGridRenderer(ctx);

    box = getBoxFromText(gridRendererStore, cellContent);
    const maxIconBoxWidth = box.icons.left!.size + MIN_CF_ICON_MARGIN;
    expect(getCFClipRectInstruction()).toEqual(
      `context.rect(0, 0, ${DEFAULT_CELL_WIDTH}, ${DEFAULT_CELL_HEIGHT})`
    );

    expect(box.clipRect).toEqual({
      x: maxIconBoxWidth,
      y: 0,
      width: DEFAULT_CELL_WIDTH - maxIconBoxWidth,
      height: DEFAULT_CELL_HEIGHT,
    });

    resizeColumns(model, ["A"], maxIconBoxWidth - 3);
    instructions = [];
    drawGridRenderer(ctx);

    box = getBoxFromText(gridRendererStore, cellContent);
    expect(getCFClipRectInstruction()).toEqual(
      `context.rect(0, 0, ${maxIconBoxWidth - 3}, ${DEFAULT_CELL_HEIGHT})`
    );
    expect(box.clipRect).toEqual({
      x: maxIconBoxWidth,
      y: 0,
      width: 0,
      height: DEFAULT_CELL_HEIGHT,
    });
  });

  test("Cells are clipped with data validation icons", () => {
    let box: Box;
    const cellContent = "This is a long text that should be clipped";
    const { drawGridRenderer, model, gridRendererStore } = setRenderer();
    resizeColumns(model, ["A"], 10);
    setCellContent(model, "A1", cellContent);

    addDataValidation(model, "B1", "id", { type: "isBoolean", values: [] });

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
    drawGridRenderer(ctx);

    box = getBoxFromText(gridRendererStore, cellContent);
    const expectedClipRect = { x: 0, y: 0, width: 10, height: DEFAULT_CELL_HEIGHT };
    expect(box.clipRect).toEqual(expectedClipRect);

    addDataValidation(model, "B1", "id", {
      type: "isValueInList",
      values: ["a"],
      displayStyle: "arrow",
    });
    drawGridRenderer(ctx);

    box = getBoxFromText(gridRendererStore, cellContent);
    expect(box.clipRect).toEqual(expectedClipRect);
  });

  test.each([
    ["right", ["left"], { left: 1, right: 1, top: 1, bottom: 1 }], // align right, left border => clipped on cell zone
    ["right", ["left", "right"], { left: 1, right: 1, top: 1, bottom: 1 }], // align right, left + right border => clipped on cell zone
    ["right", ["right"], undefined], // align right, right border => no clip

    ["left", ["right"], { left: 1, right: 1, top: 1, bottom: 1 }], // align left, right border => clipped on cell zone
    ["left", ["left", "right"], { left: 1, right: 1, top: 1, bottom: 1 }], // align left, left + right border => clipped on cell zone
    ["left", ["left"], undefined], // align left, left border => no clip

    ["center", ["left", "right"], { left: 1, right: 1, top: 1, bottom: 1 }], // align center, left + right border => clipped on cell zone
    ["center", ["left"], { left: 1, right: 2, top: 1, bottom: 1 }], // align center, right border => clipped left
  ])(
    "cells aligned %s with borders %s are correctly clipped",
    (align: string, borders: string[], expectedClipRectZone: Zone | undefined) => {
      const cellContent = "This is a long text larger than a cell";
      const { drawGridRenderer, model, gridRendererStore } = setRenderer(
        new Model({
          sheets: [
            {
              id: "sheet1",
              colNumber: 3,
              rowNumber: 3,
              cells: { B2: cellContent },
              cols: { 1: { size: 10 } },
            },
          ],
        })
      );

      setStyle(model, "B2", { align: align as Align });

      for (const border of borders) {
        setZoneBorders(model, { position: border as BorderPosition }, ["B2"]);
      }

      const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
      drawGridRenderer(ctx);

      const box = getBoxFromText(gridRendererStore, cellContent);
      expect(box.clipRect).toEqual(
        expectedClipRectZone ? model.getters.getVisibleRect(expectedClipRectZone) : undefined
      );
    }
  );

  test("Cell overflowing text centered is cut correctly when there's a border", () => {
    const cellContent = "This is a long text larger than a cell";

    const model = new Model();
    resizeColumns(model, ["B"], 10);
    setCellContent(model, "B2", cellContent);
    setStyle(model, "B2", { align: "center" });
    setZoneBorders(model, { position: "right" }, ["B2"]);

    const { drawGridRenderer, gridRendererStore } = setRenderer(model);

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
    drawGridRenderer(ctx);
    const box = getBoxFromText(gridRendererStore, cellContent);
    const cell = getCell(model, "B2")!;
    const textWidth =
      model.getters.getTextWidth(cell.content, cell.style || {}) + MIN_CELL_TEXT_MARGIN;
    const expectedClipRect = model.getters.getVisibleRect({
      left: 0,
      right: 1,
      top: 1,
      bottom: 1,
    });
    const expectedCLipX = box.x + box.width / 2 - textWidth / 2;
    expect(box.clipRect).toEqual({
      ...expectedClipRect,
      x: expectedCLipX,
      width: expectedClipRect.x + expectedClipRect.width - expectedCLipX,
    });
  });

  test.each([
    ["right", { left: 1, right: 2, top: 0, bottom: 0 }], // align right, left border => clipped on cell zone
    ["left", { left: 2, right: 3, top: 0, bottom: 0 }], // align left, left + right border => clipped on cell zone
    ["center", { left: 1, right: 3, top: 0, bottom: 0 }], // align center, right border => clipped left
  ])(
    "Cell text overflowing on multiple cells is cut as soon as it encounter a border with align %s",
    (align: string, expectedClipRectZone: Zone | undefined) => {
      const cellContent = "This is a very vey very very very very long text larger than a cell";
      const { drawGridRenderer, model, gridRendererStore } = setRenderer(
        new Model({
          sheets: [
            {
              id: "sheet1",
              colNumber: 6,
              rowNumber: 6,
              cells: { C1: cellContent },
              cols: { 1: { size: 10 }, 2: { size: 10 }, 3: { size: 10 } },
            },
          ],
        })
      );

      setZoneBorders(model, { position: "right" }, ["A1"]);
      setStyle(model, "C1", { align: align as Align });
      setZoneBorders(model, { position: "left" }, ["E1"]);

      const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
      drawGridRenderer(ctx);

      const box = getBoxFromText(gridRendererStore, cellContent);
      expect(box.clipRect).toEqual(
        expectedClipRectZone ? model.getters.getVisibleRect(expectedClipRectZone) : undefined
      );
    }
  );
  test("Box clip rect computation take the text margin into account", () => {
    let box: Box;
    const { drawGridRenderer, model, gridRendererStore } = setRenderer(
      new Model({ sheets: [{ id: "sheet1", colNumber: 1, rowNumber: 1 }] })
    );
    resizeColumns(model, ["A"], 10);

    // Text + MIN_CELL_TEXT_MARGIN  <= col size, no clip
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {});
    let text = "a".repeat(10 - MIN_CELL_TEXT_MARGIN);
    setCellContent(model, "A1", text);
    drawGridRenderer(ctx);

    box = getBoxFromText(gridRendererStore, text);
    expect(box.clipRect).toBeUndefined();

    // Text + MIN_CELL_TEXT_MARGIN  > col size, clip text
    ctx = new MockGridRenderingContext(model, 1000, 1000, {});
    text = "a".repeat(10);
    setCellContent(model, "A1", text);
    drawGridRenderer(ctx);

    box = getBoxFromText(gridRendererStore, text);
    expect(box.clipRect).toEqual({ x: 0, y: 0, width: 10, height: DEFAULT_CELL_HEIGHT });
  });

  test.each(["A1", "A1:A2", "A1:A2,B1:B2", "A1,C1"])(
    "compatible copied zones %s are all outlined with dots",
    (targetXc) => {
      const { drawGridRenderer, model } = setRenderer();
      copy(model, ...targetXc.split(","));
      const { ctx, isDotOutlined, reset } = watchClipboardOutline(model);
      drawGridRenderer(ctx);

      const copiedTarget = target(targetXc);
      expect(isDotOutlined(copiedTarget)).toBeTruthy();
      paste(model, "A10");
      reset();
      drawGridRenderer(ctx);

      expect(isDotOutlined(copiedTarget)).toBeFalsy();
    }
  );

  test.each(["A1,A2", "A1:A2,A4:A5"])(
    "only last copied non-compatible zones %s is outlined with dots",
    (targetXc) => {
      const { drawGridRenderer, model } = setRenderer();
      copy(model, ...targetXc.split(","));
      const { ctx, isDotOutlined, reset } = watchClipboardOutline(model);
      drawGridRenderer(ctx);

      const copiedTarget = target(targetXc);
      const expectedOutlinedZone = copiedTarget.slice(-1);
      expect(isDotOutlined(expectedOutlinedZone)).toBeTruthy();
      paste(model, "A10");
      reset();
      drawGridRenderer(ctx);

      expect(isDotOutlined(expectedOutlinedZone)).toBeFalsy();
    }
  );

  test.each([
    (model) => setCellContent(model, "B15", "hello"),
    (model) => addColumns(model, "after", "B", 1),
    (model) => deleteColumns(model, ["K"]),
  ])("copied zone outline is removed at first change to the grid", (coreOperation) => {
    const { drawGridRenderer, model } = setRenderer();
    copy(model, "A1:A2");
    const { ctx, isDotOutlined, reset } = watchClipboardOutline(model);
    drawGridRenderer(ctx);

    const copiedTarget = target("A1:A2");
    expect(isDotOutlined(copiedTarget)).toBeTruthy();
    coreOperation(model);
    reset();
    drawGridRenderer(ctx);

    expect(isDotOutlined(copiedTarget)).toBeFalsy();
  });

  test.each([
    ["dashboard" as Mode, { x: 0, y: 0, width: DEFAULT_CELL_WIDTH, height: DEFAULT_CELL_HEIGHT }],
    ["normal" as Mode, { x: 0, y: 0, width: DEFAULT_CELL_WIDTH, height: DEFAULT_CELL_HEIGHT }],
  ])("A1 starts at the upper left corner with mode %s", (mode, expectedRect) => {
    const model = new Model({}, { mode });
    const rect = model.getters.getVisibleRect(toZone("A1"));
    expect(rect).toEqual(expectedRect);
  });

  test("Error red triangle is correctly displayed/hidden", () => {
    /* Test if the error upper-right red triangle is correctly displayed
     * according to the kind of error
     */
    const { drawGridRenderer, model, gridRendererStore } = setRenderer(
      new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 10,
            rowNumber: 1,
            cells: {
              A1: "=NA()",
              B1: "=B1",
              C1: "=A0",
              D1: "=(+",
              E1: "=5/0",
              F1: "=SQRT(-1)",
            },
            conditionalFormats: [],
          },
        ],
      })
    );

    const filled: number[][] = [];
    let current: number[] = [0, 0];

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onFunctionCall: (val, args) => {
        if (val === "moveTo") {
          current = [args[0], args[1]];
        } else if (val === "fill") {
          filled.push([current[0], current[1]]);
        }
      },
    });
    drawGridRenderer(ctx);

    const boxA1 = getBoxFromText(gridRendererStore, "#N/A"); //NotAvailableError => Shouldn't display
    expect(boxA1.isError).toBeFalsy();
    const boxB1 = getBoxFromText(gridRendererStore, "#CYCLE"); //CycleError => Should display
    expect(boxB1.isError).toBeTruthy();
    expect(filled[0][0]).toBe(boxB1.x + boxB1.width - 5);
    expect(filled[0][1]).toBe(boxB1.y);
    const boxC1 = getBoxFromText(gridRendererStore, "#REF"); //BadReferenceError => Should display
    expect(boxB1.isError).toBeTruthy();
    expect(filled[1][0]).toBe(boxC1.x + boxC1.width - 5);
    expect(filled[1][1]).toBe(boxC1.y);
    const boxD1 = getBoxFromText(gridRendererStore, "#BAD_EXPR"); //BadExpressionError => Should display
    expect(boxD1.isError).toBeTruthy();
    expect(filled[2][0]).toBe(boxD1.x + boxD1.width - 5);
    expect(filled[2][1]).toBe(boxD1.y);
    const boxE1 = getBoxFromText(gridRendererStore, "#DIV/0!"); // DivisionByZero => Should display
    expect(boxE1.isError).toBeTruthy();
    expect(filled[3][0]).toBe(boxE1.x + boxE1.width - 5);
    expect(filled[3][1]).toBe(boxE1.y);
    const boxF1 = getBoxFromText(gridRendererStore, "#ERROR"); // GeneralError => Should display
    expect(boxF1.isError).toBeTruthy();
    expect(filled[4][0]).toBe(boxF1.x + boxF1.width - 5);
    expect(filled[4][1]).toBe(boxF1.y);
  });

  test("Do not draw gridLines over colored cells in dashboard mode", () => {
    const CellFillColor = "#fe0000";
    const { drawGridRenderer, model } = setRenderer(
      new Model({
        sheets: [{ id: "Sheet1", name: "Sheet1", styles: { A1: 1, A2: 1 } }],
        styles: { 1: { fillColor: CellFillColor } },
      })
    );

    let strokeColors: string[];
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onFunctionCall: (val, _, renderingContext) => {
        if (val === "strokeRect") {
          strokeColors.push(renderingContext.ctx.strokeStyle as string);
        }
      },
    });

    // Default Model displaying grid lines
    strokeColors = [];
    drawGridRenderer(ctx);

    expect(strokeColors).toContain(CELL_BORDER_COLOR);
    expect(strokeColors).toContain(SELECTION_BORDER_COLOR);

    // dashboard mode
    model.updateMode("dashboard");
    strokeColors = [];
    drawGridRenderer(ctx);

    expect(strokeColors).toEqual([]);
  });

  test("Do not draw gridLines over colored cells while hiding grid lines", () => {
    const CellFillColor = "#fe0000";
    const { drawGridRenderer, model } = setRenderer(
      new Model({
        sheets: [{ id: "Sheet1", name: "Sheet1", styles: { A1: 1, A2: 2 } }],
        styles: { 1: { fillColor: CellFillColor } },
      })
    );

    let strokeColors: string[];
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onFunctionCall: (val, _, renderingContext) => {
        if (val === "strokeRect") {
          strokeColors.push(renderingContext.ctx.strokeStyle as string);
        }
      },
    });

    // Default Model displaying grid lines
    strokeColors = [];
    drawGridRenderer(ctx);

    expect(strokeColors).toContain(CELL_BORDER_COLOR);
    expect(strokeColors).toContain(SELECTION_BORDER_COLOR);

    // model without grid lines
    model.dispatch("SET_GRID_LINES_VISIBILITY", { sheetId: "Sheet1", areGridLinesVisible: false });
    strokeColors = [];
    drawGridRenderer(ctx);

    expect(strokeColors).toEqual([
      SELECTION_BORDER_COLOR, // selection drawGrid
      SELECTION_BORDER_COLOR, // selection drawGrid
    ]);
  });

  test("draw text position depends on vertical align", () => {
    const { drawGridRenderer, model } = setRenderer(
      new Model({
        sheets: [
          {
            id: 1,
            colNumber: 1,
            rowNumber: 1,
            rows: { 0: { size: DEFAULT_CELL_HEIGHT * 2 } },
            cells: { A1: "kikou" },
          },
        ],
      })
    );

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onFunctionCall: (val, args) => {
        if (val === "fillText") {
          verticalStartPoints.push(args[2]); // args[2] corespond to "y"
        }
      },
    });

    // vertical top point
    let verticalStartPoints: any[] = [];
    setStyle(model, "A1", { verticalAlign: "top" });
    drawGridRenderer(ctx);

    expect(verticalStartPoints[0]).toEqual(5);

    // vertical middle point
    verticalStartPoints = [];
    setStyle(model, "A1", { verticalAlign: "middle" });
    drawGridRenderer(ctx);

    expect(verticalStartPoints[0]).toEqual(18);

    // vertical bottom point
    verticalStartPoints = [];
    setStyle(model, "A1", { verticalAlign: "bottom" });
    drawGridRenderer(ctx);

    expect(verticalStartPoints[0]).toEqual(30);
  });

  test("keep the text vertically align to the top if not enough spaces to display it", () => {
    const { drawGridRenderer, model } = setRenderer(
      new Model({
        sheets: [
          {
            id: 1,
            colNumber: 1,
            rowNumber: 1,
            rows: { 0: { size: DEFAULT_CELL_HEIGHT } },
            cells: {
              A1: 'KIKOU: Interjection utilisée par les adolescents pour signifier "salut", "coucou", sur support électronique.',
            },
          },
        ],
      })
    );

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onFunctionCall: (val, args) => {
        if (val === "fillText") {
          verticalStartPoints.push(args[2]); // args[2] corespond to "y"
        }
      },
    });

    setStyle(model, "A1", { wrapping: "wrap" });

    // with verticalAlign top
    let verticalStartPoints: any[] = [];
    setStyle(model, "A1", { verticalAlign: "top" });
    drawGridRenderer(ctx);

    expect(verticalStartPoints[0]).toEqual(5);

    // with verticalAlign middle
    verticalStartPoints = [];
    setStyle(model, "A1", { verticalAlign: "middle" });
    drawGridRenderer(ctx);

    expect(verticalStartPoints[0]).toEqual(5);

    // with verticalAlign bottom
    verticalStartPoints = [];
    setStyle(model, "A1", { verticalAlign: "bottom" });
    drawGridRenderer(ctx);

    expect(verticalStartPoints[0]).toEqual(5);
  });

  describe("Overflowing cells background", () => {
    let model: Model;
    let fillWhiteRectInstructions: number[][];
    let ctx: MockGridRenderingContext;
    let drawGridRenderer: (ctx: GridRenderingContext) => void;
    let gridRendererStore: GridRenderer;

    function getCellOverflowingBackgroundDims() {
      // first draw of white rectangle is the spreadsheet's background
      const instruction = fillWhiteRectInstructions[1];
      if (!instruction) {
        return undefined;
      }
      return {
        x: instruction[0],
        y: instruction[1],
        width: instruction[2],
        height: instruction[3],
      };
    }

    beforeEach(() => {
      ({ drawGridRenderer, model, gridRendererStore } = setRenderer(
        new Model({ sheets: [{ colNumber: 10, rowNumber: 10 }] })
      ));
      fillWhiteRectInstructions = [];
      let drawingWhiteBackground = false;
      ctx = new MockGridRenderingContext(model, 1000, 1000, {
        onSet: (key, value) => {
          drawingWhiteBackground = key === "fillStyle" && toHex(value) === "#FFFFFF";
        },
        onFunctionCall: (key, args) => {
          if (key !== "fillRect" || !drawingWhiteBackground) {
            return;
          }
          fillWhiteRectInstructions.push(args);
        },
      });
    });

    test("Non-overflowing cell have no overflowing background", () => {
      setCellContent(model, "A1", "Short text");
      drawGridRenderer(ctx);

      expect(getCellOverflowingBackgroundDims()).toBeUndefined();
    });

    test("Cell overflowing in x overflowing background", () => {
      const overflowingText = "Text longer than a column";
      setCellContent(model, "A1", overflowingText);
      resizeColumns(model, ["A"], 10);
      drawGridRenderer(ctx);

      const box = getBoxFromText(gridRendererStore, overflowingText);
      expect(getCellOverflowingBackgroundDims()).toMatchObject({
        x: box.x + ctx.thinLineWidth / 2,
        y: box.y + ctx.thinLineWidth / 2,
        width: box.content!.width - ctx.thinLineWidth * 2,
        height: box.height - ctx.thinLineWidth,
      });
    });

    test("Multi-line text overflowing in x overflowing background", () => {
      const longLine = "Text longer than a column";
      const longerLine = "Text longer than a column but even longer";

      setCellContent(model, "A1", longLine + NEWLINE + longerLine);
      resizeColumns(model, ["A"], 10);
      drawGridRenderer(ctx);

      const box = getBoxFromText(gridRendererStore, longLine + " " + longerLine);
      expect(getCellOverflowingBackgroundDims()).toMatchObject({
        x: box.x + ctx.thinLineWidth / 2,
        y: box.y + ctx.thinLineWidth / 2,
        width: longerLine.length + MIN_CELL_TEXT_MARGIN - ctx.thinLineWidth * 2,
        height: box.height - ctx.thinLineWidth,
      });
    });

    test("Cell overflowing in y overflowing background", () => {
      const overflowingText = "TOO HIGH";
      const fontSize = 26;
      setCellContent(model, "A1", overflowingText);
      setStyle(model, "A1", { fontSize });
      resizeRows(model, [0], Math.floor(fontSizeInPixels(fontSize) / 2));
      drawGridRenderer(ctx);

      const box = getBoxFromText(gridRendererStore, overflowingText);
      expect(getCellOverflowingBackgroundDims()).toMatchObject({
        x: box.x + ctx.thinLineWidth / 2,
        y: box.y + ctx.thinLineWidth / 2,
        width: box.content!.width - ctx.thinLineWidth * 2,
        height: box.height - ctx.thinLineWidth,
      });
    });
  });

  describe("Multi-line text rendering", () => {
    let model: Model;
    let ctx: MockGridRenderingContext;
    let renderedTexts: String[];
    let drawGridRenderer: (ctx: GridRenderingContext) => void;
    let gridRendererStore: GridRenderer;

    beforeEach(() => {
      ({ drawGridRenderer, model, gridRendererStore } = setRenderer());
      renderedTexts = [];
      ctx = new MockGridRenderingContext(model, 1000, 1000, {
        onFunctionCall: (fn, args) => {
          if (fn === "fillText") {
            renderedTexts.push(args[0]);
          }
        },
      });
    });

    test("Wrapped text is displayed over multiple lines", () => {
      const overFlowingContent = "ThisIsAVeryVeryLongText";
      setCellContent(model, "A1", overFlowingContent);
      setStyle(model, "A1", { wrapping: "wrap" });
      resizeColumns(model, ["A"], 14);

      // Split length = 14 - 2*MIN_CELL_TEXT_MARGIN = 6 letters (1 letter = 1px in the tests)
      const splittedText = ["ThisIs", "AVeryV", "eryLon", "gText"];

      drawGridRenderer(ctx);

      expect(renderedTexts.slice(0, 4)).toEqual(splittedText);
    });

    test("Wrapped text try to not split words in multiple lines if the word is small enough", () => {
      const overFlowingContent = "W Word2 W3 WordThatIsTooLong";
      setCellContent(model, "A1", overFlowingContent);
      setStyle(model, "A1", { wrapping: "wrap" });
      resizeColumns(model, ["A"], 16);

      drawGridRenderer(ctx);

      expect(renderedTexts.slice(0, 5)).toEqual(["W Word2", "W3", "WordThat", "IsTooLon", "g"]);
    });

    test("Texts with newlines are displayed over multiple lines", () => {
      setCellContent(model, "A1", "Line1\nLine2\rLine3\r\nLine4");
      drawGridRenderer(ctx);

      expect(renderedTexts.slice(0, 4)).toEqual(["Line1", "Line2", "Line3", "Line4"]);
    });

    test("Box of Multi-line text have the width of the longest line", () => {
      const longLine = "Text longer than a column";
      const longerLine = "Text longer than a column but even longer";

      setCellContent(model, "A1", longLine + NEWLINE + longerLine);
      resizeColumns(model, ["A"], 10);
      drawGridRenderer(ctx);

      const box = getBoxFromText(gridRendererStore, longLine + " " + longerLine);
      expect(box.isOverflow).toBeTruthy();
      expect(box.content?.width).toEqual(longerLine.length + MIN_CELL_TEXT_MARGIN);
    });
  });

  test("Can render borders with different colors on the same cell", () => {
    const { drawGridRenderer, model } = setRenderer();
    const colors = {
      left: "#FF0000",
      right: "#888800",
      top: "#00FF00",
      bottom: "#008888",
    };
    for (const [position, color] of Object.entries(colors)) {
      setZoneBorders(
        model,
        {
          position: position as BorderPosition,
          color,
          style: "thin",
        },
        ["A1"]
      );
    }

    const renderedBorders = {};
    let currentColor = "";
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "strokeStyle") {
          if (Object.values(colors).includes(value)) {
            currentColor = value;
          }
        }
      },
      onFunctionCall: (val, args) => {
        if (currentColor !== "" && val === "moveTo") {
          renderedBorders[currentColor] = { start: args };
        } else if (currentColor !== "" && val === "lineTo") {
          renderedBorders[currentColor].end = args;
          currentColor = "";
        }
      },
    });
    drawGridRenderer(ctx);

    expect(renderedBorders).toEqual({
      [colors.left]: {
        start: [0, 0],
        end: [0, DEFAULT_CELL_HEIGHT],
      },
      [colors.top]: {
        start: [0, 0],
        end: [DEFAULT_CELL_WIDTH, 0],
      },
      [colors.right]: {
        start: [DEFAULT_CELL_WIDTH, 0],
        end: [DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT],
      },
      [colors.bottom]: {
        start: [0, DEFAULT_CELL_HEIGHT],
        end: [DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT],
      },
    });
  });

  test("Thin border is correctly rendered", () => {
    const { drawGridRenderer, model } = setRenderer();
    setZoneBorders(
      model,
      {
        position: "left",
        style: "thin",
      },
      ["A1"]
    );

    let lineDash: any[] = [];
    let lineWidth = 1;
    const borderRenderingContext: [number, any[]][] = [];
    let isDrawing = false;
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "lineWidth") {
          lineWidth = value;
        }
      },
      onFunctionCall: (val, args) => {
        if (val === "setLineDash") {
          lineDash = args;
        } else if (val === "moveTo" && args[0] === 0 && args[1] === 0) {
          isDrawing = true;
        } else if (
          val === "lineTo" &&
          args[0] === 0 &&
          args[1] === DEFAULT_CELL_HEIGHT &&
          isDrawing
        ) {
          borderRenderingContext.push([lineWidth, lineDash]);
          isDrawing = false;
        }
      },
    });
    drawGridRenderer(ctx);

    expect(borderRenderingContext).toEqual([[1, []]]);
  });

  test("Medium border is correctly rendered", () => {
    const { drawGridRenderer, model } = setRenderer();
    setZoneBorders(
      model,
      {
        position: "left",
        style: "medium",
        color: "#FF0000",
      },
      ["A1"]
    );

    let lineDash: any[] = [];
    let lineWidth = 1;
    const borderRenderingContext: [number, any[]][] = [];
    let isDrawing = false;
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "lineWidth") {
          lineWidth = value;
        }
      },
      onFunctionCall: (val, args) => {
        if (val === "setLineDash") {
          lineDash = args;
        } else if (val === "moveTo" && args[0] === 0.5 && args[1] === -0.5) {
          isDrawing = true;
        } else if (
          val === "lineTo" &&
          args[0] === 0.5 &&
          args[1] === DEFAULT_CELL_HEIGHT + 1.5 &&
          isDrawing
        ) {
          borderRenderingContext.push([lineWidth, lineDash]);
          isDrawing = false;
        }
      },
    });
    drawGridRenderer(ctx);

    expect(borderRenderingContext).toEqual([[2, []]]);
  });

  test("Thick border is correctly rendered", () => {
    const { drawGridRenderer, model } = setRenderer();
    setZoneBorders(
      model,
      {
        position: "left",
        style: "thick",
      },
      ["A1"]
    );

    let lineDash: any[] = [];
    let lineWidth = 1;
    const borderRenderingContext: [number, any[]][] = [];
    let isDrawing = false;
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "lineWidth") {
          lineWidth = value;
        }
      },
      onFunctionCall: (val, args) => {
        if (val === "setLineDash") {
          lineDash = args;
        } else if (val === "moveTo" && args[0] === 0 && args[1] === -1) {
          isDrawing = true;
        } else if (
          val === "lineTo" &&
          args[0] === 0 &&
          args[1] === DEFAULT_CELL_HEIGHT + 1 &&
          isDrawing
        ) {
          borderRenderingContext.push([lineWidth, lineDash]);
          isDrawing = false;
        }
      },
    });
    drawGridRenderer(ctx);

    expect(borderRenderingContext).toEqual([[3, []]]);
  });

  test("Dashed border is correctly rendered", () => {
    const { drawGridRenderer, model } = setRenderer();
    setZoneBorders(
      model,
      {
        position: "left",
        style: "dashed",
      },
      ["A1"]
    );

    let lineDash: any[] = [];
    let lineWidth = 1;
    const borderRenderingContext: [number, any[]][] = [];
    let isDrawing = false;
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "lineWidth") {
          lineWidth = value;
        }
      },
      onFunctionCall: (val, args) => {
        if (val === "setLineDash") {
          lineDash = args;
        } else if (val === "moveTo" && args[0] === 0 && args[1] === 0) {
          isDrawing = true;
        } else if (
          val === "lineTo" &&
          args[0] === 0 &&
          args[1] === DEFAULT_CELL_HEIGHT &&
          isDrawing
        ) {
          borderRenderingContext.push([lineWidth, lineDash]);
          isDrawing = false;
        }
      },
    });
    drawGridRenderer(ctx);

    expect(borderRenderingContext).toEqual([[1, [[1, 3]]]]);
  });

  test("Dotted border is correctly rendered", () => {
    const { drawGridRenderer, model } = setRenderer();
    setZoneBorders(
      model,
      {
        position: "left",
        style: "dotted",
      },
      ["A1"]
    );

    let lineDash: any[] = [];
    let lineWidth = 1;
    const borderRenderingContext: [number, any[]][] = [];
    let isDrawing = false;
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "lineWidth") {
          lineWidth = value;
        }
      },
      onFunctionCall: (val, args) => {
        if (val === "setLineDash") {
          lineDash = args;
        } else if (val === "moveTo" && args[0] === 0 && args[1] === 0.5) {
          isDrawing = true;
        } else if (
          val === "lineTo" &&
          args[0] === 0 &&
          args[1] === DEFAULT_CELL_HEIGHT + 0.5 &&
          isDrawing
        ) {
          borderRenderingContext.push([lineWidth, lineDash]);
          isDrawing = false;
        }
      },
    });
    drawGridRenderer(ctx);

    expect(borderRenderingContext).toEqual([[1, [[1, 1]]]]);
  });

  test("Cells of splilled formula are empty is we display the formulas", () => {
    const model = new Model({ sheets: [{ colNumber: 2, rowNumber: 2 }] });
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    setCellContent(model, "A1", "=MUNIT(2)");
    const { drawGridRenderer, gridRendererStore } = setRenderer(model);
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
    drawGridRenderer(ctx);
    const boxes = gridRendererStore["getGridBoxes"](toZone("A1:B2"));
    const boxesText = boxes.map((box) => box.content?.textLines.join(""));
    expect(boxesText).toEqual(["=MUNIT(2)", "", "", ""]);
  });

  describe("boolean DataValidations are correctly rendered", () => {
    let renderedTexts: string[];
    let ctx: MockGridRenderingContext;
    let model: Model;
    let drawGridRenderer: (ctx: GridRenderingContext) => void;

    beforeEach(() => {
      ({ drawGridRenderer, model } = setRenderer());
      renderedTexts = [];
      ctx = new MockGridRenderingContext(model, 1000, 1000, {
        onFunctionCall: (fn, args) => {
          if (fn === "fillText") {
            renderedTexts.push(args[0]);
          }
        },
      });
    });

    test("Valid checkbox value is not rendered", () => {
      addDataValidation(model, "B2", "id", { type: "isBoolean", values: [] });
      setCellContent(model, "B2", "TRUE");
      drawGridRenderer(ctx);
      expect(renderedTexts).not.toContain("TRUE");
    });

    test("Invalid checkbox value is rendered", () => {
      addDataValidation(model, "B2", "id", { type: "isBoolean", values: [] });
      setCellContent(model, "B2", "hello");
      drawGridRenderer(ctx);
      expect(renderedTexts).toContain("hello");
    });
  });

  describe("chip DataValidations are correctly rendered", () => {
    test("chip is rendered", () => {
      const { drawGridRenderer, model } = setRenderer();
      const roundRectArgs: any[] = [];
      let fillStyle: string = "";
      const criterion: DataValidationCriterion = {
        type: "isValueInList",
        values: ["hello"],
        colors: { hello: "#123456" },
        displayStyle: "chip",
      };
      addDataValidation(model, "A1", "id", criterion);
      const ctx = new MockGridRenderingContext(model, 1000, 1000, {
        onFunctionCall: (key, args) => {
          if (key === "roundRect") {
            roundRectArgs.push(args);
            expect(fillStyle).toBe("#123456");
          }
        },
        onSet: (key, value) => {
          if (key === "fillStyle") {
            fillStyle = value;
          }
        },
      });
      setCellContent(model, "A1", "hello");
      drawGridRenderer(ctx);
      expect(roundRectArgs).toHaveLength(1);
      expect(roundRectArgs[0]).toEqual([5, 5, 86, 15, 10]);
    });

    test("chip boxes are colored", () => {
      const { drawGridRenderer, model, gridRendererStore } = setRenderer();
      const criterion: DataValidationCriterion = {
        type: "isValueInList",
        values: ["hello"],
        displayStyle: "chip",
      };
      addDataValidation(model, "A1", "id", criterion);
      const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
      drawGridRenderer(ctx);
      let [box] = gridRendererStore["getGridBoxes"](toZone("A1"));
      expect(box.chip).toBeUndefined();
      setCellContent(model, "A1", "hello");
      drawGridRenderer(ctx);
      [box] = gridRendererStore["getGridBoxes"](toZone("A1"));
      expect(box.style.textColor).toBeUndefined();
      expect(box.chip).toEqual({
        color: "#E7E9ED", // default color
        height: 15,
        width: 86,
        x: 5,
        y: 5,
      });
      addDataValidation(model, "A1", "id", {
        ...criterion,
        colors: { hello: "#FF0000" },
      });
      drawGridRenderer(ctx);
      [box] = gridRendererStore["getGridBoxes"](toZone("A1"));
      expect(box.style.textColor).toBe("#FFE5E5");
      expect(box.chip).toEqual({
        color: "#FF0000",
        height: 15,
        width: 86,
        x: 5,
        y: 5,
      });
    });

    test("chip is rendered next to CF icon", () => {
      const { drawGridRenderer, model, gridRendererStore } = setRenderer();
      const criterion: DataValidationCriterion = {
        type: "isValueInList",
        values: ["1"],
        displayStyle: "chip",
      };
      const sheetId = model.getters.getActiveSheetId();
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          id: "1",
          rule: {
            type: "IconSetRule",
            lowerInflectionPoint: { type: "number", value: "7", operator: "gt" },
            upperInflectionPoint: { type: "number", value: "7", operator: "gt" },
            icons: {
              upper: "arrowGood",
              middle: "arrowNeutral",
              lower: "arrowBad",
            },
          },
        },
        ranges: toRangesData(sheetId, "A1:A5"),
        sheetId,
      });
      addDataValidation(model, "A1", "id", criterion);
      setCellContent(model, "A1", "1");
      const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
      drawGridRenderer(ctx);
      const [box] = gridRendererStore["getGridBoxes"](toZone("A1"));
      expect(box.chip).toEqual({
        color: "#E7E9ED",
        height: 15,
        width: 69,
        x: 22,
        y: 5,
      });
    });
  });

  test("Repeated character in format is repeated to fill the column", () => {
    const { drawGridRenderer, model, gridRendererStore } = setRenderer();
    setCellContent(model, "A1", "1");
    setFormat(model, "A1", "* 0");
    resizeColumns(model, ["A"], 20);

    const ctx = new MockGridRenderingContext(model, 1000, 1000, {});
    drawGridRenderer(ctx);

    let box = gridRendererStore["getGridBoxes"](toZone("A1")).filter((box) => box.content)[0];
    const expectedSpaces = 20 - 2 * MIN_CELL_TEXT_MARGIN;
    expect(box.content?.textLines).toEqual(["1".padStart(expectedSpaces)]);

    setFormat(model, "A1", "0*c");
    drawGridRenderer(ctx);
    box = gridRendererStore["getGridBoxes"](toZone("A1")).filter((box) => box.content)[0];
    expect(box.content?.textLines).toEqual(["1".padEnd(expectedSpaces, "c")]);
  });

  test("Cells with repeated character format are aligned to the left", () => {
    const { drawGridRenderer, model } = setRenderer();
    setCellContent(model, "A1", "1");

    let textAligns: string[] = [];
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => (key === "textAlign" ? textAligns.push(value) : null),
    });

    drawGridRenderer(ctx);
    expect(textAligns).toEqual(["right", "center"]); // center for headers

    textAligns = [];
    setCellFormat(model, "A1", "dd* ");
    drawGridRenderer(ctx);
    expect(textAligns).toEqual(["left", "center"]); // center for headers
  });

  test("Each frozen pane is clipped in the grid", () => {
    const model = new Model({ sheets: [{ colNumber: 7, rowNumber: 7 }] });
    const { drawGridRenderer } = setRenderer(model);
    setCellContent(model, "A1", "1");
    freezeColumns(model, 2);
    freezeRows(model, 1);
    // Don't account for headers for the grid
    model.updateMode("dashboard");
    const spyFn = jest.fn();
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onFunctionCall: (key, args) => {
        if (["rect", "clip"].includes(key)) {
          spyFn(key, args);
        }
      },
    });
    drawGridRenderer(ctx);
    expect(spyFn).toHaveBeenCalledTimes(8);
    expect(spyFn).toHaveBeenNthCalledWith(1, "rect", [
      0,
      0,
      DEFAULT_CELL_WIDTH * 2,
      DEFAULT_CELL_HEIGHT,
    ]);
    expect(spyFn).toHaveBeenNthCalledWith(2, "clip", []);
    expect(spyFn).toHaveBeenNthCalledWith(3, "rect", [
      DEFAULT_CELL_WIDTH * 2,
      0,
      760,
      DEFAULT_CELL_HEIGHT,
    ]);
    expect(spyFn).toHaveBeenNthCalledWith(4, "clip", []);
    expect(spyFn).toHaveBeenNthCalledWith(5, "rect", [
      0,
      DEFAULT_CELL_HEIGHT,
      DEFAULT_CELL_WIDTH * 2,
      951,
    ]);
    expect(spyFn).toHaveBeenNthCalledWith(6, "clip", []);
    expect(spyFn).toHaveBeenNthCalledWith(7, "rect", [
      DEFAULT_CELL_WIDTH * 2,
      DEFAULT_CELL_HEIGHT,
      760,
      951,
    ]);
    expect(spyFn).toHaveBeenNthCalledWith(8, "clip", []);
  });

  test("Applying style hideGridLines on a cell skips the drawing of the grid lines for this cell", () => {
    const model = new Model();
    const { drawGridRenderer } = setRenderer(model);

    let strokeRectCalls: string[];
    const ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onFunctionCall: (key, args) => {
        if (key === "strokeRect") {
          strokeRectCalls.push(`context.${key}(${args.map((a) => JSON.stringify(a)).join(", ")})`);
        }
      },
    });

    strokeRectCalls = [];
    drawGridRenderer(ctx);

    const baseNumberOfStrokeRect = strokeRectCalls.length;

    setStyle(model, "A1:B2", { hideGridLines: true });
    strokeRectCalls = [];
    drawGridRenderer(ctx);

    expect(strokeRectCalls.length).toBe(baseNumberOfStrokeRect - 4);
  });
});
