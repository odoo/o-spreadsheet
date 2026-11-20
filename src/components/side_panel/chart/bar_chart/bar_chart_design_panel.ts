import { BarChartDefinition } from "../../../../types/chart/bar_chart";
import { ChartSidePanelProps } from "../common";
import { GenericZoomableChartDesignPanel } from "../zoomable_chart/design_panel";

export class BarChartDesignPanel extends GenericZoomableChartDesignPanel<
  ChartSidePanelProps<BarChartDefinition<string>>
> {
  static template = "o-spreadsheet-BarChartDesignPanel";
  get isZoomable() {
    return !this.props.definition.horizontal;
  }

  get showPercentageCheckbox() {
    const { dataSource, stacked } = this.props.definition;
    return dataSource.type === "range" && (stacked || dataSource.dataSets.length < 2);
  }
}
