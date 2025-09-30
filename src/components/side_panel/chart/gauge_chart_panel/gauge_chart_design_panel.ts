import { Component, useState } from "@odoo/owl";
import { isMultipleElementMatrix, toScalar } from "../../../../functions/helper_matrices";
import { tryToNumber } from "../../../../functions/helpers";
import { deepCopy } from "../../../../helpers/index";
import { _t } from "../../../../translation";
import { GaugeChartDefinition, SectionRule } from "../../../../types/chart/gauge_chart";
import { Color, CommandResult, SpreadsheetChildEnv } from "../../../../types/index";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { ChartTerms } from "../../../translations_terms";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

interface PanelState {
  sectionRuleCancelledReasons?: CommandResult[];
  sectionRule: SectionRule;
}

export class GaugeChartDesignPanel extends Component<
  ChartSidePanelProps<GaugeChartDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-GaugeChartDesignPanel";
  static components = {
    SidePanelCollapsible,
    Section,
    RoundColorPicker,
    GeneralDesignEditor,
    ChartErrorSection,
    StandaloneComposer,
    ChartHumanizeNumbers,
  };
  static props = ChartSidePanelPropsObject;

  protected state!: PanelState;

  setup() {
    this.state = useState<PanelState>({
      sectionRuleCancelledReasons: this.checkSectionRuleFormulasAreValid(
        this.props.definition.sectionRule
      ),
      sectionRule: deepCopy(this.props.definition.sectionRule),
    });
  }

  get designErrorMessages(): string[] {
    const cancelledReasons = [...(this.state.sectionRuleCancelledReasons || [])];
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  get isRangeMinInvalid() {
    return !!(
      this.state.sectionRuleCancelledReasons?.includes(CommandResult.EmptyGaugeRangeMin) ||
      this.state.sectionRuleCancelledReasons?.includes(CommandResult.GaugeRangeMinNaN)
    );
  }

  get isRangeMaxInvalid() {
    return !!(
      this.state.sectionRuleCancelledReasons?.includes(CommandResult.EmptyGaugeRangeMax) ||
      this.state.sectionRuleCancelledReasons?.includes(CommandResult.GaugeRangeMaxNaN)
    );
  }

  // ---------------------------------------------------------------------------
  // COLOR_SECTION_TEMPLATE
  // ---------------------------------------------------------------------------

  get isLowerInflectionPointInvalid() {
    return !!this.state.sectionRuleCancelledReasons?.includes(
      CommandResult.GaugeLowerInflectionPointNaN
    );
  }

  get isUpperInflectionPointInvalid() {
    return !!this.state.sectionRuleCancelledReasons?.includes(
      CommandResult.GaugeUpperInflectionPointNaN
    );
  }

  updateSectionColor(target: string, color: Color) {
    const sectionRule = deepCopy(this.state.sectionRule);
    sectionRule.colors[target] = color;
    this.updateSectionRule(sectionRule);
  }

  updateSectionRule(sectionRule: SectionRule) {
    this.state.sectionRuleCancelledReasons = [];
    this.state.sectionRuleCancelledReasons.push(
      ...this.checkSectionRuleFormulasAreValid(this.state.sectionRule)
    );

    const dispatchResult = this.props.updateChart(this.props.chartId, {
      sectionRule,
    });
    if (dispatchResult.isSuccessful) {
      this.state.sectionRule = deepCopy(sectionRule);
    } else {
      this.state.sectionRuleCancelledReasons.push(...dispatchResult.reasons);
    }
  }

  onConfirmGaugeRange(editedRange: "rangeMin" | "rangeMax", content: string) {
    this.state.sectionRule = { ...this.state.sectionRule, [editedRange]: content };
    this.updateSectionRule(this.state.sectionRule);
  }

  getGaugeInflectionComposerProps(
    sectionType: "lowerColor" | "middleColor"
  ): StandaloneComposer["props"] {
    const inflectionPointName =
      sectionType === "lowerColor" ? "lowerInflectionPoint" : "upperInflectionPoint";
    const inflectionPoint = this.state.sectionRule[inflectionPointName];
    return {
      onConfirm: (str: string) => {
        this.state.sectionRule = {
          ...this.state.sectionRule,
          [inflectionPointName]: { ...inflectionPoint, value: str },
        };
        this.updateSectionRule(this.state.sectionRule);
      },
      composerContent: inflectionPoint.value,
      invalid:
        sectionType === "lowerColor"
          ? this.isLowerInflectionPointInvalid
          : this.isUpperInflectionPointInvalid,
      defaultRangeSheetId: this.sheetId,
      class: inflectionPointName,
      placeholder: _t("Value"),
      title: _t("Value or formula"),
    };
  }

  private checkSectionRuleFormulasAreValid(sectionRule: SectionRule): CommandResult[] {
    const reasons: CommandResult[] = [];
    if (!this.valueIsValidNumber(sectionRule.rangeMin)) {
      reasons.push(CommandResult.GaugeRangeMinNaN);
    }
    if (!this.valueIsValidNumber(sectionRule.rangeMax)) {
      reasons.push(CommandResult.GaugeRangeMaxNaN);
    }
    if (!this.valueIsValidNumber(sectionRule.lowerInflectionPoint.value)) {
      reasons.push(CommandResult.GaugeLowerInflectionPointNaN);
    }
    if (!this.valueIsValidNumber(sectionRule.upperInflectionPoint.value)) {
      reasons.push(CommandResult.GaugeUpperInflectionPointNaN);
    }
    return reasons;
  }

  private valueIsValidNumber(value: string): boolean {
    const locale = this.env.model.getters.getLocale();
    if (!value.startsWith("=")) {
      return tryToNumber(value, locale) !== undefined;
    }
    const evaluatedValue = this.env.model.getters.evaluateFormula(this.sheetId, value);
    if (isMultipleElementMatrix(evaluatedValue)) {
      return false;
    }
    return tryToNumber(toScalar(evaluatedValue), locale) !== undefined;
  }

  get sheetId() {
    const chart = this.env.model.getters.getChart(this.props.chartId);
    if (!chart) {
      throw new Error("Chart not found with id " + this.props.chartId);
    }
    return chart.sheetId;
  }
}
