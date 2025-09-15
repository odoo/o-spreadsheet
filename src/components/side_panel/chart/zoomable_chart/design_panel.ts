import { ZoomableChartDefinition } from "../../../../types/index";
import { Checkbox } from "../../components/checkbox/checkbox";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";
import { ChartSidePanelProps } from "../common";

interface Props extends ChartSidePanelProps<ZoomableChartDefinition> {}
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
