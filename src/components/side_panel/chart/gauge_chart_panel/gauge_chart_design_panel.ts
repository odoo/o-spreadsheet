import { Component, useState } from "@odoo/owl";
import { tryToNumber } from "../../../../functions/helpers";
import { deepCopy } from "../../../../helpers/index";
import { GaugeChartDefinition, SectionRule } from "../../../../types/chart/gauge_chart";
import {
  Color,
  CommandResult,
  DispatchResult,
  SpreadsheetChildEnv,
  UID,
  isMatrix,
} from "../../../../types/index";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { css } from "../../../helpers/css";
import { ChartTerms } from "../../../translations_terms";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";

css/* scss */ `
  .o-gauge-color-set {
    table {
      table-layout: fixed;
      margin-top: 2%;
      display: table;
      text-align: left;
      font-size: 12px;
      line-height: 18px;
      width: 100%;
      font-size: 12px;
    }

    td {
      box-sizing: border-box;
      height: 30px;
      padding: 6px 0;
    }
    th.o-gauge-color-set-colorPicker {
      width: 8%;
    }
    th.o-gauge-color-set-text {
      width: 25%;
    }
    th.o-gauge-color-set-operator {
      width: 10%;
    }
    th.o-gauge-color-set-value {
      width: 22%;
    }
    th.o-gauge-color-set-type {
      width: 30%;
    }
    input,
    select {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }
  }
`;

interface PanelState {
  sectionRuleDispatchResult?: DispatchResult;
  sectionRule: SectionRule;
}

interface Props {
  figureId: UID;
  definition: GaugeChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<GaugeChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<GaugeChartDefinition>) => DispatchResult;
}

export class GaugeChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GaugeChartDesignPanel";
  static components = {
    SidePanelCollapsible,
    Section,
    RoundColorPicker,
    GeneralDesignEditor,
    ChartErrorSection,
    StandaloneComposer,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };

  protected state!: PanelState;

  setup() {
    this.state = useState<PanelState>({
      sectionRuleDispatchResult: new DispatchResult(
        this.checkSectionRuleFormulasAreValid(this.props.definition.sectionRule)
      ),
      sectionRule: deepCopy(this.props.definition.sectionRule),
    });
  }

  get designErrorMessages(): string[] {
    const cancelledReasons = [...(this.state.sectionRuleDispatchResult?.reasons || [])];
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  get isRangeMinInvalid() {
    return !!(
      this.state.sectionRuleDispatchResult?.isCancelledBecause(CommandResult.EmptyGaugeRangeMin) ||
      this.state.sectionRuleDispatchResult?.isCancelledBecause(CommandResult.GaugeRangeMinNaN)
    );
  }

  get isRangeMaxInvalid() {
    return !!(
      this.state.sectionRuleDispatchResult?.isCancelledBecause(CommandResult.EmptyGaugeRangeMax) ||
      this.state.sectionRuleDispatchResult?.isCancelledBecause(CommandResult.GaugeRangeMaxNaN)
    );
  }

  // ---------------------------------------------------------------------------
  // COLOR_SECTION_TEMPLATE
  // ---------------------------------------------------------------------------

  get isLowerInflectionPointInvalid() {
    return !!this.state.sectionRuleDispatchResult?.isCancelledBecause(
      CommandResult.GaugeLowerInflectionPointNaN
    );
  }

  get isUpperInflectionPointInvalid() {
    return !!this.state.sectionRuleDispatchResult?.isCancelledBecause(
      CommandResult.GaugeUpperInflectionPointNaN
    );
  }

  updateSectionColor(target: string, color: Color) {
    const sectionRule = deepCopy(this.state.sectionRule);
    sectionRule.colors[target] = color;
    this.updateSectionRule(sectionRule);
  }

  updateSectionRule(sectionRule: SectionRule) {
    const invalidValueReasons = this.checkSectionRuleFormulasAreValid(this.state.sectionRule);
    if (invalidValueReasons.length > 0) {
      this.state.sectionRuleDispatchResult = new DispatchResult(invalidValueReasons);
      return;
    }

    this.state.sectionRuleDispatchResult = this.props.updateChart(this.props.figureId, {
      sectionRule,
    });
    if (this.state.sectionRuleDispatchResult.isSuccessful) {
      this.state.sectionRule = deepCopy(sectionRule);
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
    if (isMatrix(evaluatedValue)) {
      return false;
    }
    return tryToNumber(evaluatedValue, locale) !== undefined;
  }

  get sheetId() {
    const chart = this.env.model.getters.getChart(this.props.figureId);
    if (!chart) {
      throw new Error("Chart not found with id " + this.props.figureId);
    }
    return chart.sheetId;
  }
}
