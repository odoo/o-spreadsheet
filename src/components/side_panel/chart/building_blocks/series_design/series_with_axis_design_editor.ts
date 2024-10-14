import { Component } from "@odoo/owl";
import { getColorsPalette, getNthColor, setColorAlpha, toHex } from "../../../../../helpers";
import { CHART_AXIS_CHOICES } from "../../../../../helpers/figures/charts";
import {
  ChartWithDataSetDefinition,
  Color,
  DispatchResult,
  SpreadsheetChildEnv,
  TrendConfiguration,
  UID,
} from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { RadioSelection } from "../../../components/radio_selection/radio_selection";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";
import { SeriesDesignEditor } from "./series_design_editor";

interface Props {
  figureId: UID;
  definition: ChartWithDataSetDefinition;
  canUpdateChart: (
    figureID: UID,
    definition: Partial<ChartWithDataSetDefinition>
  ) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
}

export class SeriesWithAxisDesignEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SeriesWithAxisDesignEditor";
  static components = {
    SeriesDesignEditor,
    Checkbox,
    RadioSelection,
    Section,
    RoundColorPicker,
  };
  static props = {
    figureId: String,
    definition: Object,
    canUpdateChart: Function,
    updateChart: Function,
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
    this.props.updateChart(this.props.figureId, { dataSets });
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
    this.props.updateChart(this.props.figureId, { dataSets });
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
          order: type === "linear" ? 1 : 2,
        };
        break;
      case "exponential":
      case "logarithmic":
        config = { type };
        break;
      default:
        return;
    }
    this.updateTrendLineValue(index, config);
  }

  onChangePolynomialDegree(index: number, ev: InputEvent) {
    const element = ev.target as HTMLInputElement;
    const order = parseInt(element.value || "1");
    if (order < 2) {
      element.value = `${this.getTrendLineConfiguration(index)?.order ?? 2}`;
      return;
    }
    this.updateTrendLineValue(index, { order });
  }

  getDataSerieColor(index: number) {
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
      setColorAlpha(this.getDataSerieColor(index), 0.5)
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
    this.props.updateChart(this.props.figureId, { dataSets });
  }
}
