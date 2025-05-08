import { Component, useEffect, useRef } from "@odoo/owl";
import { chartComponentRegistry } from "../../registries/chart_types";
import { figureRegistry } from "../../registries/figures_registry";
import { Store, useStore } from "../../store_engine";
import { SpreadsheetChildEnv } from "../../types";
import { ChartDashboardMenu } from "../figures/chart/chart_dashboard_menu/chart_dashboard_menu";
import { useSpreadsheetRect } from "../helpers/position_hook";
import { FullScreenFigureStore } from "./full_screen_chart_store";

interface Props {}

export class FullScreenFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FullScreenChart";
  static props = {};
  static components = { ChartDashboardMenu };

  private fullScreenFigureStore!: Store<FullScreenFigureStore>;
  private ref = useRef("fullScreenChart");

  spreadsheetRect = useSpreadsheetRect();

  figureRegistry = figureRegistry;

  setup() {
    this.fullScreenFigureStore = useStore(FullScreenFigureStore);

    useEffect(
      (el) => el?.focus(),
      () => [this.ref.el]
    );
  }

  get figureUI() {
    return this.fullScreenFigureStore.fullScreenFigure;
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
    if (!this.figureUI) return undefined;
    const type = this.env.model.getters.getChartType(this.figureUI.id);
    const component = chartComponentRegistry.get(type);
    if (!component) {
      throw new Error(`Component is not defined for type ${type}`);
    }
    return component;
  }
}
