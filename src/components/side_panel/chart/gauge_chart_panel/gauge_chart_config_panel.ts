import { ChartTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { GaugeChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/gauge_chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { CommandResult, DispatchResult, RangeChartDataSet, UID } from "../../../../types/index";
import { ChartDataSeries } from "../building_blocks/data_series/data_series";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";

interface Props {
  chartId: UID;
  definition: GaugeChartDefinition;
  canUpdateChart: (chartId: UID, definition: Partial<GaugeChartDefinition>) => DispatchResult;
  updateChart: (chartId: UID, definition: Partial<GaugeChartDefinition>) => DispatchResult;
}

interface PanelState {
  dataRangeDispatchResult?: DispatchResult;
}

export class GaugeChartConfigPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GaugeChartConfigPanel";
  static components = { ChartErrorSection, ChartDataSeries };
  static props = {
    chartId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
  };

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

  getDataRange(): RangeChartDataSet {
    return { dataRange: this.dataRange || "" };
  }
}
