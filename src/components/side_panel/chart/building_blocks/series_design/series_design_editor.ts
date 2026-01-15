import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { getColorsPalette, getNthColor, toHex } from "../../../../../helpers";
import { isTrendLineAxis } from "../../../../../helpers/figures/charts";
import { ChartWithDataSetDefinition, ValueAndLabel } from "../../../../../types";
import { Select } from "../../../../select/select";
import { SidePanelCollapsible } from "../../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

interface Props extends ChartSidePanelProps<ChartWithDataSetDefinition> {
  slots?: object;
}

export class SeriesDesignEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SeriesDesignEditor";
  static components = {
    SidePanelCollapsible,
    Section,
    RoundColorPicker,
    Select,
  };
  static props = {
    ...ChartSidePanelPropsObject,
    slots: { type: Object, optional: true },
  };

  protected state = useState({ index: 0 });

  getDataSeries() {
    const runtime = this.env.model.getters.getChartRuntime(this.props.chartId);
    if (!runtime || !("chartJsConfig" in runtime)) {
      return [];
    }
    return runtime.chartJsConfig.data.datasets
      .filter((d) => !isTrendLineAxis(d["xAxisID"] ?? ""))
      .map((d) => d.label || "");
  }

  updateEditedSeries(index: string) {
    this.state.index = Number(index);
  }

  updateDataSeriesColor(color: string) {
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) {
      return;
    }
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      backgroundColor: color,
    };
    this.props.updateChart(this.props.chartId, { dataSets });
  }

  getDataSeriesColor() {
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) {
      return "";
    }
    const color = dataSets[this.state.index].backgroundColor;
    return color
      ? toHex(color)
      : getNthColor(this.state.index, getColorsPalette(this.props.definition.dataSets.length));
  }

  updateDataSeriesLabel(ev: Event) {
    const label = (ev.target as HTMLInputElement).value;
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) {
      return;
    }
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      label,
    };
    this.props.updateChart(this.props.chartId, { dataSets });
  }

  getDataSeriesLabel() {
    const dataSets = this.props.definition.dataSets;
    return dataSets[this.state.index]?.label || this.getDataSeries()[this.state.index];
  }

  get selectOptions(): ValueAndLabel[] {
    return this.getDataSeries().map((label, index) => ({
      value: index.toString(),
      label,
    }));
  }
}
