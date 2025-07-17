import { LegendPosition } from "../../../../types/chart";
import { GeoChartColorScale, GeoChartDefinition } from "../../../../types/chart/geo_chart";
import { Color, DispatchResult, UID } from "../../../../types/index";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { ColorScalePicker } from "../building_blocks/color_scale/color_scale_picker";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";

interface Props {
  figureId: UID;
  definition: GeoChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<GeoChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<GeoChartDefinition>) => DispatchResult;
}

export class GeoChartDesignPanel extends ChartWithAxisDesignPanel<Props> {
  static template = "o-spreadsheet-GeoChartDesignPanel";
  static components = {
    ...ChartWithAxisDesignPanel.components,
    RoundColorPicker,
    ColorScalePicker,
  };

  updateColorScale(colorScale: GeoChartColorScale) {
    this.props.updateChart(this.props.figureId, { colorScale });
  }

  updateMissingValueColor(color: Color) {
    this.props.updateChart(this.props.figureId, { missingValueColor: color });
  }

  updateLegendPosition(ev: Event) {
    const value = (ev.target as HTMLSelectElement).value as LegendPosition;
    this.props.updateChart(this.props.figureId, { legendPosition: value });
  }

  get selectedMissingValueColor() {
    return this.props.definition.missingValueColor || "#ffffff";
  }
}
