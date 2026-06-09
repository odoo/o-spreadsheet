import { props } from "@odoo/owl";
import {
  TreeMapChartDefaults,
  TreeMapColorScaleOptions,
} from "../../../../../types/chart/tree_map_chart";
import { DispatchResult } from "../../../../../types/commands";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";

import { Component } from "../../../../../owl3_compatibility_layer";
import { types } from "../../../../props_validation";
export class TreeMapColorScale extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TreeMapColorScale";
  static components = { RoundColorPicker };

  protected props = props({
    chartId: types.UID(),
    definition: types.TreeMapChartDefinition(),
    onColorChanged: types.function<(colors: TreeMapColorScaleOptions) => DispatchResult>(),
  });

  get coloringOptions() {
    const coloringOptions =
      this.props.definition.coloringOptions ?? TreeMapChartDefaults.coloringOptions;
    if (coloringOptions.type !== "colorScale") {
      throw new Error("Coloring options is not a color scale");
    }
    return coloringOptions;
  }

  setColorScaleColor(point: "minColor" | "midColor" | "maxColor", color: string) {
    this.props.onColorChanged({ ...this.coloringOptions, [point]: color });
  }
}
