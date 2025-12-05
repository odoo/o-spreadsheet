import { _t, UID } from "@odoo/o-spreadsheet-engine";
import { DEFAULT_WINDOW_SIZE } from "@odoo/o-spreadsheet-engine/constants";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { getColorsPalette, getNthColor, range, setColorAlpha, toHex } from "../../../../../helpers";
import { CHART_AXIS_CHOICES } from "../../../../../helpers/figures/charts";
import {
  ChartWithDataSetDefinition,
  Color,
  CustomisableSeriesChartRuntime,
  TrendConfiguration,
  ValueAndLabel,
} from "../../../../../types";
import { NumberInput } from "../../../../number_input/number_input";
import { Select } from "../../../../select/select";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { RadioSelection } from "../../../components/radio_selection/radio_selection";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";
import { SeriesDesignEditor } from "./series_design_editor";

interface Props extends ChartSidePanelProps<ChartWithDataSetDefinition> {
  slots?: object;
}

export class SeriesWithAxisDesignEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SeriesWithAxisDesignEditor";
  static components = {
    SeriesDesignEditor,
    Checkbox,
    RadioSelection,
    Section,
    RoundColorPicker,
    NumberInput,
    Select,
  };
  static props = {
    ...ChartSidePanelPropsObject,
    slots: { type: Object, optional: true },
  };

  axisChoices = CHART_AXIS_CHOICES;

  updateDataSeriesAxis(dataSetId: UID, axis: "left" | "right") {
    const dataSetStyles = { ...this.props.definition.dataSetStyles };
    dataSetStyles[dataSetId] = {
      ...dataSetStyles[dataSetId],
      yAxisId: axis === "left" ? "y" : "y1",
    };
    this.props.updateChart(this.props.chartId, { dataSetStyles });
  }

  getDataSerieAxis(dataSetId: UID) {
    const dataSets = this.props.definition.dataSetStyles;
    if (!dataSets?.[dataSetId]) {
      return "left";
    }
    return dataSets[dataSetId]?.yAxisId === "y1" ? "right" : "left";
  }

  get canHaveTwoVerticalAxis() {
    return !("horizontal" in this.props.definition && this.props.definition.horizontal);
  }

  toggleDataTrend(dataSetId: UID, display: boolean) {
    const dataSetStyles = { ...this.props.definition.dataSetStyles };
    dataSetStyles[dataSetId] = {
      ...dataSetStyles[dataSetId],
      trend: {
        type: "polynomial",
        order: 1,
        ...dataSetStyles[dataSetId]?.trend,
        display,
      },
    };
    this.props.updateChart(this.props.chartId, { dataSetStyles });
  }

  getTrendLineConfiguration(dataSetId: UID) {
    const dataSets = this.props.definition.dataSetStyles;
    return dataSets?.[dataSetId]?.trend;
  }

  getTrendType(config: TrendConfiguration) {
    if (!config) {
      return "";
    }
    return config.type === "polynomial" && config.order === 1 ? "linear" : config.type;
  }

  onChangeTrendType(dataSetId: UID, type: string) {
    let config: TrendConfiguration;
    switch (type) {
      case "linear":
      case "polynomial":
        config = {
          type: "polynomial",
          order: type === "linear" ? 1 : this.getMaxPolynomialDegree(dataSetId),
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
    this.updateTrendLineValue(dataSetId, config);
  }

  get trendOptions(): ValueAndLabel[] {
    return [
      { value: "linear", label: _t("Linear") },
      { value: "polynomial", label: _t("Polynomial") },
      { value: "exponential", label: _t("Exponential") },
      { value: "logarithmic", label: _t("Logarithmic") },
      { value: "trailingMovingAverage", label: _t("Trailing moving average") },
    ];
  }

  getPolynomialDegrees(dataSetId: UID): ValueAndLabel[] {
    return range(1, this.getMaxPolynomialDegree(dataSetId) + 1).map((degree) => ({
      value: degree.toString(),
      label: degree.toString(),
    }));
  }

  onChangePolynomialDegree(dataSetId: UID, value: string) {
    this.updateTrendLineValue(dataSetId, { order: parseInt(value) });
  }

  getMaxPolynomialDegree(dataSetId: UID) {
    const runtime = this.env.model.getters.getChartRuntime(
      this.props.chartId
    ) as CustomisableSeriesChartRuntime;
    const index = runtime.customisableSeries.findIndex((series) => series.dataSetId === dataSetId);
    return Math.min(10, runtime.chartJsConfig.data.datasets[index].data.length - 1);
  }

  get defaultWindowSize() {
    return DEFAULT_WINDOW_SIZE;
  }

  onChangeMovingAverageWindow(dataSetId: UID, value: string) {
    let window = parseInt(value) || DEFAULT_WINDOW_SIZE;
    if (window <= 1) {
      window = DEFAULT_WINDOW_SIZE;
    }
    this.updateTrendLineValue(dataSetId, { window });
  }

  getDataSeriesColor(dataSetId: UID) {
    const dataSets = this.props.definition.dataSetStyles;
    if (!dataSets?.[dataSetId]) {
      return "";
    }
    const color = dataSets[dataSetId]?.backgroundColor;
    const runtime = this.env.model.getters.getChartRuntime(
      this.props.chartId
    ) as CustomisableSeriesChartRuntime;
    const index = runtime.customisableSeries.findIndex((series) => series.dataSetId === dataSetId);
    return color
      ? toHex(color)
      : getNthColor(index, getColorsPalette(runtime.customisableSeries.length));
  }

  getTrendLineColor(dataSetId: UID) {
    return (
      this.getTrendLineConfiguration(dataSetId)?.color ??
      setColorAlpha(this.getDataSeriesColor(dataSetId), 0.5)
    );
  }

  updateTrendLineColor(dataSetId: UID, color: Color) {
    this.updateTrendLineValue(dataSetId, { color });
  }

  private updateTrendLineValue(dataSetId: UID, config: TrendConfiguration) {
    const dataSetStyles = { ...this.props.definition.dataSetStyles };
    dataSetStyles[dataSetId] = {
      ...dataSetStyles[dataSetId],
      trend: {
        ...dataSetStyles[dataSetId]?.trend,
        ...config,
      },
    };
    this.props.updateChart(this.props.chartId, { dataSetStyles });
  }
}
