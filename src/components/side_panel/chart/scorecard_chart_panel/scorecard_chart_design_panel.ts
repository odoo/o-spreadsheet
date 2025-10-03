import {
  DEFAULT_SCORECARD_BASELINE_FONT_SIZE,
  DEFAULT_SCORECARD_KEY_VALUE_FONT_SIZE,
  SCORECARD_CHART_TITLE_FONT_SIZE,
} from "@odoo/o-spreadsheet-engine/constants";
import { ScorecardChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/scorecard_chart";
import { Component } from "@odoo/owl";
import { _t } from "../../../../translation";
import {
  Color,
  DispatchResult,
  SpreadsheetChildEnv,
  TitleDesign,
  UID,
} from "../../../../types/index";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ChartTitle } from "../building_blocks/chart_title/chart_title";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";

type ColorPickerId = undefined | "backgroundColor" | "baselineColorUp" | "baselineColorDown";

interface Props {
  chartId: UID;
  definition: ScorecardChartDefinition;
  canUpdateChart: (chartId: UID, definition: Partial<ScorecardChartDefinition>) => DispatchResult;
  updateChart: (chartId: UID, definition: Partial<ScorecardChartDefinition>) => DispatchResult;
}

export class ScorecardChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    RoundColorPicker,
    SidePanelCollapsible,
    Section,
    Checkbox,
    ChartTitle,
    ChartHumanizeNumbers,
  };
  static props = {
    chartId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };

  get colorsSectionTitle(): string {
    return this.props.definition.baselineMode === "progress"
      ? _t("Progress bar colors")
      : _t("Baseline colors");
  }

  get defaultScorecardTitleFontSize(): number {
    return SCORECARD_CHART_TITLE_FONT_SIZE;
  }

  translate(term: string): string {
    return this.env.model.getters.dynamicTranslate(term);
  }

  setColor(color: Color, colorPickerId: ColorPickerId) {
    switch (colorPickerId) {
      case "backgroundColor":
        this.props.updateChart(this.props.chartId, { background: color });
        break;
      case "baselineColorDown":
        this.props.updateChart(this.props.chartId, { baselineColorDown: color });
        break;
      case "baselineColorUp":
        this.props.updateChart(this.props.chartId, { baselineColorUp: color });
        break;
    }
  }

  get keyStyle(): TitleDesign {
    return {
      align: "center",
      fontSize: DEFAULT_SCORECARD_KEY_VALUE_FONT_SIZE,
      ...this.props.definition.keyDescr,
    };
  }

  get baselineStyle(): TitleDesign {
    return {
      align: "center",
      fontSize: DEFAULT_SCORECARD_BASELINE_FONT_SIZE,
      ...this.props.definition.baselineDescr,
    };
  }

  setKeyText(text: string) {
    this.props.updateChart(this.props.chartId, {
      keyDescr: { ...this.props.definition.keyDescr, text },
    });
  }

  updateKeyStyle(style: TitleDesign) {
    const keyDescr = { ...this.keyStyle, ...style };
    this.props.updateChart(this.props.chartId, { keyDescr });
  }

  setBaselineText(text: string) {
    this.props.updateChart(this.props.chartId, {
      baselineDescr: { ...this.props.definition.baselineDescr, text },
    });
  }

  updateBaselineStyle(style: TitleDesign) {
    const baselineDescr = { ...this.baselineStyle, ...style };
    this.props.updateChart(this.props.chartId, { baselineDescr });
  }
}
