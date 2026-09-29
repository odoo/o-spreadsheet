import { proxy, useProps } from "@odoo/owl";
import { GaugeChartDefinition } from "../../../../types/chart/gauge_chart";
import { CommandResult, DispatchResult } from "../../../../types/commands";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { OSComponent } from "../../../os_component";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ChartTerms } from "../../../translations_terms";
import { Section } from "../../components/section/section";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../common";

interface PanelState {
  dataRangeDispatchResult?: DispatchResult;
}

export class GaugeChartConfigPanel extends OSComponent {
  static template = "o-spreadsheet-GaugeChartConfigPanel";
  static components = { ChartErrorSection, Section, SelectionInput, StandaloneComposer };
  protected props = useProps(
    chartSidePanelPropsDefinition
  ) as unknown as ChartSidePanelProps<GaugeChartDefinition>;

  private state: PanelState = proxy({
    dataRangeDispatchResult: undefined,
  });

  private metric: string | undefined = this.props.definition.metric;

  get configurationErrorMessages(): string[] {
    const cancelledReasons = [...(this.state.dataRangeDispatchResult?.reasons || [])].filter(
      (reason) => reason !== CommandResult.NoChanges
    );
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  get isDataRangeInvalid(): boolean {
    return !!this.state.dataRangeDispatchResult?.isCancelledBecause(
      CommandResult.InvalidGaugeDataRange
    );
  }

  updateMetric(metric: string) {
    this.metric = metric;
    this.state.dataRangeDispatchResult = this.props.updateChart(this.props.chartId, {
      metric: this.metric,
    });
  }

  getDataRange() {
    return { dataRange: this.metric || "" };
  }

  get ranges(): string[] {
    return [this.getDataRange()].map((r) => r.dataRange);
  }

  get disabledRanges(): boolean[] {
    return this.ranges.map((r, i) => false);
  }
}
