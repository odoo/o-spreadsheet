import { onWillUpdateProps, proxy, signal, useEffect } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { figureRegistry } from "../../registries/figures_registry";
import { useStore } from "../../store_engine/store_hooks";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { ChartAnimationStore } from "../figures/chart/chartJs/chartjs_animation_store";
import { ChartFigure } from "../figures/figure_chart/figure_chart";
import { useSpreadsheetRect } from "../helpers/position_hook";
import { FullScreenFigureStore } from "./full_screen_figure_store";

export class FullScreenFigure extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FullScreenFigure";
  static components = { ChartFigure };

  private fullScreenFigureStore!: Store<FullScreenFigureStore>;
  private fullScreenFigureRef = signal.ref();
  private containerSize = proxy({ width: 0, height: 0 });

  spreadsheetRect = useSpreadsheetRect();

  figureRegistry = figureRegistry;

  setup() {
    this.fullScreenFigureStore = useStore(FullScreenFigureStore);

    const animationStore = useStore(ChartAnimationStore);
    let lastFigureId: string | undefined = undefined;
    onWillUpdateProps(() => {
      if (lastFigureId !== this.figureUI?.id) {
        animationStore.enableAnimationForChart(this.chartId + "-fullscreen");
      }
      lastFigureId = this.figureUI?.id;
    });

    useEffect(() => this.fullScreenFigureRef()?.focus());
    useEffect(() => {
      const el = this.fullScreenFigureRef();
      if (!el) {
        return;
      }
      const resizeObserver = new ResizeObserver(([entry]) => {
        this.containerSize.width = entry.contentRect.width;
        this.containerSize.height = entry.contentRect.height;
      });
      resizeObserver.observe(el);
      return () => resizeObserver.disconnect();
    });
  }

  get figureUI() {
    const figureUI = this.fullScreenFigureStore.fullScreenFigure;
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
    return this.env.model.getters.getChartIdFromFigureId(this.figureUI?.id);
  }

  exitFullScreen() {
    if (this.figureUI) {
      this.fullScreenFigureStore.toggleFullScreenFigure(this.figureUI.id);
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
