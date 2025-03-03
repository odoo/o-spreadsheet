import { Component, useEffect, useRef } from "@odoo/owl";
import { drawGaugeChart } from "../../../../helpers/figures/charts/gauge_chart_rendering";
import { FigureUI, SpreadsheetChildEnv } from "../../../../types";
import { GaugeChartRuntime } from "../../../../types/chart";

interface Props {
  figureUI: FigureUI;
}

export class GaugeChartComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GaugeChartComponent";
  private canvas = useRef("chartContainer");

  get runtime(): GaugeChartRuntime {
    return this.env.model.getters.getChartRuntime(this.props.figureUI.id) as GaugeChartRuntime;
  }

  setup() {
    useEffect(
      () => drawGaugeChart(this.canvas.el as HTMLCanvasElement, this.runtime),
      () => {
        const canvas = this.canvas.el as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        return [rect.width, rect.height, this.runtime, this.canvas.el];
      }
    );
  }
}

GaugeChartComponent.props = {
  figureUI: Object,
};
