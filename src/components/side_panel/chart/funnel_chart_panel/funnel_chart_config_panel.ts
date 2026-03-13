import { FunnelChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class FunnelChartConfigPanel extends GenericChartConfigPanel {
  getLabelRangeOptions() {
    const definition = this.props.definition as FunnelChartDefinition<string>;
    return [
      this.getAggregateLabelRangeOption(),
      {
        name: "cumulative",
        label: this.chartTerms.CumulativeData,
        value: definition.cumulative ?? false,
        onChange: this.onUpdateCumulative.bind(this),
      },
    ];
  }

  onUpdateCumulative(cumulative: boolean) {
    this.props.updateChart(this.props.chartId, {
      cumulative,
    });
  }
}
