import { ComboChartDefinition } from "../../../../types/chart/combo_chart";
import { DispatchResult, GenericDefinition, UID } from "../../../../types/index";
import { ChartShowDataMarkers } from "../building_blocks/show_data_markers/show_data_markers";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";

interface Props {
  chartId: UID;
  definition: ComboChartDefinition;
  canUpdateChart: (
    chartId: UID,
    definition: GenericDefinition<ComboChartDefinition>
  ) => DispatchResult;
  updateChart: (
    chartId: UID,
    definition: GenericDefinition<ComboChartDefinition>
  ) => DispatchResult;
}

export class LineChartDesignPanel extends ChartWithAxisDesignPanel<Props> {
  static template = "o-spreadsheet-LineChartDesignPanel";
  static components = {
    ...ChartWithAxisDesignPanel.components,
    ChartShowDataMarkers,
  };
}
