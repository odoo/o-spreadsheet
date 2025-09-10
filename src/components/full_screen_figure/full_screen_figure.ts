import { Component, onWillUpdateProps, useEffect, useRef } from "@odoo/owl";
import { chartComponentRegistry } from "../../registries/chart_types";
import { figureRegistry } from "../../registries/figures_registry";
import { Store, useStore } from "../../store_engine";
import { SpreadsheetChildEnv } from "../../types";
import { ChartDashboardMenu } from "../figures/chart/chart_dashboard_menu/chart_dashboard_menu";
import { ChartAnimationStore } from "../figures/chart/chartJs/chartjs_animation_store";
import { useSpreadsheetRect } from "../helpers/position_hook";
import { FullScreenFigureStore } from "./full_screen_figure_store";

export class FullScreenFigure extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FullScreenFigure";
  static props = {};
  static components = { ChartDashboardMenu };

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
    if (!this.figureUI) return undefined;
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

  get chartComponent(): (new (...args: any) => Component) | undefined {
    if (!this.chartId) return undefined;
    const type = this.env.model.getters.getChartType(this.chartId);
    const component = chartComponentRegistry.get(type);
    if (!component) {
      throw new Error(`Component is not defined for type ${type}`);
    }
    return component;
  }
}
