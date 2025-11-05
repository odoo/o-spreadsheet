import { BarChartDefinition } from "../../../../types/chart";
import { DispatchResult, UID } from "../../../../types/index";
import { GenericZoomableChartDesignPanel } from "../zoomable_chart/design_panel";

interface Props {
  chartId: UID;
  definition: BarChartDefinition;
  canUpdateChart: (chartId: UID, definition: BarChartDefinition) => DispatchResult;
  updateChart: (chartId: UID, definition: BarChartDefinition) => DispatchResult;
}

export class BarChartDesignPanel extends GenericZoomableChartDesignPanel<Props> {
  static template = "o-spreadsheet-BarChartDesignPanel";
  get isZoomable() {
    return !this.props.definition.horizontal;
  }
}
