import { _t, Color, ValueAndLabel } from "@odoo/o-spreadsheet-engine";
import { ChartColorScale, LegendPosition } from "@odoo/o-spreadsheet-engine/types/chart";
import { GeoChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/geo_chart";
import { Select } from "../../../select/select";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { ColorScalePicker } from "../building_blocks/color_scale/color_scale_picker";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";
import { ChartSidePanelProps } from "../common";

export class GeoChartDesignPanel extends ChartWithAxisDesignPanel<
  ChartSidePanelProps<GeoChartDefinition>
> {
  static template = "o-spreadsheet-GeoChartDesignPanel";
  static components = {
    ...ChartWithAxisDesignPanel.components,
    RoundColorPicker,
    ColorScalePicker,
    Select,
  };

  updateColorScale(colorScale: ChartColorScale | undefined) {
    this.props.updateChart(this.props.chartId, { colorScale });
  }

  updateMissingValueColor(color: Color) {
    this.props.updateChart(this.props.chartId, { missingValueColor: color });
  }

  updateLegendPosition(value: LegendPosition) {
    this.props.updateChart(this.props.chartId, { legendPosition: value });
  }

  get selectedMissingValueColor() {
    return this.props.definition.missingValueColor || "#ffffff";
  }

  get legendValues(): ValueAndLabel[] {
    return [
      { value: "none", label: _t("None") },
      { value: "top", label: _t("Top left") },
      { value: "right", label: _t("Top right") },
      { value: "bottom", label: _t("Bottom right") },
      { value: "left", label: _t("Bottom left") },
    ];
  }
}
