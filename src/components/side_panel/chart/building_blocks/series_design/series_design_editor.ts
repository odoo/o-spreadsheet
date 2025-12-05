import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { getColorsPalette, getNthColor, toHex } from "../../../../../helpers";
import { ChartWithDataSetDefinition, CustomisableSeriesChartRuntime } from "../../../../../types";
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
  };
  static props = {
    ...ChartSidePanelPropsObject,
    slots: { type: Object, optional: true },
  };

  protected state = useState({ dataSetId: this.getDataSeries()[0]?.dataSetId || "" });

  private getRuntime(): CustomisableSeriesChartRuntime {
    const runtime = this.env.model.getters.getChartRuntime(this.props.chartId);
    if (!runtime || !("customisableSeries" in runtime)) {
      throw new Error(
        "SeriesDesignEditor: chart runtime is not compatible with series customization."
      );
    }
    return runtime as CustomisableSeriesChartRuntime;
  }

  getDataSeries() {
    return this.getRuntime().customisableSeries;
  }

  updateEditedSeries(ev: Event) {
    this.state.dataSetId = (ev.target as HTMLSelectElement).value;
  }

  updateDataSeriesColor(color: string) {
    const dataSetStyles = { ...this.props.definition.dataSetStyles };
    dataSetStyles[this.state.dataSetId] = {
      ...dataSetStyles[this.state.dataSetId],
      backgroundColor: color,
    };
    this.props.updateChart(this.props.chartId, { dataSetStyles });
  }

  getDataSeriesColor() {
    const dataSetStyles = this.props.definition.dataSetStyles;
    const color = dataSetStyles[this.state.dataSetId]?.backgroundColor;
    const dataSeries = this.getDataSeries();
    const index = dataSeries.findIndex((series) => series.dataSetId === this.state.dataSetId);
    return color ? toHex(color) : getNthColor(index, getColorsPalette(dataSeries.length));
  }

  updateDataSeriesLabel(ev: Event) {
    const label = (ev.target as HTMLInputElement).value;
    const dataSetStyles = { ...this.props.definition.dataSetStyles };
    dataSetStyles[this.state.dataSetId] = {
      ...dataSetStyles[this.state.dataSetId],
      label,
    };
    this.props.updateChart(this.props.chartId, { dataSetStyles });
  }

  getDataSeriesLabel(): string {
    const dataSetStyles = this.props.definition.dataSetStyles;
    return (
      dataSetStyles[this.state.dataSetId]?.label ||
      this.getDataSeries().find((series) => series.dataSetId === this.state.dataSetId)?.label ||
      ""
    );
  }
}
