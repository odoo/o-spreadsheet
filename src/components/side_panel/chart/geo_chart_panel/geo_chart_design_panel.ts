import { ChartColorScale, LegendPosition } from "../../../../types/chart";
import { GeoChartDefinition } from "../../../../types/chart/geo_chart";
import { Color, DispatchResult, UID } from "../../../../types/index";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { ColorScalePicker } from "../building_blocks/color_scale/color_scale_picker";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";

interface Props {
  chartId: UID;
  definition: GeoChartDefinition;
  canUpdateChart: (chartId: UID, definition: Partial<GeoChartDefinition>) => DispatchResult;
  updateChart: (chartId: UID, definition: Partial<GeoChartDefinition>) => DispatchResult;
}

export class GeoChartDesignPanel extends ChartWithAxisDesignPanel<Props> {
  static template = "o-spreadsheet-GeoChartDesignPanel";
  static components = {
    ...ChartWithAxisDesignPanel.components,
    RoundColorPicker,
    ColorScalePicker,
  };

  updateColorScale(colorScale: ChartColorScale | undefined) {
    this.props.updateChart(this.props.chartId, { colorScale });
  }

  updateMissingValueColor(color: Color) {
    this.props.updateChart(this.props.chartId, { missingValueColor: color });
  }

  updateLegendPosition(ev: Event) {
    const value = (ev.target as HTMLSelectElement).value as LegendPosition;
    this.props.updateChart(this.props.chartId, { legendPosition: value });
  }

  get selectedMissingValueColor() {
    return this.props.definition.missingValueColor || "#ffffff";
  }
}
