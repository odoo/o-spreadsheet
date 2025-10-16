import {
  DispatchResult,
  GenericDefinition,
  UID,
  ZoomableChartDefinition,
} from "../../../../types/index";
import { Checkbox } from "../../components/checkbox/checkbox";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";

interface Props {
  chartId: UID;
  definition: ZoomableChartDefinition;
  canUpdateChart: (
    chartId: UID,
    definition: GenericDefinition<ZoomableChartDefinition>
  ) => DispatchResult;
  updateChart: (
    chartId: UID,
    definition: GenericDefinition<ZoomableChartDefinition>
  ) => DispatchResult;
}

export class GenericZoomableChartDesignPanel<
  P extends Props = Props
> extends ChartWithAxisDesignPanel<P> {
  static template = "o-spreadsheet-GenericZoomableChartDesignPanel";
  static components = {
    ...ChartWithAxisDesignPanel.components,
    Checkbox,
  };

  onToggleZoom(zoomable: boolean) {
    this.props.updateChart(this.props.chartId, {
      zoomable,
    });
  }
}
