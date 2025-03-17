import { LineChartDefinition } from "../../../../types/chart";
import { DispatchResult, UID } from "../../../../types/index";
import { ChartShowDataMarkers } from "../building_blocks/show_data_markers/show_data_markers";
import { GenericZoomableChartDesignPanel } from "../zoomable_chart/design_panel";

interface Props {
  chartId: UID;
  definition: LineChartDefinition;
  canUpdateChart: (chartId: UID, definition: LineChartDefinition) => DispatchResult;
  updateChart: (chartId: UID, definition: LineChartDefinition) => DispatchResult;
}

export class LineChartDesignPanel extends GenericZoomableChartDesignPanel<Props> {
  static template = "o-spreadsheet-LineChartDesignPanel";
  static components = {
    ...GenericZoomableChartDesignPanel.components,
    ChartShowDataMarkers,
  };
}
