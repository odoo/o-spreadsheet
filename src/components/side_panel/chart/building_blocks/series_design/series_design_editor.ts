import { props, proxy } from "@odoo/owl";
import { getColorsPalette, getNthColor, toHex } from "../../../../../helpers/color";
import { Component } from "../../../../../owl3_compatibility_layer";
import {
  ChartDefinitionWithDataSource,
  CustomizableSeriesChartRuntime,
} from "../../../../../types/chart/chart";
import { DispatchResult } from "../../../../../types/commands";
import { UID, ValueAndLabel } from "../../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { types } from "../../../../props_validation";
import { Select } from "../../../../select/select";
import { SidePanelCollapsible } from "../../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";

export class SeriesDesignEditor extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SeriesDesignEditor";
  static components = {
    SidePanelCollapsible,
    Section,
    RoundColorPicker,
    Select,
  };

  protected props = props({
    chartId: types.UID(),
    definition: types.ChartDefinitionWithDataSource(),
    canUpdateChart: types.function<
      [chartId: UID, definition: Partial<ChartDefinitionWithDataSource<string>>],
      DispatchResult
    >([types.UID(), types.object({})], types.DispatchResult()),
    updateChart: types.function<
      [chartId: UID, definition: Partial<ChartDefinitionWithDataSource<string>>],
      DispatchResult
    >([types.UID(), types.object({})], types.DispatchResult()),
  });

  protected state = proxy({ dataSetId: this.getDataSeries()[0]?.dataSetId || "" });

  private getRuntime(): CustomizableSeriesChartRuntime {
    const runtime = this.env.model.getters.getChartRuntime(this.props.chartId);
    if (!runtime || !("customizableSeries" in runtime)) {
      throw new Error(
        "SeriesDesignEditor: chart runtime is not compatible with series customization."
      );
    }
    return runtime as CustomizableSeriesChartRuntime;
  }

  getDataSeries() {
    return this.getRuntime().customizableSeries;
  }

  updateEditedSeries(dataSetId: string) {
    this.state.dataSetId = dataSetId;
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
    const color = dataSetStyles?.[this.state.dataSetId]?.backgroundColor;
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
      dataSetStyles?.[this.state.dataSetId]?.label ||
      this.getDataSeries().find((series) => series.dataSetId === this.state.dataSetId)?.label ||
      ""
    );
  }

  get selectOptions(): ValueAndLabel[] {
    return this.getDataSeries().map(({ label, dataSetId }) => ({
      value: dataSetId,
      label,
    }));
  }
}
