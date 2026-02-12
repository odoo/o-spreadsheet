import { getDefaultSheetViewSize } from "@odoo/o-spreadsheet-engine/constants";
import { Model } from "../../src";
import { GridRenderingContext, RenderingGetters, UID, Viewport, Zone } from "../../src/types";
import { MockCanvasRenderingContext2D } from "../setup/canvas.mock";
import { resizeSheetView } from "./commands_helpers";

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
  _context = document.createElement("canvas").getContext("2d");
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  dpr = 1;
  thinLineWidth = 0.4;
  getters: RenderingGetters;

  constructor(private model: Model, width: number, height: number, observer: ContextObserver) {
    this.getters = model.getters;
    resizeSheetView(model, height, width, 0, 0);
    this.viewport = model.getters.getActiveMainViewport();

    const handler = {
      get: (target, val) => {
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

  get sheetId(): UID {
    return this.model.getters.getActiveSheetId();
  }

  get viewports() {
    return this.model.getters.getViewportCollection();
  }

  get selectedZones(): Zone[] {
    return this.model.getters.getSelectionState().selectedZones;
  }

  get activeCols(): Set<number> {
    return this.model.getters.getSelectionState().activeCols;
  }

  get activeRows(): Set<number> {
    return this.model.getters.getSelectionState().activeRows;
  }

  get activePosition() {
    return this.model.getters.getSelectionState().activePosition;
  }

  get hideGridLines(): boolean {
    // Handled in the rendering context created by the `Dashboard` component in practice
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
