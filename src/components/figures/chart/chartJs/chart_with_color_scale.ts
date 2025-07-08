import { useRef } from "@odoo/owl";
import { ChartConfiguration } from "chart.js/auto";
import { COLORSCHEMES, humanizeNumber } from "../../../../helpers";
import { ChartJSRuntime, ChartWithColorScaleDefinition } from "../../../../types";
import { ChartJsComponent } from "./chartjs";

export class ChartJsComponentWithColorScale extends ChartJsComponent {
  static template = "o-spreadsheet-ChartJsComponentWithColorScale";
  private minValue = useRef("minValue");
  private maxValue = useRef("maxValue");
  private colorScale = useRef("colorScale");

  protected createChart(chartRuntime: ChartJSRuntime) {
    super.createChart(chartRuntime);
    this.updateColorScaleBoundaries(chartRuntime.chartJsConfig);
  }

  get heatMapStyle() {
    const definition = this.env.model.getters.getChartDefinition(
      this.props.chartId
    ) as ChartWithColorScaleDefinition;
    if (definition.showColorBar) {
      return "width: calc(100% - 70px);";
    }
    return "width: 100%";
  }

  get colorScaleStyle() {
    const definition = this.env.model.getters.getChartDefinition(
      this.props.chartId
    ) as ChartWithColorScaleDefinition;
    if (definition.showColorBar) {
      return "display:flex; margin: 5px; width: 70px; margin-top:15px";
    }
    return "display: none";
  }

  protected updateChartJs(chartRuntime: ChartJSRuntime) {
    super.updateChartJs(chartRuntime);
    this.updateColorScaleBoundaries(chartRuntime.chartJsConfig);
  }

  private updateColorScaleBoundaries(chartData: ChartConfiguration<any>) {
    const values = chartData.data.datasets
      .map((d) => d.values)
      .flat()
      .filter((v) => typeof v === "number") as number[];
    const minValue = Math.round(100 * Math.min(...values)) / 100;
    const maxValue = Math.round(100 * Math.max(...values)) / 100;
    const formattedMinValue = humanizeNumber(
      { value: minValue, format: undefined },
      this.env.model.getters.getLocale()
    );
    const formattedMaxValue = humanizeNumber(
      { value: maxValue, format: undefined },
      this.env.model.getters.getLocale()
    );
    this.minValue.el!.innerHTML = formattedMinValue;
    this.maxValue.el!.innerHTML = formattedMaxValue;
    const definition = this.env.model.getters.getChartDefinition(
      this.props.chartId
    ) as ChartWithColorScaleDefinition;
    const colorScale = definition.colorScale;
    if (typeof colorScale === "object" && "minColor" in colorScale && "maxColor" in colorScale) {
      this.colorScale.el!.style.background = `linear-gradient(to top, ${colorScale.minColor}, ${
        colorScale.midColor ? colorScale.midColor + "," : ""
      } ${colorScale.maxColor})`;
    } else {
      this.colorScale.el!.style.background = `linear-gradient(to top, ${COLORSCHEMES[
        colorScale ?? "oranges"
      ].join(", ")})`;
    }
  }
}
