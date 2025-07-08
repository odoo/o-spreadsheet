import {
  DispatchResult,
  GenericDefinition,
  UID,
  ZoomableChartDefinition,
} from "../../../../types/index";
import { Checkbox } from "../../components/checkbox/checkbox";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";

interface Props {
  figureId: UID;
  definition: ZoomableChartDefinition;
  canUpdateChart: (
    figureID: UID,
    definition: GenericDefinition<ZoomableChartDefinition>
  ) => DispatchResult;
  updateChart: (
    figureId: UID,
    definition: GenericDefinition<ZoomableChartDefinition>
  ) => DispatchResult;
}

export class GenericZoomableChartDesignPanel<
  P extends Props = Props
> extends ChartWithAxisDesignPanel<Props> {
  static template = "o-spreadsheet-GenericZoomableChartDesignPanel";
  static components = {
    ...ChartWithAxisDesignPanel.components,
    Checkbox,
  };

  onToggleZoom(zoomable: boolean) {
    this.props.updateChart(this.props.figureId, {
      zoomable,
    });
  }
}
