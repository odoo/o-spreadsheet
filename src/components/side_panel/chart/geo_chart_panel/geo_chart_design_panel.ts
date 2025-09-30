import { Color, UID } from "@odoo/o-spreadsheet-engine";
import { LegendPosition } from "../../../../types/chart";
import {
  GeoChartColorScale,
  GeoChartCustomColorScale,
  GeoChartDefinition,
} from "../../../../types/chart/geo_chart";
import { DispatchResult } from "../../../../types/index";
import { ChartTerms } from "../../../translations_terms";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
interface Props {
  chartId: UID;
  definition: GeoChartDefinition;
  canUpdateChart: (chartId: UID, definition: Partial<GeoChartDefinition>) => DispatchResult;
  updateChart: (chartId: UID, definition: Partial<GeoChartDefinition>) => DispatchResult;
}

const DEFAULT_CUSTOM_COLOR_SCALE: GeoChartCustomColorScale = {
  minColor: "#FFF5EB",
  midColor: "#FD8D3C",
  maxColor: "#7F2704",
};

export class GeoChartDesignPanel extends ChartWithAxisDesignPanel<Props> {
  static template = "o-spreadsheet-GeoChartDesignPanel";
  static components = { ...ChartWithAxisDesignPanel.components, RoundColorPicker };

  colorScalesChoices = ChartTerms.GeoChart.ColorScales;

  updateColorScaleType(ev: Event) {
    const value = (ev.target as HTMLSelectElement).value;
    value === "custom"
      ? this.updateColorScale(DEFAULT_CUSTOM_COLOR_SCALE)
      : this.updateColorScale(value as GeoChartColorScale);
  }

  updateColorScale(colorScale: GeoChartColorScale) {
    this.props.updateChart(this.props.chartId, { colorScale });
  }

  updateMissingValueColor(color: Color) {
    this.props.updateChart(this.props.chartId, { missingValueColor: color });
  }

  updateLegendPosition(ev: Event) {
    const value = (ev.target as HTMLSelectElement).value as LegendPosition;
    this.props.updateChart(this.props.chartId, { legendPosition: value });
  }

  get selectedColorScale() {
    return typeof this.props.definition.colorScale === "object"
      ? "custom"
      : this.props.definition.colorScale || "oranges";
  }

  get selectedMissingValueColor() {
    return this.props.definition.missingValueColor || "#ffffff";
  }

  get customColorScale(): GeoChartCustomColorScale | undefined {
    if (typeof this.props.definition.colorScale === "object") {
      return this.props.definition.colorScale;
    }
    return undefined;
  }

  getCustomColorScaleColor(color: "minColor" | "midColor" | "maxColor") {
    return this.customColorScale?.[color] ?? "";
  }

  setCustomColorScaleColor(colorType: "minColor" | "midColor" | "maxColor", color: Color) {
    if (!color && colorType !== "midColor") {
      color = "#fff";
    }
    const customColorScale = this.customColorScale;
    if (!customColorScale) {
      return;
    }
    this.updateColorScale({ ...customColorScale, [colorType]: color });
  }
}
