import { ZoomableChartDefinition } from "../../../../types/index";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";
import { ChartSidePanelProps } from "../common";

interface Props extends ChartSidePanelProps<ZoomableChartDefinition> {}
export class GenericZoomableChartDesignPanel<
  P extends Props = Props
> extends ChartWithAxisDesignPanel<P> {
  static template = "o-spreadsheet-GenericZoomableChartDesignPanel";

  onToggleZoom(zoomable: boolean) {
    this.props.updateChart(this.props.chartId, {
      zoomable,
    });
  }
}
