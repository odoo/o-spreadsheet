import * as owl from "@odoo/owl";
import { BasePlugin, CommandHandler, GridRenderingContext } from "./base_plugin";
import { createEmptyWorkbook, createEmptyWorkbookData, load } from "./data";
import { WHistory } from "./history";
import { ClipboardPlugin } from "./plugins/clipboard";
import { ConditionalFormatPlugin } from "./plugins/conditional_format";
import { CorePlugin } from "./plugins/core";
import { EditionPlugin } from "./plugins/edition";
import { EntityPlugin } from "./plugins/entity";
import { EvaluationPlugin } from "./plugins/evaluation";
import { FormattingPlugin } from "./plugins/formatting";
import { GridPlugin } from "./plugins/grid";
import { RendererPlugin } from "./plugins/renderer";
import { SelectionPlugin } from "./plugins/selection";
import { Registry } from "./registry";
import {
  CommandResult,
  Getters,
  GridCommand,
  UI,
  Viewport,
  Workbook,
  WorkbookData
} from "./types/index";

// -----------------------------------------------------------------------------
// Plugins
// -----------------------------------------------------------------------------

export const pluginRegistry = new Registry<typeof BasePlugin>();

pluginRegistry
  .add("core", CorePlugin)
  .add("evaluation", EvaluationPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("grid", GridPlugin)
  .add("formatting", FormattingPlugin)
  .add("edition", EditionPlugin)
  .add("selection", SelectionPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("entities", EntityPlugin)
  .add("grid renderer", RendererPlugin);

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------
export class Model extends owl.core.EventBus {
  private handlers: CommandHandler[];
  private renderers: [BasePlugin, number][];
  private status: "ready" | "running" | "finalizing" = "ready";

  workbook: Workbook;
  history: WHistory;
  state: UI;
  renderer: RendererPlugin;

  getters: Getters;

  constructor(data?: any) {
    super();
    (window as any).gridmodel = this; // to debug. remove this someday

    const workbookData = load(data);
    this.workbook = createEmptyWorkbook();
    this.history = new WHistory(this.workbook);

    this.getters = {
      canUndo: this.history.canUndo.bind(this.history),
      canRedo: this.history.canRedo.bind(this.history)
    } as Getters;
    this.handlers = [this.history];

    // Plugins
    const dispatch = this.dispatch.bind(this);
    for (let Plugin of pluginRegistry.getAll()) {
      const plugin = new Plugin(this.workbook, this.getters, this.history, dispatch);
      plugin.import(workbookData);
      for (let name of Plugin.getters) {
        if (!(name in plugin)) {
          throw new Error(`Invalid getter name: ${name} for plugin ${plugin.constructor}`);
        }
        this.getters[name] = plugin[name].bind(plugin);
      }
      this.handlers.push(plugin);
    }

    // setting up renderers
    const indexedRenderers: [BasePlugin, number][] = [];
    for (let p of this.handlers) {
      if (p instanceof BasePlugin) {
        const layers = (p.constructor as any).layers.map(l => [p, l]);
        indexedRenderers.push(...layers);
      }
    }
    this.renderers = indexedRenderers.sort((p1, p2) => p1[1] - p2[1]);

    // misc
    this.renderer = this.handlers.find(h => h instanceof RendererPlugin)! as RendererPlugin;
    this.state = {} as UI;
    this.dispatch({ type: "START" });
  }

  dispatch(command: GridCommand): CommandResult {
    switch (this.status) {
      case "ready":
        for (let handler of this.handlers) {
          let result = handler.canDispatch(command);
          if (!result) {
            return "CANCELLED";
          }
        }
        this.status = "running";
        for (let handler of this.handlers) {
          handler.start(command);
        }
        this.handlers.forEach(h => h.handle(command));
        // finalizing
        this.status = "finalizing";
        for (let handler of this.handlers) {
          handler.finalize(command);
        }
        this.status = "ready";

        Object.assign(this.state, this.getters.getUI());
        this.trigger("update");
        break;
      case "running":
        this.handlers.forEach(h => h.handle(command));
        break;
      case "finalizing":
        throw new Error("Nope. Don't do that");
    }
    return "COMPLETED";
  }

  drawGrid(canvas: HTMLCanvasElement, viewport: Viewport) {
    const { width, height } = viewport;
    // whenever the dimensions are changed, we need to reset the width/height
    // of the canvas manually, and reset its scaling.
    const dpr = window.devicePixelRatio || 1;
    const context = canvas.getContext("2d", { alpha: false })!;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;`);
    context.translate(-0.5, -0.5);
    context.scale(dpr, dpr);

    // preparing the grid rendering context
    this.renderer.updateVisibleZone(width, height);
    const ajustedViewport = {
      width: viewport.width,
      height: viewport.height,
      offsetX: this.renderer.offsetX,
      offsetY: this.renderer.offsetY
    };

    const renderingContext: GridRenderingContext = {
      ctx: context,
      viewport: ajustedViewport,
      zone: this.renderer.viewport,
      dpr,
      thinLineWidth: 0.4 * dpr
    };

    for (let [renderer, layer] of this.renderers) {
      renderer.drawGrid(renderingContext, layer);
    }
  }

  // core
  // ---------------------------------------------------------------------------
  updateVisibleZone(width: number, height: number) {
    this.renderer.updateVisibleZone(width, height);
    Object.assign(this.state, this.getters.getUI());
  }

  updateScroll(scrollTop: number, scrollLeft: number): boolean {
    const result = this.renderer.updateScroll(scrollTop, scrollLeft);
    Object.assign(this.state, this.getters.getUI(result));
    return result;
  }

  // export
  // ---------------------------------------------------------------------------
  exportData(): WorkbookData {
    const data = createEmptyWorkbookData();
    for (let handler of this.handlers) {
      if (handler instanceof BasePlugin) {
        handler.export(data);
      }
    }
    return data;
  }
}
