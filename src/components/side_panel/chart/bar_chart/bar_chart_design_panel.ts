import { BarChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { DispatchResult, UID } from "../../../../types/index";
import { ChartShowTotals } from "../building_blocks/show_totals/show_totals";
import { GenericZoomableChartDesignPanel } from "../zoomable_chart/design_panel";

interface Props {
  chartId: UID;
  definition: BarChartDefinition;
  canUpdateChart: (chartId: UID, definition: BarChartDefinition) => DispatchResult;
  updateChart: (chartId: UID, definition: BarChartDefinition) => DispatchResult;
}

export class BarChartDesignPanel extends GenericZoomableChartDesignPanel<Props> {
  static template = "o-spreadsheet-BarChartDesignPanel";
  static components = {
    ...GenericZoomableChartDesignPanel.components,
    ChartShowTotals,
  };
  get isZoomable() {
    return !this.props.definition.horizontal;
  }
}
