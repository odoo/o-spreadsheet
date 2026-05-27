import { proxy } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";
import { _t } from "../../../../translation";
import { BaselineMode, ScorecardChartDefinition } from "../../../../types/chart/scorecard_chart";
import { ValueAndLabel } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Select } from "../../../select/select";
import { Section } from "../../components/section/section";
import { ChartDataSourceComponent } from "../building_blocks/data_source/data_source";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

export class ScorecardChartConfigPanel extends Component<
  ChartSidePanelProps<ScorecardChartDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-ScorecardChartConfigPanel";
  static components = { ChartDataSourceComponent, ChartErrorSection, Section, Select };
  static props = ChartSidePanelPropsObject;

  protected state: { errorMessages: string[] } = proxy({
    errorMessages: [],
  });

  onErrorMessagesChanged(errorMessages: string[]) {
    this.state.errorMessages = errorMessages;
  }

  get errorMessages(): string[] {
    return this.state.errorMessages;
  }

  updateBaselineMode(baselineMode: BaselineMode) {
    this.props.updateChart(this.props.chartId, { baselineMode });
  }

  get baselineModeOptions(): ValueAndLabel[] {
    return [
      { value: "text", label: _t("Absolute value") },
      { value: "difference", label: _t("Value change from key value") },
      { value: "percentage", label: _t("Percentage change from key value") },
      { value: "progress", label: _t("Progress bar") },
    ];
  }
}
