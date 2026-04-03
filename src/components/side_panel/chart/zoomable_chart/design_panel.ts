import { ChartDefinition } from "../../../../types/index";
import { Checkbox } from "../../components/checkbox/checkbox";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";
import { ChartSidePanelProps } from "../common";

type ZoomableChartDefinition = Extract<ChartDefinition<string>, { zoomable?: boolean }>;

interface Props extends ChartSidePanelProps<ZoomableChartDefinition> {}

export class GenericZoomableChartDesignPanel<P extends Props> extends ChartWithAxisDesignPanel<P> {
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
