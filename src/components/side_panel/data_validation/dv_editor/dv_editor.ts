import { Component, ComponentConstructor, useState } from "@odoo/owl";
import { Action } from "../../../../actions/action";
import { zoneToXc } from "../../../../helpers";
import { canonicalizeContent, localizeDataValidationRule } from "../../../../helpers/locale";
import {
  criterionComponentRegistry,
  getCriterionMenuItems,
} from "../../../../registries/criterion_component_registry";
import { criterionEvaluatorRegistry } from "../../../../registries/criterion_registry";
import {
  AddDataValidationCommand,
  CancelledReason,
  DataValidationCriterion,
  DataValidationCriterionType,
  DataValidationRuleData,
  SpreadsheetChildEnv,
  UID,
  availableDataValidationOperators,
} from "../../../../types";
import { SelectionInput } from "../../../selection_input/selection_input";
import { DVTerms } from "../../../translations_terms";
import { ValidationMessages } from "../../../validation_messages/validation_messages";
import { Section } from "../../components/section/section";
import { SelectMenu } from "../../select_menu/select_menu";

interface Props {
  id: UID;
  onCloseSidePanel?: () => void;
}

interface State {
  rule: DataValidationRuleData;
  errors: CancelledReason[];
}

export class DataValidationEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationEditor";
  static components = { SelectionInput, SelectMenu, Section, ValidationMessages };
  static props = {
    id: { type: String },
    onCloseSidePanel: { type: Function, optional: true },
  };

  state = useState<State>({ rule: this.defaultDataValidationRule, errors: [] });

  setup() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const rule = this.env.model.getters.getDataValidationRule(sheetId, this.props.id);
    if (rule) {
      const locale = this.env.model.getters.getLocale();
      this.state.rule = {
        ...localizeDataValidationRule(rule, locale),
        ranges: rule.ranges.map((range) => this.env.model.getters.getRangeString(range, sheetId)),
      };
    }
  }

  onCriterionTypeChanged(type: DataValidationCriterionType) {
    this.state.rule.criterion.type = type;
  }

  onRangesChanged(ranges: string[]) {
    this.state.rule.ranges = ranges;
  }

  onCriterionChanged(criterion: DataValidationCriterion) {
    this.state.rule.criterion = criterion;
  }

  changeRuleIsBlocking(ev: Event) {
    const isBlocking = (ev.target as HTMLInputElement).value;
    this.state.rule.isBlocking = isBlocking === "true";
  }

  onCancel() {
    this.env.replaceSidePanel("DataValidation", `DataValidationEditor_${this.state.rule.id}`);
  }

  onSave() {
    const result = this.env.model.dispatch("ADD_DATA_VALIDATION_RULE", this.dispatchPayload);
    if (!result.isSuccessful) {
      this.state.errors = result.reasons;
      return;
    }
    this.env.replaceSidePanel("DataValidation", `DataValidationEditor_${this.state.rule.id}`);
  }

  get dispatchPayload(): Omit<AddDataValidationCommand, "type"> {
    const rule = { ...this.state.rule, ranges: undefined };
    const locale = this.env.model.getters.getLocale();

    const criterion = rule.criterion;
    const criterionEvaluator = criterionEvaluatorRegistry.get(criterion.type);

    const sheetId = this.env.model.getters.getActiveSheetId();
    const values = criterion.values
      .slice(0, criterionEvaluator.numberOfValues(criterion))
      .map((value) => value?.trim())
      .filter((value) => value !== "" && value !== undefined)
      .map((value) => canonicalizeContent(value, locale));
    rule.criterion = { ...criterion, values };
    return {
      sheetId,
      ranges: this.state.rule.ranges.map((xc) =>
        this.env.model.getters.getRangeDataFromXc(sheetId, xc)
      ),
      rule,
    };
  }

  get dvCriterionMenuItems(): Action[] {
    return getCriterionMenuItems(
      (type) => this.onCriterionTypeChanged(type as DataValidationCriterionType),
      availableDataValidationOperators
    );
  }

  get selectedCriterionName(): string {
    const selectedType = this.state.rule.criterion.type;
    return criterionEvaluatorRegistry.get(selectedType).name;
  }

  get defaultDataValidationRule(): DataValidationRuleData {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const ranges = this.env.model.getters
      .getSelectedZones()
      .map((zone) => zoneToXc(this.env.model.getters.getUnboundedZone(sheetId, zone)));
    return {
      id: this.props.id,
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
}
