import { props } from "@odoo/owl";
import { ChartConfiguration } from "chart.js";
import { deepCopy } from "../../../../../helpers/misc";
import {
  TreeMapCategoryColorOptions,
  TreeMapChartDefaults,
  TreeMapChartRuntime,
  TreeMapGroupColor,
} from "../../../../../types/chart/tree_map_chart";
import { DispatchResult } from "../../../../../types/commands";
import { DeepPartial } from "../../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { types } from "../../../../props_validation";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";

import { Component } from "../../../../../owl3_compatibility_layer";

export class TreeMapCategoryColors extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TreeMapCategoryColors";
  static components = {
    Checkbox,
    RoundColorPicker,
  };

  protected props = props({
    chartId: types.UID(),
    definition: types.TreeMapChartDefinition(),
    onColorChanged: types.function<(colors: TreeMapCategoryColorOptions) => DispatchResult>(),
  });

  get coloringOptions() {
    const coloringOptions =
      this.props.definition.coloringOptions ?? TreeMapChartDefaults.coloringOptions;
    if (coloringOptions.type !== "categoryColor") {
      throw new Error("Coloring options is not solid color");
    }
    return coloringOptions;
  }

  getTreeGroupAndColors(): DeepPartial<TreeMapGroupColor[]> {
    const runtime = this.env.model.getters.getChartRuntime(
      this.props.chartId
    ) as TreeMapChartRuntime;
    const config = runtime.chartJsConfig as ChartConfiguration<"treemap">;
    return config.data.datasets[0]?.groupColors || [];
  }

  onGroupColorChanged(index: number, color: string) {
    const coloringOptions = deepCopy(this.coloringOptions);
    coloringOptions.colors[index] = color || undefined; // color picker returns empty string for no color
    this.props.onColorChanged(coloringOptions);
  }

  useValueBasedGradient(useValueBasedGradient: boolean) {
    if (this.coloringOptions.type !== "categoryColor") {
      throw new Error("Coloring options is not solid color");
    }
    this.props.onColorChanged({ ...this.coloringOptions, useValueBasedGradient });
  }
}
