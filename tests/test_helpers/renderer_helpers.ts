import {
  getDefaultSheetViewSize,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "@odoo/o-spreadsheet-engine/constants";
import { SheetViewports } from "@odoo/o-spreadsheet-engine/plugins/ui_stateful/sheetview_helpers";
import { Model } from "../../src";
import { CustomGetters, GridRenderingContext, Pixel, UID, Viewport, Zone } from "../../src/types";
import { MockCanvasRenderingContext2D } from "../setup/canvas.mock";

MockCanvasRenderingContext2D.prototype.measureText = function () {
  return { width: 100, fontBoundingBoxAscent: 1, fontBoundingBoxDescent: 1 };
};

interface ContextObserver {
  onSet?(key, val): void;
  onGet?(key): void;
  onFunctionCall?(fn: string, args: any[], renderingContext: MockGridRenderingContext): void;
}

export class MockGridRenderingContext implements GridRenderingContext {
  _context = document.createElement("canvas").getContext("2d");
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  dpr = 1;
  thinLineWidth = 0.4;

  constructor(private model: Model, width: number, height: number, observer: ContextObserver) {
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

  get getters(): CustomGetters {
    return this.model.getters;
  }

  get sheetId(): UID {
    return this.model.getters.getSheetViewCtx().sheetId;
  }

  get viewports(): SheetViewports {
    return this.model.getters.getSheetViewCtx().viewports;
  }

  get sheetViewWidth(): Pixel {
    return this.model.getters.getSheetViewCtx().sheetViewWidth;
  }

  get sheetViewHeight(): Pixel {
    return this.model.getters.getSheetViewCtx().sheetViewHeight;
  }

  get gridOffsetX(): Pixel {
    return this.model.getters.getSheetViewCtx().gridOffsetX;
  }

  get gridOffsetY(): Pixel {
    return this.model.getters.getSheetViewCtx().gridOffsetY;
  }

  get zoomLevel(): number {
    return this.model.getters.getSheetViewCtx().zoomLevel;
  }

  get selectedZones(): Zone[] {
    return this.model.getters.getSelectionContext().selectedZones;
  }

  get activeCols(): Set<number> {
    return this.model.getters.getSelectionContext().activeCols;
  }

  get activeRows(): Set<number> {
    return this.model.getters.getSelectionContext().activeRows;
  }

  get hideHeaders(): boolean {
    return this.model.getters.isDashboard();
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
