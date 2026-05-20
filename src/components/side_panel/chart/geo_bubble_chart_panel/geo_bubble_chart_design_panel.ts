import { GeoBubbleChartDefinition } from "../../../../types/chart/geo_bubble_chart";
import { BubbleDesignSection } from "../bubble_chart/bubble_design_section.ts";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";
import { ChartSidePanelProps } from "../common";

export class GeoBubbleChartDesignPanel extends ChartWithAxisDesignPanel<
  ChartSidePanelProps<GeoBubbleChartDefinition<string>>
> {
  static template = "o-spreadsheet-GeoBubbleChartDesignPanel";
  static components = {
    ...ChartWithAxisDesignPanel.components,
    BubbleDesignSection,
  };
}
