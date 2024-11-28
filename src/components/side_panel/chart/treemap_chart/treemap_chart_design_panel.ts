import { Component } from "@odoo/owl";
import { _t } from "../../../../translation";
import {
  TreeMapCategoryColorOptions,
  TreeMapChartDefaults,
  TreeMapChartDefinition,
  TreeMapColorScaleOptions,
} from "../../../../types/chart/tree_map_chart";
import { DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
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
  useValueBasedGradient: true,
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

  private savedColors = {
    categoryColors: DEFAULT_SOLID_COLOR,
    colorScale: DEFAULT_COLOR_SCALE,
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
    const coloringOptions =
      option === "categoryColor" ? this.savedColors.categoryColors : this.savedColors.colorScale;
    this.props.updateChart(this.props.figureId, { coloringOptions });
  }

  onCategoryColorChange(coloringOptions: TreeMapCategoryColorOptions) {
    this.savedColors.categoryColors = coloringOptions;
    this.props.updateChart(this.props.figureId, { coloringOptions });
  }

  onColorScaleChange(coloringOptions: TreeMapColorScaleOptions) {
    this.savedColors.colorScale = coloringOptions;
    this.props.updateChart(this.props.figureId, { coloringOptions });
  }

  get coloringOptionChoices() {
    return [
      { label: _t("Category color"), value: "categoryColor" },
      { label: _t("Color scale"), value: "colorScale" },
    ];
  }
}
