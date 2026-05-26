import { ChartDefinition } from "../../../../types/chart/chart";
import { Checkbox } from "../../components/checkbox/checkbox";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";
import { ChartSidePanelProps } from "../common";

type ZoomableChartDefinition = Extract<ChartDefinition<string>, { zoomable?: boolean }>;

export class GenericZoomableChartDesignPanel<
  P extends ChartSidePanelProps<ZoomableChartDefinition>
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
