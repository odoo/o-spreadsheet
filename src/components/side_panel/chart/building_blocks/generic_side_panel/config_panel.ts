import { ChartTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { ChartDefinitionWithDataSource } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";
import { ChartErrorSection } from "../error_section/error_section";
import { ChartRangeDataSource } from "../range_data_source/range_data_source";

interface GenericChartPanelState {
  errorMessages: string[];
}

export class GenericChartConfigPanel<
  P extends ChartSidePanelProps<ChartDefinitionWithDataSource<string>> = ChartSidePanelProps<
    ChartDefinitionWithDataSource<string>
  >
> extends Component<P, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GenericChartConfigPanel";
  static components = {
    ChartRangeDataSource,
    Section,
    Checkbox,
    ChartErrorSection,
  };
  static props = ChartSidePanelPropsObject;

  protected chartTerms = ChartTerms;
  protected state: GenericChartPanelState = useState({
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
}
