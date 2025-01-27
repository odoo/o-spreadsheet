import { Component } from "@odoo/owl";
import { ChartConfiguration } from "chart.js";
import { deepCopy, removeIndexesFromArray } from "../../../../helpers";
import { _t } from "../../../../translation";
import {
  TreeMapCategoryColorOptions,
  TreeMapChartDefaults,
  TreeMapChartDefinition,
  TreeMapChartRuntime,
  TreeMapColorScaleOptions,
  TreeMapTree,
} from "../../../../types/chart/tree_map_chart";
import { DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { getTreeMapGroupColors } from "../../../figures/chart/chartJs/tree_map_colors_plugin";
import { BadgeSelection } from "../../components/badge_selection/badge_selection";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { TextStyler } from "../building_blocks/text_styler/text_styler";
import { TreeMapCategoryColors } from "./treemap_category_color/treemap_category_color";
import { TreeMapColorScale } from "./treemap_color_scale/treemap_color_scale";

interface Props {
  figureId: UID;
  definition: TreeMapChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<TreeMapChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<TreeMapChartDefinition>) => DispatchResult;
}

const DEFAULT_COLOR_SCALE: TreeMapColorScaleOptions = {
  type: "colorScale",
  minColor: "#FFF5EB",
  midColor: "#FD8D3C",
  maxColor: "#7F2704",
};

const DEFAULT_SOLID_COLOR: TreeMapCategoryColorOptions = {
  type: "categoryColor",
  colors: [],
  highlightBigValues: true,
};

export class TreeMapChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TreeMapChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    Section,
    SidePanelCollapsible,
    Checkbox,
    TextStyler,
    RoundColorPicker,
    BadgeSelection,
    TreeMapCategoryColors,
    TreeMapColorScale,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };

  defaults = TreeMapChartDefaults;

  get showHeaders() {
    return this.props.definition.showHeaders ?? TreeMapChartDefaults.showHeaders;
  }

  get showValues() {
    return this.props.definition.showValues ?? TreeMapChartDefaults.showValues;
  }

  get showLabels() {
    return this.props.definition.showLabels ?? TreeMapChartDefaults.showLabels;
  }

  get coloringOptions() {
    return this.props.definition.coloringOptions ?? TreeMapChartDefaults.coloringOptions;
  }

  changeColoringOption(option: "categoryColor" | "colorScale") {
    const coloringOptions = option === "categoryColor" ? DEFAULT_SOLID_COLOR : DEFAULT_COLOR_SCALE;
    this.props.updateChart(this.props.figureId, { coloringOptions });
  }

  getColorScaleColor(point: "minColor" | "midColor" | "maxColor") {
    if (this.coloringOptions.type !== "colorScale") {
      throw new Error("Coloring options is not a color scale");
    }
    return this.coloringOptions[point];
  }

  setColorScaleColor(point: "minColor" | "midColor" | "maxColor", color: string) {
    if (this.coloringOptions.type !== "colorScale") {
      throw new Error("Coloring options is not a color scale");
    }
    this.props.updateChart(this.props.figureId, {
      coloringOptions: { ...this.coloringOptions, [point]: color },
    });
  }

  getTreeGroupAndColors() {
    if (this.coloringOptions.type !== "categoryColor") {
      throw new Error("Coloring options is not solid color");
    }
    const runtime = this.env.model.getters.getChartRuntime(
      this.props.figureId
    ) as TreeMapChartRuntime;
    const config = runtime.chartJsConfig as ChartConfiguration<"treemap">;
    const tree = config.data.datasets[0]?.tree as TreeMapTree;
    if (!tree) {
      return [];
    }
    return getTreeMapGroupColors(this.props.definition, tree);
  }

  setGroupColor(group: string, color: string) {
    if (this.coloringOptions.type !== "categoryColor") {
      throw new Error("Coloring options is not solid color");
    }
    const coloringOptions = deepCopy(this.coloringOptions);
    const index = coloringOptions.colors.findIndex((c) => c.group === group);
    if (color === "") {
      coloringOptions.colors = removeIndexesFromArray(coloringOptions.colors, [index]);
    } else if (index === -1) {
      coloringOptions.colors.push({ group, color });
    } else {
      coloringOptions.colors[index].color = color;
    }
    this.props.updateChart(this.props.figureId, { coloringOptions });
  }

  setHighlightForBigValues(highlightBigValues: boolean) {
    if (this.coloringOptions.type !== "categoryColor") {
      throw new Error("Coloring options is not solid color");
    }
    this.props.updateChart(this.props.figureId, {
      coloringOptions: { ...this.coloringOptions, highlightBigValues },
    });
  }

  get coloringOptionChoices() {
    return [
      { label: _t("Category color"), value: "categoryColor" },
      { label: _t("Color scale"), value: "colorScale" },
    ];
  }
}
