import { Component, useState } from "@odoo/owl";
import { toHex } from "../../../../helpers";
import { _t } from "../../../../translation";
import { BarChartDefinition } from "../../../../types/chart/bar_chart";
import { ComboChartDefinition } from "../../../../types/chart/combo_chart";
import { LineChartDefinition } from "../../../../types/chart/line_chart";
import { PieChartDefinition } from "../../../../types/chart/pie_chart";
import {
  ChartRuntime,
  Color,
  DispatchResult,
  SpreadsheetChildEnv,
  UID,
} from "../../../../types/index";
import { Section } from "../../components/section/section";
import { ChartColor } from "../building_blocks/color/color";
import { ChartTitle } from "../building_blocks/title/title";

interface PanelState {
  label: string;
  color: Color;
  axis: string;
  index: number;
}

interface Props {
  figureId: UID;
  definition: LineChartDefinition | BarChartDefinition | PieChartDefinition | ComboChartDefinition;
  canUpdateChart: (
    definition: Partial<
      LineChartDefinition | BarChartDefinition | PieChartDefinition | ComboChartDefinition
    >
  ) => DispatchResult;
  updateChart: (
    figureId: UID,
    definition: Partial<
      LineChartDefinition | BarChartDefinition | PieChartDefinition | ComboChartDefinition
    >
  ) => DispatchResult;
  getRuntime?: (figureId: UID) => ChartRuntime;
}

export class LineBarPieDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LineBarPieDesignPanel";
  static components = { ChartColor, ChartTitle, Section };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
    getRuntime: { type: Function, optional: true },
  };

  selectedDatasetColor: string | undefined;
  selectedDatasetAxis: string | undefined;

  private state!: PanelState;

  setup() {
    const runtime = this.props.getRuntime?.(this.props.figureId);
    if (!runtime) {
      return;
    }
    //@ts-ignore
    const color = toHex(runtime.chartJsConfig.data.datasets[0].backgroundColor as string);
    //@ts-ignore
    const axis = runtime.chartJsConfig.data.datasets[0].yAxisID === "y" ? "left" : "right";
    //@ts-ignore
    const label = runtime.chartJsConfig.data.datasets[0].label || "";

    this.state = useState({
      label,
      color,
      axis,
      index: 0,
    });
  }

  get title() {
    return _t(this.props.definition.title);
  }

  updateBackgroundColor(color: Color) {
    this.props.updateChart(this.props.figureId, {
      background: color,
    });
  }

  updateTitle(title: string) {
    this.props.updateChart(this.props.figureId, { title });
  }

  updateSelect(attr: string, ev) {
    this.props.updateChart(this.props.figureId, {
      [attr]: ev.target.value,
    });
  }

  getDataSeries() {
    const runtime = this.props.getRuntime?.(this.props.figureId);
    if (!runtime) {
      return [];
    }
    //@ts-ignore
    return runtime.chartJsConfig.data.datasets.map((d) => d.label);
  }

  updateSerieEditor(ev) {
    const chartId = this.props.figureId;
    const selectedIndex = ev.target.selectedIndex;
    const runtime = this.props.getRuntime?.(chartId);
    if (!runtime) {
      return;
    }
    //@ts-ignore
    const dataSets = runtime.chartJsConfig.data.datasets[selectedIndex];
    const color = dataSets.backgroundColor;
    //@ts-ignore
    const axis = dataSets.yAxisID;
    this.state.index = selectedIndex;
    this.state.label = dataSets.label || "";
    this.state.color = toHex(color as string);
    this.state.axis = axis === "y" ? "left" : "right";
  }

  updateDataSeriesColor(color: string) {
    const dataSetDesign = (this.props.definition as ComboChartDefinition).dataSetDesign ?? [];
    if (dataSetDesign.length < this.state.index) {
      for (let i = dataSetDesign.length; i <= this.state.index; i++) {
        dataSetDesign.push({});
      }
    }
    dataSetDesign[this.state.index] = {
      ...dataSetDesign[this.state.index],
      backgroundColor: color,
    };
    this.props.updateChart(this.props.figureId, { dataSetDesign });
    this.state.color = color;
  }

  updateDataSeriesAxis(ev) {
    const axis = ev.target.value;
    const dataSetDesign = (this.props.definition as ComboChartDefinition).dataSetDesign ?? [];
    if (dataSetDesign.length < this.state.index) {
      for (let i = dataSetDesign.length; i <= this.state.index; i++) {
        dataSetDesign.push({});
      }
    }
    dataSetDesign[this.state.index] = {
      ...dataSetDesign[this.state.index],
      yAxisID: axis === "left" ? "y" : "y1",
    };
    this.props.updateChart(this.props.figureId, { dataSetDesign });
  }

  updateDataSeriesLabel(ev) {
    const label = ev.target.value;
    const dataSetDesign = (this.props.definition as ComboChartDefinition).dataSetDesign ?? [];
    if (dataSetDesign.length < this.state.index) {
      for (let i = dataSetDesign.length; i <= this.state.index; i++) {
        dataSetDesign.push({});
      }
    }
    dataSetDesign[this.state.index] = {
      ...dataSetDesign[this.state.index],
      label,
    };
    this.props.updateChart(this.props.figureId, { dataSetDesign });
    this.state.label = label;
  }
}
