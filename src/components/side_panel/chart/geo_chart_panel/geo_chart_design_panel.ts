import {
  GeoChartColorScale,
  GeoChartCustomColorScale,
  GeoChartDefinition,
  GeoChartProjection,
} from "../../../../types/chart/geo_chart";
import { Color, DispatchResult, UID } from "../../../../types/index";
import { ChartTerms } from "../../../translations_terms";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";

interface Props {
  figureId: UID;
  definition: GeoChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<GeoChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<GeoChartDefinition>) => DispatchResult;
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
  projectionChoices = ChartTerms.GeoChart.Projections;

  updateColorScaleType(ev: Event) {
    const value = (ev.target as HTMLSelectElement).value;
    value === "custom"
      ? this.updateColorScale(DEFAULT_CUSTOM_COLOR_SCALE)
      : this.updateColorScale(value as GeoChartColorScale);
  }

  updateColorScale(colorScale: GeoChartColorScale) {
    this.props.updateChart(this.props.figureId, { colorScale });
  }

  updateProjection(ev: Event) {
    const value = (ev.target as HTMLSelectElement).value;
    this.props.updateChart(this.props.figureId, {
      projection: value as GeoChartProjection,
    });
  }

  updateMissingValueColor(color: Color) {
    this.props.updateChart(this.props.figureId, { missingValueColor: color });
  }

  updateSelectedRegion(ev: Event) {
    const value = (ev.target as HTMLSelectElement).value;
    this.props.updateChart(this.props.figureId, { displayedRegion: value });
  }

  get selectedColorScale() {
    return typeof this.props.definition.colorScale === "object"
      ? "custom"
      : this.props.definition.colorScale || "oranges";
  }

  get selectedProjection() {
    return this.props.definition.projection || "mercator";
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
      color = "#fff"; // TODO FIXME: improve this once task 4102704 is done. we do not want undefined color for min/max values
    }
    const customColorScale = this.customColorScale;
    if (!customColorScale) {
      return;
    }
    this.updateColorScale({ ...customColorScale, [colorType]: color });
  }

  get availableRegions() {
    return this.env.model.getters.getGeoChartAvailableRegions();
  }

  get selectedRegion() {
    return this.props.definition.displayedRegion || this.availableRegions[0]?.id;
  }
}
