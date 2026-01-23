import { BarChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { DispatchResult, UID } from "../../../../types/index";
import { GenericZoomableChartDesignPanel } from "../zoomable_chart/design_panel";

interface Props {
  chartId: UID;
  definition: BarChartDefinition<string>;
  canUpdateChart: (chartId: UID, definition: BarChartDefinition<string>) => DispatchResult;
  updateChart: (chartId: UID, definition: BarChartDefinition<string>) => DispatchResult;
}

export class BarChartDesignPanel extends GenericZoomableChartDesignPanel<Props> {
  static template = "o-spreadsheet-BarChartDesignPanel";
  get isZoomable() {
    return !this.props.definition.horizontal;
  }
}
