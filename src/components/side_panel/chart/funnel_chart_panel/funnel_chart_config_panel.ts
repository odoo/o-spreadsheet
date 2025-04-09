import { FunnelChartDefinition } from "../../../../types/chart";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class FunnelChartConfigPanel extends GenericChartConfigPanel {
  getLabelRangeOptions() {
    const definition = this.props.definition as FunnelChartDefinition;
    return [
      {
        name: "aggregated",
        label: this.chartTerms.AggregatedChart,
        value: definition.aggregated ?? false,
        onChange: this.onUpdateAggregated.bind(this),
      },
      {
        name: "cumulative",
        label: this.chartTerms.CumulativeData,
        value: definition.cumulative ?? false,
        onChange: this.onUpdateCumulative.bind(this),
      },
      {
        name: "dataSetsHaveTitle",
        label: this.dataSetsHaveTitleLabel,
        value: definition.dataSetsHaveTitle,
        onChange: this.onUpdateDataSetsHaveTitle.bind(this),
      },
    ];
  }

  onUpdateCumulative(cumulative: boolean) {
    this.props.updateChart(this.props.figureId, {
      cumulative,
    });
  }
}
