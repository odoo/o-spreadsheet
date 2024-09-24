import { Component, useState } from "@odoo/owl";
import { getColorsPalette, getNthColor, range, setColorAlpha, toHex } from "../../../../helpers";
import { CHART_AXIS_CHOICES, getDefinedAxis } from "../../../../helpers/figures/charts";
import { _t } from "../../../../translation";
import { ChartJSRuntime } from "../../../../types/chart";
import {
  ChartWithAxisDefinition,
  Color,
  DispatchResult,
  SpreadsheetChildEnv,
  TrendConfiguration,
  UID,
} from "../../../../types/index";
import { ChartTerms } from "../../../translations_terms";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import {
  AxisDefinition,
  AxisDesignEditor,
} from "../building_blocks/axis_design/axis_design_editor";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";

interface Props {
  figureId: UID;
  definition: ChartWithAxisDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<ChartWithAxisDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ChartWithAxisDefinition>) => DispatchResult;
}

export class ChartWithAxisDesignPanel<P extends Props = Props> extends Component<
  P,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-ChartWithAxisDesignPanel";
  static components = {
    GeneralDesignEditor,
    SidePanelCollapsible,
    Section,
    AxisDesignEditor,
    RoundColorPicker,
    Checkbox,
    RadioSelection,
  };
  static props = {
    figureId: String,
    definition: Object,
    canUpdateChart: Function,
    updateChart: Function,
  };

  axisChoices = CHART_AXIS_CHOICES;

  protected state = useState({ index: 0 });

  get axesList(): AxisDefinition[] {
    const { useLeftAxis, useRightAxis } = getDefinedAxis(this.props.definition);
    let axes: AxisDefinition[] = [{ id: "x", name: _t("Horizontal axis") }];
    if (useLeftAxis) {
      axes.push({ id: "y", name: useRightAxis ? _t("Left axis") : _t("Vertical axis") });
    }
    if (useRightAxis) {
      axes.push({ id: "y1", name: useLeftAxis ? _t("Right axis") : _t("Vertical axis") });
    }
    return axes;
  }

  updateLegendPosition(ev) {
    this.props.updateChart(this.props.figureId, {
      legendPosition: ev.target.value,
    });
  }

  getDataSeries() {
    return this.props.definition.dataSets.map((d, i) => d.label ?? `${ChartTerms.Series} ${i + 1}`);
  }

  getPolynomialDegrees(): number[] {
    return range(1, this.getMaxPolynomialDegree() + 1);
  }

  updateSerieEditor(ev) {
    const chartId = this.props.figureId;
    const selectedIndex = ev.target.selectedIndex;
    const runtime = this.env.model.getters.getChartRuntime(chartId);
    if (!runtime) {
      return;
    }
    this.state.index = selectedIndex;
  }

  updateDataSeriesColor(color: string) {
    const dataSets = [...this.props.definition.dataSets];
    if (!dataSets?.[this.state.index]) {
      return;
    }
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      backgroundColor: color,
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  getDataSerieColor() {
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) {
      return "";
    }
    const color = dataSets[this.state.index].backgroundColor;
    return color ? toHex(color) : getNthColor(this.state.index, getColorsPalette(dataSets.length));
  }

  updateDataSeriesAxis(axis: "left" | "right") {
    const dataSets = [...this.props.definition.dataSets];
    if (!dataSets?.[this.state.index]) {
      return;
    }
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      yAxisId: axis === "left" ? "y" : "y1",
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  getDataSerieAxis() {
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) {
      return "left";
    }
    return dataSets[this.state.index].yAxisId === "y1" ? "right" : "left";
  }

  get canHaveTwoVerticalAxis() {
    return "horizontal" in this.props.definition ? !this.props.definition.horizontal : true;
  }

  updateDataSeriesLabel(ev) {
    const label = ev.target.value;
    const dataSets = [...this.props.definition.dataSets];
    if (!dataSets?.[this.state.index]) {
      return;
    }
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      label,
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  getDataSerieLabel() {
    const dataSets = this.props.definition.dataSets;
    return dataSets[this.state.index]?.label || this.getDataSeries()[this.state.index];
  }

  updateShowValues(showValues: boolean) {
    this.props.updateChart(this.props.figureId, { showValues });
  }

  toggleDataTrend(display: boolean) {
    const dataSets = [...this.props.definition.dataSets];
    if (!dataSets?.[this.state.index]) {
      return;
    }
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      trend: {
        type: "polynomial",
        order: 1,
        ...dataSets[this.state.index].trend,
        display,
      },
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  getTrendLineConfiguration() {
    const dataSets = this.props.definition.dataSets;
    return dataSets?.[this.state.index]?.trend;
  }

  getTrendType(config: TrendConfiguration) {
    if (!config) {
      return "";
    }
    return config.type === "polynomial" && config.order === 1 ? "linear" : config.type;
  }

  onChangeTrendType(ev: InputEvent) {
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
    this.updateTrendLineValue(config);
  }

  onChangePolynomialDegree(ev: InputEvent) {
    const element = ev.target as HTMLInputElement;
    this.updateTrendLineValue({ order: parseInt(element.value) });
  }

  getTrendLineColor() {
    return this.getTrendLineConfiguration()?.color ?? setColorAlpha(this.getDataSerieColor(), 0.5);
  }

  updateTrendLineColor(color: Color) {
    this.updateTrendLineValue({ color });
  }

  updateTrendLineValue(config: any) {
    const dataSets = [...this.props.definition.dataSets];
    if (!dataSets?.[this.state.index]) {
      return;
    }
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      trend: {
        ...dataSets[this.state.index].trend,
        ...config,
      },
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  getMaxPolynomialDegree() {
    const runtime = this.env.model.getters.getChartRuntime(this.props.figureId) as ChartJSRuntime;
    return Math.min(10, runtime.chartJsConfig.data.datasets[this.state.index].data.length - 1);
  }
}
