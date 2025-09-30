import { Component, useState } from "@odoo/owl";
import { GaugeChartDefinition } from "../../../../types/chart/gauge_chart";
import {
  CommandResult,
  CustomizedDataSet,
  DispatchResult,
  SpreadsheetChildEnv,
} from "../../../../types/index";
import { ChartTerms } from "../../../translations_terms";
import { ChartDataSeries } from "../building_blocks/data_series/data_series";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

interface PanelState {
  dataRangeDispatchResult?: DispatchResult;
}

export class GaugeChartConfigPanel extends Component<
  ChartSidePanelProps<GaugeChartDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-GaugeChartConfigPanel";
  static components = { ChartErrorSection, ChartDataSeries };
  static props = ChartSidePanelPropsObject;

  private state: PanelState = useState({
    dataRangeDispatchResult: undefined,
  });

  private dataRange: string | undefined = this.props.definition.dataRange;

  get configurationErrorMessages(): string[] {
    const cancelledReasons = [...(this.state.dataRangeDispatchResult?.reasons || [])];
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  get isDataRangeInvalid(): boolean {
    return !!this.state.dataRangeDispatchResult?.isCancelledBecause(
      CommandResult.InvalidGaugeDataRange
    );
  }

  onDataRangeChanged(ranges: string[]) {
    this.dataRange = ranges[0];
    this.state.dataRangeDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      dataRange: this.dataRange,
    });
  }

  updateDataRange() {
    this.state.dataRangeDispatchResult = this.props.updateChart(this.props.chartId, {
      dataRange: this.dataRange,
    });
  }

  getDataRange(): CustomizedDataSet {
    return { dataRange: this.dataRange || "" };
  }
}
