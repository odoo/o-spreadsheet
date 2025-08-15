import { Model } from "../../src";
import { getDefaultSheetViewSize } from "../../src/constants";
import { GridRenderingContext, Viewport, Zone } from "../../src/types";
import { MockCanvasRenderingContext2D } from "../setup/canvas.mock";

MockCanvasRenderingContext2D.prototype.measureText = function () {
  return { width: 100 };
};

interface ContextObserver {
  onSet?(key, val): void;
  onGet?(key): void;
  onFunctionCall?(fn: string, args: any[]): void;
}

export class MockGridRenderingContext implements GridRenderingContext {
  _context = document.createElement("canvas").getContext("2d");
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  dpr = 1;
  thinLineWidth = 0.4;

  constructor(model: Model, width: number, height: number, observer: ContextObserver) {
    model.dispatch("RESIZE_SHEETVIEW", { width, height, gridOffsetX: 0, gridOffsetY: 0 });
    this.viewport = model.getters.getActiveMainViewport();

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
