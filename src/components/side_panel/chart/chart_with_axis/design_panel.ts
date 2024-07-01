import { Component, useState } from "@odoo/owl";
import { getNthColor, toHex } from "../../../../helpers";
import { getDefinedAxis } from "../../../../helpers/figures/charts";
import { _t } from "../../../../translation";
import {
  ChartWithAxisDefinition,
  Color,
  DispatchResult,
  SpreadsheetChildEnv,
  TrendType,
  UID,
} from "../../../../types/index";
import { css } from "../../../helpers";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import {
  AxisDefinition,
  AxisDesignEditor,
} from "../building_blocks/axis_design/axis_design_editor";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";

css/* scss */ `
  .o-degree-input {
    width: 50%;
  }
`;

interface Props {
  figureId: UID;
  definition: ChartWithAxisDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<ChartWithAxisDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ChartWithAxisDefinition>) => DispatchResult;
}

export class ChartWithAxisDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartWithAxisDesignPanel";
  static components = {
    GeneralDesignEditor,
    SidePanelCollapsible,
    Section,
    AxisDesignEditor,
    RoundColorPicker,
    Checkbox,
  };
  static props = {
    figureId: String,
    definition: Object,
    canUpdateChart: Function,
    updateChart: Function,
  };

  private state = useState({ index: 0 });

  get axesList(): AxisDefinition[] {
    const { useLeftAxis, useRightAxis } = getDefinedAxis(this.props.definition);
    let axes: AxisDefinition[] = [{ id: "x", name: _t("Horizontal axis") }];
    if (useLeftAxis) {
      axes.push({ id: "y", name: _t("Vertical (left) axis") });
    }
    if (useRightAxis) {
      axes.push({ id: "y1", name: _t("Vertical (right) axis") });
    }
    return axes;
  }

  updateLegendPosition(ev) {
    this.props.updateChart(this.props.figureId, {
      legendPosition: ev.target.value,
    });
  }

  getDataSeries() {
    const runtime = this.env.model.getters.getChartRuntime(this.props.figureId);
    if (!runtime || !("chartJsConfig" in runtime)) {
      return [];
    }
    const datasets = runtime.chartJsConfig.data.datasets;
    return this.props.definition.dataSets.map((d, i) => datasets[i].label);
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
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) return;
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      backgroundColor: color,
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  getDataSerieColor() {
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) return "";
    const color = dataSets[this.state.index].backgroundColor;
    return color ? toHex(color) : getNthColor(this.state.index);
  }

  updateDataSeriesAxis(ev) {
    const axis = ev.target.value;
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) return;
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      yAxisId: axis === "left" ? "y" : "y1",
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  getDataSerieAxis() {
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) return "left";
    return dataSets[this.state.index].yAxisId === "y1" ? "right" : "left";
  }

  get canHaveTwoVerticalAxis() {
    return "horizontal" in this.props.definition ? !this.props.definition.horizontal : true;
  }

  updateDataSeriesLabel(ev) {
    const label = ev.target.value;
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) return;
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

  updateDataTrend(trend: boolean) {
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) return;
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      trend: trend
        ? {
            type: "polynomial",
            order: 3,
            ...dataSets[this.state.index].trend,
          }
        : undefined,
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  getDataTrend() {
    const dataSets = this.props.definition.dataSets;
    return dataSets?.[this.state.index]?.trend;
  }

  onChangeTrendType(ev: InputEvent) {
    const type = (ev.target as HTMLInputElement).value as TrendType;
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) return;
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      trend: {
        ...dataSets[this.state.index].trend,
        type,
      },
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  onChangePolynomialDegree(ev: InputEvent) {
    const order = parseInt((ev.target as HTMLInputElement).value);
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) return;
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      trend: {
        ...dataSets[this.state.index].trend,
        type: "polynomial",
        order,
      },
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  updateTrendLineColor(color: Color) {
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) return;
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      trend: {
        type: "polynomial",
        ...dataSets[this.state.index].trend,
        color,
      },
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }
}
