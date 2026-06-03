import { props, proxy } from "@odoo/owl";
import { isMultipleElementMatrix, toScalar } from "../../../../functions/helper_matrices";
import { tryToNumber } from "../../../../functions/helpers";
import { deepCopy } from "../../../../helpers/misc";
import { Component } from "../../../../owl3_compatibility_layer";
import { _t } from "../../../../translation";
import { GaugeChartDefinition, SectionRule } from "../../../../types/chart/gauge_chart";
import { CommandResult } from "../../../../types/commands";
import { Color, ValueAndLabel } from "../../../../types/misc";
import { PropsOf } from "../../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { Select } from "../../../select/select";
import { ChartTerms } from "../../../translations_terms";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ChartAnnotation } from "../building_blocks/annotation/annotation";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../common";

interface PanelState {
  sectionRuleCancelledReasons?: Set<CommandResult>;
  sectionRule: SectionRule;
}

export class GaugeChartDesignPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GaugeChartDesignPanel";
  static components = {
    SidePanelCollapsible,
    Section,
    RoundColorPicker,
    GeneralDesignEditor,
    ChartAnnotation,
    ChartErrorSection,
    StandaloneComposer,
    ChartHumanizeNumbers,
    Select,
  };
  protected props = props(
    chartSidePanelPropsDefinition
  ) as unknown as ChartSidePanelProps<GaugeChartDefinition>;

  protected state!: PanelState;

  setup() {
    this.state = proxy<PanelState>({
      sectionRuleCancelledReasons: new Set(
        this.checkSectionRuleFormulasAreValid(this.props.definition.sectionRule)
      ),
      sectionRule: deepCopy(this.props.definition.sectionRule),
    });
  }

  get designErrorMessages(): string[] {
    const cancelledReasons = [...(this.state.sectionRuleCancelledReasons || [])].filter(
      (reason) => reason !== CommandResult.NoChanges
    );
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  get isRangeMinInvalid() {
    return !!(
      this.state.sectionRuleCancelledReasons?.has(CommandResult.EmptyGaugeRangeMin) ||
      this.state.sectionRuleCancelledReasons?.has(CommandResult.GaugeRangeMinNaN)
    );
  }

  get isRangeMaxInvalid() {
    return !!(
      this.state.sectionRuleCancelledReasons?.has(CommandResult.EmptyGaugeRangeMax) ||
      this.state.sectionRuleCancelledReasons?.has(CommandResult.GaugeRangeMaxNaN)
    );
  }

  // ---------------------------------------------------------------------------
  // COLOR_SECTION_TEMPLATE
  // ---------------------------------------------------------------------------

  get isLowerInflectionPointInvalid() {
    return !!this.state.sectionRuleCancelledReasons?.has(
      CommandResult.GaugeLowerInflectionPointNaN
    );
  }

  get isUpperInflectionPointInvalid() {
    return !!this.state.sectionRuleCancelledReasons?.has(
      CommandResult.GaugeUpperInflectionPointNaN
    );
  }

  updateSectionColor(target: string, color: Color) {
    const sectionRule = deepCopy(this.state.sectionRule);
    sectionRule.colors[target] = color;
    this.updateSectionRule(sectionRule);
  }

  updateSectionRuleOperator(
    inflectionPoint: "lowerInflectionPoint" | "upperInflectionPoint",
    operator: "<" | "<="
  ) {
    this.state.sectionRule = {
      ...this.state.sectionRule,
      [inflectionPoint]: { ...this.state.sectionRule[inflectionPoint], operator },
    };
    this.updateSectionRule(this.state.sectionRule);
  }

  updateSectionRulePointType(
    inflectionPoint: "lowerInflectionPoint" | "upperInflectionPoint",
    type: "number" | "percentage"
  ) {
    this.state.sectionRule = {
      ...this.state.sectionRule,
      [inflectionPoint]: { ...this.state.sectionRule[inflectionPoint], type },
    };
    this.updateSectionRule(this.state.sectionRule);
  }

  updateSectionRule(sectionRule: SectionRule) {
    this.state.sectionRuleCancelledReasons = new Set(
      this.checkSectionRuleFormulasAreValid(this.state.sectionRule)
    );

    const dispatchResult = this.props.updateChart(this.props.chartId, {
      sectionRule,
    });
    if (dispatchResult.isSuccessful) {
      this.state.sectionRule = deepCopy(sectionRule);
    } else {
      for (const reason of dispatchResult.reasons) {
        this.state.sectionRuleCancelledReasons.add(reason);
      }
    }
  }

  onConfirmGaugeRange(editedRange: "rangeMin" | "rangeMax", content: string) {
    this.state.sectionRule = { ...this.state.sectionRule, [editedRange]: content };
    this.updateSectionRule(this.state.sectionRule);
  }

  getGaugeInflectionComposerProps(
    sectionType: "lowerColor" | "middleColor"
  ): PropsOf<StandaloneComposer> {
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

  private checkSectionRuleFormulasAreValid(sectionRule: SectionRule): Set<CommandResult> {
    const reasons = new Set<CommandResult>();
    if (!this.valueIsValidNumber(sectionRule.rangeMin)) {
      reasons.add(CommandResult.GaugeRangeMinNaN);
    }
    if (!this.valueIsValidNumber(sectionRule.rangeMax)) {
      reasons.add(CommandResult.GaugeRangeMaxNaN);
    }
    if (!this.valueIsValidNumber(sectionRule.lowerInflectionPoint.value)) {
      reasons.add(CommandResult.GaugeLowerInflectionPointNaN);
    }
    if (!this.valueIsValidNumber(sectionRule.upperInflectionPoint.value)) {
      reasons.add(CommandResult.GaugeUpperInflectionPointNaN);
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

  get inflectionPointOperators(): ValueAndLabel[] {
    return [
      { value: "<", label: "<" },
      { value: "<=", label: "<=" },
    ];
  }

  get inflectionPointTypes(): ValueAndLabel[] {
    return [
      { value: "number", label: _t("Number") },
      { value: "percentage", label: _t("Percentage") },
    ];
  }
}
