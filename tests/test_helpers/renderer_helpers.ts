import {
  getDefaultSheetViewSize,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "@odoo/o-spreadsheet-engine/constants";
import { Model } from "../../src";
import { GridRenderingContext, RenderingGetters, UID, Viewport, Zone } from "../../src/types";
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

  get getters(): RenderingGetters {
    return this.model.getters;
  }

  get sheetId(): UID {
    return this.model.getters.getActiveSheetId();
  }

  get viewports() {
    const viewports = this.model.getters.getViewportCollection();
    // FIXME: normally, the condition to determine if we want to draw the headers or not should be if gridOffsetX/Y are
    // equal to 0 or not, (ie. if there is space above/left of the grid to draw them, which in practice is equivalent to `isDashboard()`)
    // But in the renderer tests, we are testing with `isDashboard() === false` but `gridOffsetX/Y === 0`, which is
    // not supposed to happen. Before this commit we were drawing the headers over the grid in the test, now without this hack
    // we are not drawing the headers at all since `gridOffsetX/Y === 0`. We should fix the tests.
    viewports.shouldDisplayHeaders = () => !this.model.getters.isDashboard();
    return viewports;
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
