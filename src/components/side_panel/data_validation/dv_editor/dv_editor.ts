import { props, proxy } from "@odoo/owl";
import { zoneToXc } from "../../../../helpers/zones";
import { Component, ComponentConstructor } from "../../../../owl3_compatibility_layer";
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
import { types } from "../../../props_validation";
import { Select } from "../../../select/select";
import { SelectionInput } from "../../../selection_input/selection_input";
import { DVTerms } from "../../../translations_terms";
import { ValidationMessages } from "../../../validation_messages/validation_messages";
import { Section } from "../../components/section/section";

interface State {
  rule: DataValidationRuleData;
  errors: CancelledReason[];
  isTypeUpdated: boolean;
}

export class DataValidationEditor extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationEditor";
  static components = { SelectionInput, Select, Section, ValidationMessages };
  protected props = props({
    ruleId: types.UID(),
    onCancel: types.function().optional(),
    onCloseSidePanel: types.function(),
    sheetId: types.UID(),
  });

  state = proxy<State>({
    rule: this.defaultDataValidationRule,
    errors: [],
    isTypeUpdated: false,
  });

  setup() {
    const rule = this.env.model.getters.getDataValidationRule(
      this.props.sheetId,
      this.props.ruleId
    );
    if (rule) {
      this.state.rule = {
        ...rule,
        ranges: rule.ranges.map((range) =>
          this.env.model.getters.getRangeString(range, this.props.sheetId)
        ),
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
    this.env.model.dispatch("ACTIVATE_SHEET", {
      sheetIdTo: this.props.sheetId,
      sheetIdFrom: this.env.model.getters.getActiveSheetId(),
    });
    this.env.replaceSidePanel("DataValidation", `DataValidationEditor_${this.props.ruleId}`);
  }

  onSave() {
    const result = this.env.model.dispatch("ADD_DATA_VALIDATION_RULE", this.dispatchPayload);
    if (!result.isSuccessful) {
      this.state.errors = result.reasons;
      return;
    }
    this.env.model.dispatch("ACTIVATE_SHEET", {
      sheetIdTo: this.props.sheetId,
      sheetIdFrom: this.env.model.getters.getActiveSheetId(),
    });
    this.env.replaceSidePanel("DataValidation", `DataValidationEditor_${this.props.ruleId}`);
  }

  get dispatchPayload(): Omit<AddDataValidationCommand, "type"> {
    const rule = { ...this.state.rule, ranges: undefined };

    const criterion = rule.criterion;
    const criterionEvaluator = criterionEvaluatorRegistry.get(criterion.type);

    const values = criterion.values
      .slice(0, criterionEvaluator.numberOfValues(criterion))
      .filter((value) => value && value.trim() !== "");
    rule.criterion = { ...criterion, values };
    return {
      sheetId: this.props.sheetId,
      ranges: this.state.rule.ranges.map((xc) =>
        this.env.model.getters.getRangeDataFromXc(this.props.sheetId, xc)
      ),
      rule,
    };
  }

  get dvCriterionOptions(): ValueAndLabel[] {
    return getCriterionValueAndLabels(availableDataValidationOperators);
  }

  get defaultDataValidationRule(): DataValidationRuleData {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const ranges = this.env.model.getters
      .getSelectedZones()
      .map((zone) => zoneToXc(this.env.model.getters.getUnboundedZone(sheetId, zone)));
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
