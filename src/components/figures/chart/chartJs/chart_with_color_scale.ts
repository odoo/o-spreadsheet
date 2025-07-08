import { useRef } from "@odoo/owl";
import { ChartConfiguration } from "chart.js/auto";
import { colorScalesCSSBackground } from "../../../../helpers/figures/charts/colormap";
import { ChartWithColorScaleDefinition } from "../../../../types";
import { ChartJsComponent } from "./chartjs";

export class ChartJsComponentWithColorScale extends ChartJsComponent {
  static template = "o-spreadsheet-ChartJsComponentWithColorScale";
  private minValue = useRef("minValue");
  private maxValue = useRef("maxValue");
  private colorScale = useRef("colorScale");

  protected createChart(chartData: ChartConfiguration<any>) {
    super.createChart(chartData);
    this.updateColorScaleBoundaries(chartData);
  }

  protected updateChartJs(chartData: ChartConfiguration<any>) {
    super.updateChartJs(chartData);
    this.updateColorScaleBoundaries(chartData);
  }

  private updateColorScaleBoundaries(chartData: ChartConfiguration<any>) {
    const values = chartData.data.datasets.map((d) => d.values).flat();
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    this.minValue.el!.innerHTML = minValue.toString();
    this.maxValue.el!.innerHTML = maxValue.toString();
    const definition = this.env.model.getters.getChartDefinition(
      this.props.figureUI.id
    ) as ChartWithColorScaleDefinition;
    const colorScale = definition.colorScale;
    if (typeof colorScale === "object" && "minColor" in colorScale && "maxColor" in colorScale) {
      this.colorScale.el!.style.background = `linear-gradient(to top, ${colorScale.minColor}, ${
        colorScale.midColor || colorScale.minColor
      }, ${colorScale.maxColor})`;
    } else {
      this.colorScale.el!.style.background = `linear-gradient(to top, ${
        colorScalesCSSBackground[colorScale ?? "greys"]
      })`;
    }
  }
}
