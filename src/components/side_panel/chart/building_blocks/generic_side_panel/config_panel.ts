import { proxy, useProps } from "@odoo/owl";
import { Component } from "../../../../../owl3_compatibility_layer";
import { ChartDefinitionWithDataSource } from "../../../../../types/chart/chart";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { ChartTerms } from "../../../../translations_terms";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../../common";
import { ChartDataSourceComponent } from "../data_source/data_source";
import { ChartErrorSection } from "../error_section/error_section";

interface GenericChartPanelState {
  errorMessages: string[];
}

export class GenericChartConfigPanel<
  P extends ChartSidePanelProps<ChartDefinitionWithDataSource<string>> = ChartSidePanelProps<
    ChartDefinitionWithDataSource<string>
  >
> extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GenericChartConfigPanel";
  static components = {
    ChartDataSourceComponent,
    Section,
    Checkbox,
    ChartErrorSection,
  };
  protected props = useProps(chartSidePanelPropsDefinition) as unknown as P;

  protected chartTerms = ChartTerms;
  protected state: GenericChartPanelState = proxy({
    errorMessages: [],
  });

  onErrorMessagesChanged(errorMessages: string[]) {
    this.state.errorMessages = errorMessages;
  }

  get errorMessages(): string[] {
    return this.state.errorMessages;
  }

  /**
   * This method can be overridden by charts extending the GenericChartConfigPanel
   * to add specific options (like cumulative or treating labels as text).
   */
  getLabelRangeOptions() {
    return [this.getAggregateLabelRangeOption()];
  }

  getAggregateLabelRangeOption() {
    return {
      name: "aggregated",
      label: this.chartTerms.AggregatedChart,
      value:
        ("aggregated" in this.props.definition ? this.props.definition.aggregated : false) ?? false,
      onChange: (aggregated: boolean) => {
        this.props.updateChart(this.props.chartId, { aggregated });
      },
    };
  }

  getGroupByParentCategories() {
    return {
      name: "groupByParentCategories",
      label: this.chartTerms.GroupByParentCategories,
      value:
        ("groupByParentCategories" in this.props.definition
          ? this.props.definition.groupByParentCategories
          : false) ?? false,
      onChange: (groupByParentCategories: boolean) => {
        this.props.updateChart(this.props.chartId, { groupByParentCategories });
      },
    };
  }

  get hasMultipleLabelRanges(): boolean {
    const dataSource = this.props.definition.dataSource;
    return dataSource?.type === "range" ? (dataSource.labelRanges?.length ?? 0) > 1 : false;
  }
}
