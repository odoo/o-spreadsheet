import { Action, ActionSpec, createActions } from "../../../../actions/action";
import { _t } from "../../../../translation";
import {
  GeoChartColorScale,
  GeoChartCustomColorScale,
  GeoChartDefinition,
} from "../../../../types/chart/geo_chart";
import { Color, DispatchResult, UID } from "../../../../types/index";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { SelectMenu } from "../../select_menu/select_menu";
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
  static components = { ...ChartWithAxisDesignPanel.components, SelectMenu, RoundColorPicker };

  colorScalesChoices: Record<Extract<GeoChartColorScale, string>, string> = {
    blues: _t("Blues"),
    brBG: _t("Brown-Blue-Green"),
    buGn: _t("Blue-Green"),
    buPu: _t("Blue-Purple"),
    cividis: _t("Cividis"),
    cool: _t("Cool"),
    cubehelixDefault: _t("Cubehelix Default"),
    gnBu: _t("Green-Blue"),
    greens: _t("Greens"),
    greys: _t("Greys"),
    inferno: _t("Inferno"),
    magma: _t("Magma"),
    orRd: _t("Orange-Red"),
    oranges: _t("Oranges"),
    pRGn: _t("Purple-Green"),
    piYG: _t("Pink-Yellow-Green"),
    plasma: _t("Plasma"),
    puBu: _t("Purple-Blue"),
    puBuGn: _t("Purple-Blue-Green"),
    puOr: _t("Purple-Orange"),
    puRd: _t("Purple-Red"),
    purples: _t("Purples"),
    rainbow: _t("Rainbow"),
    rdBu: _t("Red-Blue"),
    rdGy: _t("Red-Grey"),
    rdPu: _t("Red-Purple"),
    rdYlBu: _t("Red-Yellow-Blue"),
    rdYlGn: _t("Red-Yellow-Green"),
    reds: _t("Reds"),
    sinebow: _t("Sinebow"),
    spectral: _t("Spectral"),
    turbo: _t("Turbo"),
    viridis: _t("Viridis"),
    warm: _t("Warm"),
    ylGn: _t("Yellow-Green"),
    ylGnBu: _t("Yellow-Green-Blue"),
    ylOrBr: _t("Yellow-Orange-Brown"),
    ylOrRd: _t("Yellow-Orange-Red"),
  };

  updateColorScale(colorScale: GeoChartColorScale) {
    this.props.updateChart(this.props.figureId, {
      colorScale: colorScale,
    });
  }

  get selectedColorScale() {
    if (typeof this.props.definition.colorScale === "object") {
      return _t("Custom");
    }
    return this.colorScalesChoices[this.props.definition.colorScale ?? "blues"];
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
      color = "#fff"; // TODO: improve this once task 4102704 is done
    }
    const customColorScale = this.customColorScale;
    if (!customColorScale) {
      return;
    }
    this.updateColorScale({ ...customColorScale, [colorType]: color });
  }

  getSelectMenuItems(): Action[] {
    const actionSpecs: ActionSpec[] = [
      {
        name: _t("Custom"),
        id: "custom",
        execute: () => this.updateColorScale(DEFAULT_CUSTOM_COLOR_SCALE),
        separator: true,
      },
    ];

    for (const colorScale in this.colorScalesChoices) {
      actionSpecs.push({
        name: this.colorScalesChoices[colorScale],
        id: colorScale,
        execute: () => this.updateColorScale(colorScale as GeoChartColorScale),
      });
    }
    return createActions(actionSpecs);
  }
}
