import { proxy, useProps } from "@odoo/owl";
import { GaugeChartDefinition } from "../../../../types/chart/gauge_chart";
import { CommandResult, DispatchResult } from "../../../../types/commands";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { OSComponent } from "../../../os_component";
import { ChartTerms } from "../../../translations_terms";
import { Section } from "../../components/section/section";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../common";

interface PanelState {
  metricDispatchResult?: DispatchResult;
}

export class GaugeChartConfigPanel extends OSComponent {
  static template = "o-spreadsheet-GaugeChartConfigPanel";
  static components = { ChartErrorSection, Section, StandaloneComposer };
  protected props = useProps(
    chartSidePanelPropsDefinition
  ) as unknown as ChartSidePanelProps<GaugeChartDefinition>;

  private state: PanelState = proxy({
    metricDispatchResult: undefined,
  });

  private metric: string | undefined = this.props.definition.metric;

  get configurationErrorMessages(): string[] {
    const cancelledReasons = [...(this.state.metricDispatchResult?.reasons || [])].filter(
      (reason) => reason !== CommandResult.NoChanges
    );
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  onConfirmMetric(metric: string) {
    this.metric = metric;
    this.state.metricDispatchResult = this.props.updateChart(this.props.chartId, {
      metric: this.metric,
    });
  }

  getMetric(): string {
    return this.metric || "";
  }
}
