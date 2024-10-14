import { Component, useState } from "@odoo/owl";
import { getColorsPalette, getNthColor, toHex } from "../../../../../helpers";
import {
  ChartWithDataSetDefinition,
  DispatchResult,
  SpreadsheetChildEnv,
  UID,
} from "../../../../../types";
import { SidePanelCollapsible } from "../../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";

interface Props {
  figureId: UID;
  definition: ChartWithDataSetDefinition;
  canUpdateChart: (
    figureID: UID,
    definition: Partial<ChartWithDataSetDefinition>
  ) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
}

export class SeriesDesignEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SeriesDesignEditor";
  static components = {
    SidePanelCollapsible,
    Section,
    RoundColorPicker,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
    slots: { type: Object, optional: true },
  };

  protected state = useState({ index: 0 });

  getDataSeries() {
    const runtime = this.env.model.getters.getChartRuntime(this.props.figureId);
    if (!runtime || !("chartJsConfig" in runtime)) {
      return [];
    }
    return runtime.chartJsConfig.data.datasets.map((d) => d.label);
  }

  updateSerieEditor(ev) {
    this.state.index = ev.target.selectedIndex;
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
    return color
      ? toHex(color)
      : getNthColor(this.state.index, getColorsPalette(this.props.definition.dataSets.length));
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
}
