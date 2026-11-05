import { proxy, signal, useEffect, useOnChange, usePlugin } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { figureRegistry } from "../../registries/figures_registry";
import { ChartAnimationPlugin } from "../figures/chart/chartJs/chartjs_animation_owl_plugin";
import { ChartFigure } from "../figures/figure_chart/figure_chart";
import { useResizeObserver } from "../helpers/listener_hook";
import { OSComponent } from "../os_component";
import { FullScreenFigurePlugin } from "./full_screen_figure_owl_plugin";

export class FullScreenFigure extends OSComponent {
  static template = "o-spreadsheet-FullScreenFigure";
  static components = { ChartFigure };

  private fullScreenFigurePlugin = usePlugin(FullScreenFigurePlugin);
  private fullScreenFigureRef = signal.ref();
  private containerSize = proxy({ width: 0, height: 0 });

  figureRegistry = figureRegistry;

  setup() {
    const chartAnimationPlugin = usePlugin(ChartAnimationPlugin);
    useOnChange(
      () => [this.figureUI?.id],
      () => {
        chartAnimationPlugin.enableAnimationForChart(this.chartId + "-fullscreen");
      }
    );

    useEffect(() => this.fullScreenFigureRef()?.focus());
    useResizeObserver(this.fullScreenFigureRef, ([entry]) => {
      this.containerSize.width = entry.contentRect.width;
      this.containerSize.height = entry.contentRect.height;
    });
  }

  get figureUI() {
    const figureUI = this.fullScreenFigurePlugin.fullScreenFigure();
    if (!figureUI) {
      return undefined;
    }
    return {
      ...figureUI,
      width: this.containerSize.width,
      height: this.containerSize.height,
    };
  }

  get chartId() {
    if (!this.figureUI) {
      return undefined;
    }
    return this.model().getters.getChartIdFromFigureId(this.figureUI?.id);
  }

  exitFullScreen() {
    if (this.figureUI) {
      this.fullScreenFigurePlugin.toggleFullScreenFigure(this.figureUI.id);
    }
  }

  onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Escape") {
      this.exitFullScreen();
    }
  }

  get figureComponent(): (new (...args: any) => Component) | undefined {
    if (!this.figureUI) {
      return undefined;
    }
    return figureRegistry.get(this.figureUI.tag).Component;
  }
}
