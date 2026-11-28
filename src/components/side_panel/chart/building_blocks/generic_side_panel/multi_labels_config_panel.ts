import { ChartDefinitionWithDataSource } from "../../../../../types/chart/chart";
import { ChartSidePanelProps } from "../../common";
import { GenericChartConfigPanel } from "./config_panel";

/**
 * Config panel for chart types that can display a "Group by parent categories"
 * option when several label ranges are set (bar, combo, pyramid, waterfall).
 */
export class MultiLabelsChartConfigPanel<
  P extends ChartSidePanelProps<ChartDefinitionWithDataSource<string>> = ChartSidePanelProps<
    ChartDefinitionWithDataSource<string>
  >
> extends GenericChartConfigPanel<P> {
  getLabelRangeOptions() {
    const options = [this.getAggregateLabelRangeOption()];
    if (this.hasMultipleLabelRanges) {
      options.push(this.getGroupByParentCategories());
    }
    return options;
  }
}
