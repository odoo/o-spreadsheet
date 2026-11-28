import { PyramidChartDefinition } from "../../../../types/chart/pyramid_chart";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";
import { ChartSidePanelProps } from "../common";

export class PyramidChartDesignPanel extends ChartWithAxisDesignPanel<
  ChartSidePanelProps<PyramidChartDefinition<string>>
> {
  get showPercentageCheckbox() {
    return true;
  }
}
