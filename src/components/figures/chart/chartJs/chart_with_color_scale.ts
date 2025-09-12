import { ChartConfiguration } from "chart.js/auto";
import { CHART_PADDING } from "../../../../constants";
import { COLORSCHEMES, humanizeNumber } from "../../../../helpers";
import { ChartJSRuntime, ChartWithColorScaleDefinition } from "../../../../types";
import { css, cssPropertiesToCss } from "../../../helpers";
import { ChartJsComponent } from "./chartjs";

css/* scss */ `
  .chart-color-scale {
    margin-bottom: 5px;
    margin-top: 15px;
    margin-right: ${CHART_PADDING}px;
    margin-left: ${CHART_PADDING}px;
  }
  .chart-color-scale-labels {
    margin-left: 4px;
  }
  .chart-color-scale-preview {
    width: 10px;
    height: 90%;
    border: 1px solid;
  }
`;

export class ChartJsComponentWithColorScale extends ChartJsComponent {
  static template = "o-spreadsheet-ChartJsComponentWithColorScale";

  boundaries = { min: "", max: "" };

  protected createChart(chartRuntime: ChartJSRuntime) {
    super.createChart(chartRuntime);
    this.updateColorScaleBoundaries(chartRuntime.chartJsConfig);
  }

  get colorScalePosition() {
    const definition = this.env.model.getters.getChartDefinition(
      this.props.chartId
    ) as ChartWithColorScaleDefinition;
    return definition.legendPosition;
  }

  get colorScalePreviewStyle() {
    const definition = this.env.model.getters.getChartDefinition(
      this.props.chartId
    ) as ChartWithColorScaleDefinition;
    const colorScale = definition.colorScale ?? "oranges";
    if (typeof colorScale === "string") {
      return cssPropertiesToCss({
        background: `linear-gradient(0deg, ${COLORSCHEMES[colorScale].join(",")})`,
      });
    }
    return cssPropertiesToCss({
      background: `linear-gradient(${colorScale.maxColor}${
        colorScale.midColor ? `, ${colorScale.midColor}` : ""
      }, ${colorScale.minColor})`,
    });
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
    this.boundaries.min = formattedMinValue;
    this.boundaries.max = formattedMaxValue;
  }
}
