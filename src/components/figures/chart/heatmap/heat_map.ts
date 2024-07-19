import { Component, useEffect, useRef } from "@odoo/owl";
import { drawHeatMap } from "../../../../helpers/figures/charts/heat_map";
import { getHeatMapConfiguration } from "../../../../helpers/figures/charts/heat_map_config_builder";
import { _t } from "../../../../translation";
import { FigureUI, SpreadsheetChildEnv } from "../../../../types";
import { HeatMapRuntime } from "../../../../types/chart/heat_map";

interface Props {
  figureUI: FigureUI;
}

export class HeatMapComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HeatMapComponent";
  static props = {
    figureUI: Object,
  };
  private canvas = useRef("chartContainer");

  get runtime(): HeatMapRuntime {
    return this.env.model.getters.getChartRuntime(this.props.figureUI.id) as HeatMapRuntime;
  }

  get title(): string {
    const title =
      this.env.model.getters.getChartDefinition(this.props.figureUI.id).title.text ?? "";
    // chart titles are extracted from .json files and they are translated at runtime here
    return _t(title);
  }

  setup() {
    useEffect(this.createChart.bind(this), () => {
      const canvas = this.canvas.el as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      return [rect.width, rect.height, this.runtime, this.canvas.el];
    });
  }

  private createChart() {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const config = getHeatMapConfiguration(canvas.getBoundingClientRect(), this.runtime);
    drawHeatMap(config, canvas);
  }
}
