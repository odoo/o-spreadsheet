import { Component, ComponentConstructor, useState } from "@odoo/owl";
import { canonicalizeContent, localizeDataValidationRule } from "../../../../helpers/locale";
import { getFullReference } from "../../../../helpers/references";
import { zoneToXc } from "../../../../helpers/zones";
import {
  criterionComponentRegistry,
  getCriterionValueAndLabels,
} from "../../../../registries/criterion_component_registry";
import { criterionEvaluatorRegistry } from "../../../../registries/criterion_registry";
import { _t } from "../../../../translation";
import { AddDataValidationCommand, CancelledReason } from "../../../../types/commands";
import {
  availableDataValidationOperators,
  DataValidationCriterion,
  DataValidationCriterionType,
} from "../../../../types/data_validation";
import { UID, ValueAndLabel } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { DataValidationRuleData } from "../../../../types/workbook_data";
import { Select } from "../../../select/select";
import { SelectionInput } from "../../../selection_input/selection_input";
import { DVTerms } from "../../../translations_terms";
import { ValidationMessages } from "../../../validation_messages/validation_messages";
import { Section } from "../../components/section/section";

interface Props {
  ruleId: UID;
  onCancel?: () => void;
  onCloseSidePanel: () => void;
}

interface State {
  rule: DataValidationRuleData;
  errors: CancelledReason[];
  isTypeUpdated: boolean;
}

export class DataValidationEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationEditor";
  static components = { SelectionInput, Select, Section, ValidationMessages };
  static props = {
    ruleId: String,
    onCancel: { type: Function, optional: true },
    onCloseSidePanel: Function,
  };

  state = useState<State>({
    rule: this.defaultDataValidationRule,
    errors: [],
    isTypeUpdated: false,
  });
  private editingSheetId!: UID;

  setup() {
    this.editingSheetId = this.env.model.getters.getActiveSheetId();
    const rule = this.env.model.getters.getDataValidationRule(
      this.editingSheetId,
      this.props.ruleId
    );
    if (rule) {
      const locale = this.env.model.getters.getLocale();
      this.state.rule = {
        ...localizeDataValidationRule(rule, locale),
        ranges: rule.ranges.map((range) => this.env.model.getters.getRangeString(range)),
      };
    }
  }

  onCriterionTypeChanged(type: DataValidationCriterionType) {
    this.state.rule.criterion.type = type;
    this.state.isTypeUpdated = true;
  }

  onRangesChanged(ranges: string[]) {
    this.state.rule.ranges = ranges;
  }

  onCriterionChanged(criterion: DataValidationCriterion) {
    this.state.rule.criterion = criterion;
  }

  changeRuleIsBlocking(isBlocking: "true" | "false") {
    this.state.rule.isBlocking = isBlocking === "true";
  }

  onCancel() {
    this.props.onCancel?.();
    this.env.replaceSidePanel("DataValidation", `DataValidationEditor_${this.props.ruleId}`);
  }

  onSave() {
    for (const payload of this.dispatchPayload) {
      const result = this.env.model.dispatch("ADD_DATA_VALIDATION_RULE", payload);
      if (!result.isSuccessful) {
        this.state.errors = result.reasons;
        return;
      }
    }
    this.env.replaceSidePanel("DataValidation", `DataValidationEditor_${this.props.ruleId}`);
  }

  get dispatchPayload(): Omit<AddDataValidationCommand, "type">[] {
    const rule = { ...this.state.rule, ranges: undefined };
    const ranges = this.state.rule.ranges.map((xc) =>
      this.env.model.getters.getRangeDataFromXc(this.editingSheetId, xc)
    );
    if (!ranges.length) {
      return [{ sheetId: this.editingSheetId, ranges: [], rule }];
    }
    const rangesBySheet = Object.groupBy(ranges, (range) => range._sheetId);

    const locale = this.env.model.getters.getLocale();

    const criterion = rule.criterion;
    const criterionEvaluator = criterionEvaluatorRegistry.get(criterion.type);

    const values = criterion.values
      .slice(0, criterionEvaluator.numberOfValues(criterion))
      .filter((value) => value && value.trim() !== "")
      .map((value) => canonicalizeContent(value, locale));
    rule.criterion = { ...criterion, values };

    return Object.entries(rangesBySheet).map(([sheetId, sheetRanges]) => ({
      sheetId,
      ranges: sheetRanges!,
      rule,
    }));
  }

  get dvCriterionOptions(): ValueAndLabel[] {
    return getCriterionValueAndLabels(availableDataValidationOperators);
  }

  get defaultDataValidationRule(): DataValidationRuleData {
    const sheetName = this.env.model.getters.getActiveSheetName();
    const zones = this.env.model.getters.getSelectedZones();
    const ranges = zones.map((zone) => getFullReference(sheetName, zoneToXc(zone)));
    return {
      id: this.props.ruleId,
      criterion: { type: "containsText", values: [""] },
      ranges,
    };
  }

  get criterionComponent(): ComponentConstructor | undefined {
    return criterionComponentRegistry.get(this.state.rule.criterion.type).component;
  }

  get errorMessages(): string[] {
    return this.state.errors.map((error) => DVTerms.Errors[error] || DVTerms.Errors.Unexpected);
  }

  get isRuleBlockingSelectOptions(): ValueAndLabel[] {
    return [
      { value: "false", label: _t("Show a warning") },
      { value: "true", label: _t("Reject the input") },
    ];
  }
}
