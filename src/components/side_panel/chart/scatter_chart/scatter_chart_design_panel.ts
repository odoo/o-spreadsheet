import { DispatchResult, UID } from "../../../../types";
import {
  ScatterChartDefinition,
  ScatterShowValuesMode,
} from "../../../../types/chart/scatter_chart";
import { ChartTerms } from "../../../translations_terms";
import { GenericZoomableChartDesignPanel } from "../zoomable_chart/design_panel";

interface Props {
  chartId: UID;
  definition: ScatterChartDefinition;
  canUpdateChart: (chartId: UID, definition: Partial<ScatterChartDefinition>) => DispatchResult;
  updateChart: (chartId: UID, definition: Partial<ScatterChartDefinition>) => DispatchResult;
}

export class ScatterChartDesignPanel extends GenericZoomableChartDesignPanel<Props> {
  static template = "o-spreadsheet-ScatterChartDesignPanel";

  showValuesModes = [
    { value: "value", label: ChartTerms.ShowValuesModes.Value },
    { value: "label", label: ChartTerms.ShowValuesModes.Label },
  ];

  get showValuesMode(): ScatterShowValuesMode {
    return this.props.definition.showValuesMode ?? "value";
  }

  onShowValuesModeChanged(mode: string) {
    const showValuesMode: ScatterShowValuesMode = mode === "label" ? "label" : "value";
    this.props.updateChart(this.props.chartId, {
      showValuesMode,
    });
  }
}
