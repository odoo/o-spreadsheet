import { Component } from "@odoo/owl";
import {
  DEFAULT_SCORECARD_BASELINE_FONT_SIZE,
  DEFAULT_SCORECARD_KEY_VALUE_FONT_SIZE,
  SCORECARD_CHART_TITLE_FONT_SIZE,
} from "../../../../constants";
import { _t } from "../../../../translation";
import { ScorecardChartDefinition } from "../../../../types/chart/scorecard_chart";
import {
  Align,
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
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartTitle } from "../building_blocks/title/title";

type ColorPickerId = undefined | "backgroundColor" | "baselineColorUp" | "baselineColorDown";

interface Props {
  figureId: UID;
  definition: ScorecardChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<ScorecardChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ScorecardChartDefinition>) => DispatchResult;
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
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };

  get colorsSectionTitle(): string {
    return this.props.definition.baselineMode === "progress"
      ? _t("Progress bar colors")
      : _t("Baseline colors");
  }

  get humanizeNumbersLabel(): string {
    return _t("Humanize numbers");
  }

  get defaultScorecardTitleFontSize(): number {
    return SCORECARD_CHART_TITLE_FONT_SIZE;
  }

  updateHumanizeNumbers(humanize: boolean) {
    this.props.updateChart(this.props.figureId, { humanize });
  }

  translate(term) {
    return _t(term);
  }

  setColor(color: Color, colorPickerId: ColorPickerId) {
    switch (colorPickerId) {
      case "backgroundColor":
        this.props.updateChart(this.props.figureId, { background: color });
        break;
      case "baselineColorDown":
        this.props.updateChart(this.props.figureId, { baselineColorDown: color });
        break;
      case "baselineColorUp":
        this.props.updateChart(this.props.figureId, { baselineColorUp: color });
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

  setKeyAlign(align: Align) {
    this.props.updateChart(this.props.figureId, {
      keyDescr: { ...this.props.definition.keyDescr, align },
    });
  }

  setKeyText(text: string) {
    this.props.updateChart(this.props.figureId, {
      keyDescr: { ...this.props.definition.keyDescr, text },
    });
  }

  setKeyFontSize(fontSize: number) {
    this.props.updateChart(this.props.figureId, {
      keyDescr: { ...this.props.definition.keyDescr, fontSize },
    });
  }

  setKeyColor(color: Color) {
    this.props.updateChart(this.props.figureId, {
      keyDescr: { ...this.props.definition.keyDescr, color },
    });
  }

  toggleKeyItalic() {
    const descr = this.props.definition.keyDescr;
    this.props.updateChart(this.props.figureId, {
      keyDescr: { ...descr, italic: descr ? !descr.italic : false },
    });
  }

  toggleKeyBold() {
    const descr = this.props.definition.keyDescr;
    this.props.updateChart(this.props.figureId, {
      keyDescr: { ...descr, bold: descr ? !descr.bold : false },
    });
  }

  setBaselineAlign(align: Align) {
    this.props.updateChart(this.props.figureId, {
      baselineDescr: { ...this.props.definition.baselineDescr, align },
    });
  }

  setBaselineText(text: string) {
    this.props.updateChart(this.props.figureId, {
      baselineDescr: { ...this.props.definition.baselineDescr, text },
    });
  }

  setBaselineFontSize(fontSize: number) {
    this.props.updateChart(this.props.figureId, {
      baselineDescr: { ...this.props.definition.baselineDescr, fontSize },
    });
  }

  setBaselineColor(color: Color) {
    this.props.updateChart(this.props.figureId, {
      baselineDescr: { ...this.props.definition.baselineDescr, color },
    });
  }

  toggleBaselineItalic() {
    const descr = this.props.definition.baselineDescr;
    this.props.updateChart(this.props.figureId, {
      baselineDescr: { ...descr, italic: descr ? !descr.italic : false },
    });
  }

  toggleBaselineBold() {
    const descr = this.props.definition.baselineDescr;
    this.props.updateChart(this.props.figureId, {
      baselineDescr: { ...descr, bold: descr ? !descr.bold : false },
    });
  }
}
