import {
  Canvas as NodeCanvas,
  CanvasRenderingContext2D as NodeCanvasRenderingContext2D,
  createCanvas,
} from "canvas";
import { Model } from "../../src";
import { getDefaultSheetViewSize } from "../../src/constants";
import { GridRenderingContext, Viewport, Zone } from "../../src/types";
import { MockCanvasRenderingContext2D } from "../setup/canvas.mock";

MockCanvasRenderingContext2D.prototype.measureText = function () {
  return { width: 100, fontBoundingBoxAscent: 1, fontBoundingBoxDescent: 1 };
};

interface ContextObserver {
  onSet?(key, val): void;
  onGet?(key): void;
  onFunctionCall?(fn: string, args: any[], renderingContext: MockGridRenderingContext): void;
}

/**
 * A mock rendering context for testing purposes. By default it has no gridOffset to draw headers.
 */
export class MockGridRenderingContext implements GridRenderingContext {
  _context: NodeCanvasRenderingContext2D | RenderingContext;
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  dpr = 1;
  thinLineWidth = 0.4;
  private canvas: NodeCanvas | HTMLCanvasElement;

  constructor(
    model: Model,
    width: number,
    height: number,
    observer: ContextObserver,
    private mode: "nodeCanvas" | "mockCanvas" = "mockCanvas"
  ) {
    model.dispatch("RESIZE_SHEETVIEW", { width, height, gridOffsetX: 0, gridOffsetY: 0 });
    this.viewport = model.getters.getActiveMainViewport();

    const handler = {
      get: (target, val) => {
        if (typeof target[val] === "function") {
          return (...args) => {
            if (observer.onFunctionCall) {
              observer.onFunctionCall(val, args, this);
            }
            if (val !== "drawImage") {
              return target[val].apply(target, args);
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

    this.canvas =
      mode === "nodeCanvas" ? createCanvas(width, height) : document.createElement("canvas");
    this.canvas = createCanvas(width, height);

    this._context = this.canvas.getContext("2d")!;
    this.ctx = new Proxy(this._context, handler);
  }

  screenshot() {
    if (this.mode === "mockCanvas") {
      throw new Error("screenshot is not available with a mockCanvas");
    }
    return (this.canvas as NodeCanvas).toBuffer("image/png");
  }
}

/**
 * Create a rendering context watching the blue dotted
 * outline around copied zones
 */
export function watchClipboardOutline(model: Model) {
  const sheetViewSize = getDefaultSheetViewSize();
  let lineDash = false;
  let outlinedRects: any[][] = [];
  const ctx = new MockGridRenderingContext(model, sheetViewSize, sheetViewSize, {
    onFunctionCall: (val, args) => {
      if (val === "setLineDash") {
        lineDash = true;
      } else if (lineDash && val === "strokeRect") {
        outlinedRects.push(args);
      } else {
        lineDash = false;
      }
    },
  });
  const isDotOutlined = (zones: Zone[]): boolean => {
    return zones.every((zone) => {
      const { x, y, width, height } = model.getters.getVisibleRect(zone);
      return outlinedRects.some(
        (rect) => rect[0] === x && rect[1] === y && rect[2] === width && rect[3] === height
      );
    });
  };
  const reset = () => {
    outlinedRects = [];
    lineDash = false;
  };
  return { ctx, isDotOutlined, reset };
}
