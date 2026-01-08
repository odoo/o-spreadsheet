import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUpdateProps, useEffect, useRef } from "@odoo/owl";
import { figureRegistry } from "../../registries/figures_registry";
import { Store, useStore } from "../../store_engine";
import { ChartAnimationStore } from "../figures/chart/chartJs/chartjs_animation_store";
import { ChartFigure } from "../figures/figure_chart/figure_chart";
import { useSpreadsheetRect } from "../helpers/position_hook";
import { FullScreenFigureStore } from "./full_screen_figure_store";

export class FullScreenFigure extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FullScreenFigure";
  static props = {};
  static components = { ChartFigure };

  private fullScreenFigureStore!: Store<FullScreenFigureStore>;
  private ref = useRef("fullScreenFigure");

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

    useEffect(
      (el) => el?.focus(),
      () => [this.ref.el]
    );
  }

  get figureUI() {
    return this.fullScreenFigureStore.fullScreenFigure;
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
