import { proxy, useProps } from "@odoo/owl";
import { HeatmapChartDefinition } from "../../../../types/chart/heatmap_chart";
import { CommandResult, DispatchResult } from "../../../../types/commands";
import { ChartTerms } from "../../../translations_terms";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";
import { ChartLabelRange } from "../building_blocks/label_range/label_range";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../common";

interface HeatmapChartPanelState {
  rowRangeDispatchResult?: DispatchResult;
}

type Props = ChartSidePanelProps<HeatmapChartDefinition<string>>;

export class HeatmapChartConfigPanel extends GenericChartConfigPanel<Props> {
  static template = "o-spreadsheet-HeatmapChartConfigPanel";
  static components = { ...GenericChartConfigPanel.components, ChartLabelRange };
  protected props = useProps(chartSidePanelPropsDefinition) as unknown as Props;

  protected heatmapState: HeatmapChartPanelState = proxy({
    rowRangeDispatchResult: undefined,
  });

  private rowRange?: string;

  setup() {
    this.rowRange = this.props.definition.rowRange;
  }

  get errorMessages(): string[] {
    const reasons = (this.heatmapState.rowRangeDispatchResult?.reasons || []).filter(
      (reason) => reason !== CommandResult.NoChanges
    );
    return [
      ...reasons.map((error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected),
      ...super.errorMessages,
    ];
  }

  getLabelRangeOptions() {
    return [];
  }

  get isRowRangeInvalid(): boolean {
    return !!this.heatmapState.rowRangeDispatchResult?.isCancelledBecause(
      CommandResult.InvalidHeatmapRowRange
    );
  }

  onRowRangeChanged(ranges: string[]) {
    this.rowRange = ranges[0];
    this.heatmapState.rowRangeDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      rowRange: this.rowRange,
    });
  }

  onRowRangeConfirmed() {
    this.heatmapState.rowRangeDispatchResult = this.props.updateChart(this.props.chartId, {
      rowRange: this.rowRange,
    });
  }
}
