import {
  Canvas as NodeCanvas,
  CanvasRenderingContext2D as NodeCanvasRenderingContext2D,
  createCanvas,
} from "canvas";
import { GridRenderingContext, Model, RenderingGetters, UID, Viewport, Zone } from "../../src";
import { getDefaultSheetViewSize } from "../../src/constants";
import { SequenceSet } from "../../src/helpers/misc";
import {
  ViewportsPlugin,
  ViewportsPluginInstance,
} from "../../src/owl_plugins/viewports_owl_plugin";
import { OwlPluginGetter } from "../../src/types/spreadsheet_env";
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
  getters: RenderingGetters;
  private canvas: NodeCanvas | HTMLCanvasElement;
  private viewPlugin: ViewportsPluginInstance;

  constructor(
    private model: Model,
    getPlugin: OwlPluginGetter,
    width: number,
    height: number,
    observer: ContextObserver,
    private mode: "nodeCanvas" | "mockCanvas" = "mockCanvas"
  ) {
    this.getters = model.getters;
    this.viewPlugin = getPlugin(ViewportsPlugin);
    this.viewPlugin.resizeSheetView({ width, height, gridOffsetX: 0, gridOffsetY: 0 });
    this.viewport = this.viewPlugin.activeMainViewport;

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

  get sheetId(): UID {
    return this.model.getters.getActiveSheetId();
  }

  get viewports() {
    return this.viewPlugin.viewports();
  }

  get selectedZones(): Zone[] {
    return this.model.getters.getSelectionState().selectedZones;
  }

  get activeCols(): SequenceSet {
    return this.model.getters.getSelectionState().activeCols;
  }

  get activeRows(): SequenceSet {
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
 * Create a rendering context watching dashed outlines around zones.
 */
export function watchDashedOutline(model: Model, getPlugin: OwlPluginGetter) {
  const sheetViewSize = getDefaultSheetViewSize();
  let lineDash = false;
  let outlinedRects: any[][] = [];
  const ctx = new MockGridRenderingContext(model, getPlugin, sheetViewSize, sheetViewSize, {
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
      const { x, y, width, height } = getPlugin(ViewportsPlugin)
        .viewports()
        .getVisibleRect(model.getters.getActiveSheetId(), zone);
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
