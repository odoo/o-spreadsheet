import { LineChartDefinition } from "../../../../types/chart";
import { ChartShowDataMarkers } from "../building_blocks/show_data_markers/show_data_markers";
import { ChartSidePanelProps } from "../common";
import { GenericZoomableChartDesignPanel } from "../zoomable_chart/design_panel";

export class LineChartDesignPanel extends GenericZoomableChartDesignPanel<
  ChartSidePanelProps<LineChartDefinition>
> {
  static template = "o-spreadsheet-LineChartDesignPanel";
  static components = {
    ...GenericZoomableChartDesignPanel.components,
    ChartShowDataMarkers,
  };
}
