import { Component, useState } from "@odoo/owl";
import { getNthColor, toHex } from "../../../../../helpers";
import { _t } from "../../../../../translation";
import {
  ChartWithAxisDefinition,
  DispatchResult,
  SpreadsheetChildEnv,
  UID,
} from "../../../../../types";
import { SidePanelCollapsible } from "../../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";

interface Props {
  figureId: UID;
  definition: ChartWithAxisDefinition;
  updateChart: (figureId: UID, definition: Partial<ChartWithAxisDefinition>) => DispatchResult;
  canChangeVerticalAxis?: boolean;
}

export class GeneralSeriesEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GeneralSeriesEditor";
  static components = {
    SidePanelCollapsible,
    Section,
    RoundColorPicker,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canChangeVerticalAxis: { type: Boolean, optional: true },
    slots: { type: Object, optional: true },
  };

  private state = useState({ index: -1 });

  getDataSeries() {
    const runtime = this.env.model.getters.getChartRuntime(this.props.figureId);
    if (!runtime || !("chartJsConfig" in runtime)) {
      return [];
    }
    return [_t("All series"), ...runtime.chartJsConfig.data.datasets.map((d) => d.label)];
  }

  updateSerieEditor(ev) {
    this.state.index = ev.target.selectedIndex - 1;
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
    if (this.state.index === -1) {
      return "";
    }
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
    if (this.state.index === -1) {
      return "";
    }
    const dataSets = this.props.definition.dataSets;
    return dataSets[this.state.index + 1]?.label || this.getDataSeries()[this.state.index + 1];
  }

  get canHaveTwoVerticalAxis() {
    return "horizontal" in this.props.definition ? !this.props.definition.horizontal : true;
  }
}
