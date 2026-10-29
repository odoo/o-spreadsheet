import { onWillDestroy, signal, untrack, useConfig, usePlugin } from "@odoo/owl";
import { drawHighlight } from "../helpers/rendering";
import { zoneToDimension } from "../helpers/zones";
import type { ViewportsStore } from "../stores/viewports_store";
import { Highlight } from "../types/misc";
import { GridRenderingContext, LayerName, Rect } from "../types/rendering";
import { OwlPluginWithModel } from "./owl_plugin_with_model";
import { RendererPlugin } from "./renderer_plugin";

export interface HighlightProvider {
  highlights: Highlight[];
}

export class HighlightPlugin extends OwlPluginWithModel {
  private providers = signal.Array<HighlightProvider>([]);
  private renderer = usePlugin(RendererPlugin);
  private viewStore: ViewportsStore = useConfig("viewStore");

  setup() {
    super.setup();
    this.renderer.register(this);
    onWillDestroy(() => {
      this.renderer.unRegister(this);
    });
  }

  get renderingLayers() {
    return ["Highlights"] as const;
  }

  // TODO highlights from the providers will become reactive signals (maybe) and this getter
  // will become a compute
  get highlights(): Highlight[] {
    return this.getVisibleHighlights().map(({ highlight }) => highlight);
  }

  private getVisibleHighlights(): { highlight: Highlight; rect: Rect }[] {
    const activeSheetId = this.model().getters.getActiveSheetId();
    const visibleHighlights: { highlight: Highlight; rect: Rect }[] = [];
    for (const provider of this.providers()) {
      for (const highlight of provider.highlights) {
        const { sheetId, zone: highlightZone } = highlight.range;
        if (sheetId !== activeSheetId) {
          continue;
        }
        const { numberOfRows, numberOfCols } = zoneToDimension(highlightZone);
        const zone =
          numberOfRows * numberOfCols === 1
            ? this.model().getters.expandZone(sheetId, highlightZone)
            : highlightZone;
        // compute once here as it's used in drawLayer
        const rect = this.viewStore.viewports.getVisibleRect(sheetId, zone);
        if (!(rect.width > 0 && rect.height > 0)) {
          continue;
        }
        visibleHighlights.push({
          highlight: { ...highlight, range: this.model().getters.getRangeFromZone(sheetId, zone) },
          rect,
        });
      }
    }
    return visibleHighlights;
  }

  register(highlightProvider: HighlightProvider) {
    untrack(() => this.providers().push(highlightProvider));
  }

  unRegister(highlightProvider: HighlightProvider) {
    untrack(() => this.providers.set(this.providers().filter((h) => h !== highlightProvider)));
  }

  drawLayer(ctx: GridRenderingContext, layer: LayerName): void {
    if (layer === "Highlights") {
      for (const { highlight, rect } of this.getVisibleHighlights()) {
        drawHighlight(ctx, highlight, rect);
      }
    }
  }
}
