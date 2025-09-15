import { Component } from "@odoo/owl";
import { DEFAULT_WINDOW_SIZE } from "../../../../../constants";
import { getColorsPalette, getNthColor, range, setColorAlpha, toHex } from "../../../../../helpers";
import { CHART_AXIS_CHOICES } from "../../../../../helpers/figures/charts";
import {
  ChartJSRuntime,
  ChartWithDataSetDefinition,
  Color,
  SpreadsheetChildEnv,
  TrendConfiguration,
} from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { RadioSelection } from "../../../components/radio_selection/radio_selection";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";
import { SeriesDesignEditor } from "./series_design_editor";

export class SeriesWithAxisDesignEditor extends Component<
  ChartSidePanelProps<ChartWithDataSetDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-SeriesWithAxisDesignEditor";
  static components = {
    SeriesDesignEditor,
    Checkbox,
    RadioSelection,
    Section,
    RoundColorPicker,
  };
  static props = {
    ...ChartSidePanelPropsObject,
    slots: { type: Object, optional: true },
  };

  axisChoices = CHART_AXIS_CHOICES;

  updateDataSeriesAxis(index: number, axis: "left" | "right") {
    const dataSets = [...this.props.definition.dataSets];
    if (!dataSets?.[index]) {
      return;
    }
    dataSets[index] = {
      ...dataSets[index],
      yAxisId: axis === "left" ? "y" : "y1",
    };
    this.props.updateChart(this.props.chartId, { dataSets });
  }

  getDataSerieAxis(index: number) {
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[index]) {
      return "left";
    }
    return dataSets[index].yAxisId === "y1" ? "right" : "left";
  }

  get canHaveTwoVerticalAxis() {
    return !("horizontal" in this.props.definition && this.props.definition.horizontal);
  }

  toggleDataTrend(index: number, display: boolean) {
    const dataSets = [...this.props.definition.dataSets];
    if (!dataSets?.[index]) {
      return;
    }
    dataSets[index] = {
      ...dataSets[index],
      trend: {
        type: "polynomial",
        order: 1,
        ...dataSets[index].trend,
        display,
      },
    };
    this.props.updateChart(this.props.chartId, { dataSets });
  }

  getTrendLineConfiguration(index: number) {
    const dataSets = this.props.definition.dataSets;
    return dataSets?.[index]?.trend;
  }

  getTrendType(config: TrendConfiguration) {
    if (!config) {
      return "";
    }
    return config.type === "polynomial" && config.order === 1 ? "linear" : config.type;
  }

  onChangeTrendType(index, ev: InputEvent) {
    const type = (ev.target as HTMLInputElement).value;
    let config: TrendConfiguration;
    switch (type) {
      case "linear":
      case "polynomial":
        config = {
          type: "polynomial",
          order: type === "linear" ? 1 : this.getMaxPolynomialDegree(index),
        };
        break;
      case "exponential":
      case "logarithmic":
      case "trailingMovingAverage":
        config = { type };
        break;
      default:
        return;
    }
    this.updateTrendLineValue(index, config);
  }

  getPolynomialDegrees(index: number): number[] {
    return range(1, this.getMaxPolynomialDegree(index) + 1);
  }

  onChangePolynomialDegree(index: number, ev: InputEvent) {
    const element = ev.target as HTMLInputElement;
    this.updateTrendLineValue(index, { order: parseInt(element.value) });
  }

  getMaxPolynomialDegree(index) {
    const runtime = this.env.model.getters.getChartRuntime(this.props.chartId) as ChartJSRuntime;
    return Math.min(10, runtime.chartJsConfig.data.datasets[index].data.length - 1);
  }

  get defaultWindowSize() {
    return DEFAULT_WINDOW_SIZE;
  }

  onChangeMovingAverageWindow(index: number, ev: InputEvent) {
    const element = ev.target as HTMLInputElement;
    let window = parseInt(element.value) || DEFAULT_WINDOW_SIZE;
    if (window <= 1) {
      window = DEFAULT_WINDOW_SIZE;
    }
    this.updateTrendLineValue(index, { window });
  }

  getDataSeriesColor(index: number) {
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[index]) return "";
    const color = dataSets[index].backgroundColor;
    return color
      ? toHex(color)
      : getNthColor(index, getColorsPalette(this.props.definition.dataSets.length));
  }

  getTrendLineColor(index: number) {
    return (
      this.getTrendLineConfiguration(index)?.color ??
      setColorAlpha(this.getDataSeriesColor(index), 0.5)
    );
  }

  updateTrendLineColor(index: number, color: Color) {
    this.updateTrendLineValue(index, { color });
  }

  updateTrendLineValue(index: number, config: any) {
    const dataSets = [...this.props.definition.dataSets];
    if (!dataSets?.[index]) {
      return;
    }
    dataSets[index] = {
      ...dataSets[index],
      trend: {
        ...dataSets[index].trend,
        ...config,
      },
    };
    this.props.updateChart(this.props.chartId, { dataSets });
  }
}
