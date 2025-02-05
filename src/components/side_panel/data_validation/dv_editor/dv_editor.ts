import { Component, ComponentConstructor, useState } from "@odoo/owl";
import { Action } from "../../../../actions/action";
import { zoneToXc } from "../../../../helpers";
import { canonicalizeContent } from "../../../../helpers/locale";
import { dataValidationEvaluatorRegistry } from "../../../../registries/data_validation_registry";
import {
  AddDataValidationCommand,
  CancelledReason,
  CommandResult,
  DataValidationCriterion,
  DataValidationCriterionType,
  DataValidationRule,
  DataValidationRuleData,
  SpreadsheetChildEnv,
  UID,
} from "../../../../types";
import { SelectionInput } from "../../../selection_input/selection_input";
import { DVTerms } from "../../../translations_terms";
import { ValidationMessages } from "../../../validation_messages/validation_messages";
import { Section } from "../../components/section/section";
import { SelectMenu } from "../../select_menu/select_menu";
import {
  dataValidationPanelCriteriaRegistry,
  getDataValidationCriterionMenuItems,
} from "../data_validation_panel_helper";

interface Props {
  rule: DataValidationRule | undefined;
  onExit: () => void;
  onCloseSidePanel?: () => void;
  sheetId: UID;
}

interface State {
  rule: DataValidationRuleData;
  errors: CancelledReason[];
}

export class DataValidationEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationEditor";
  static components = { SelectionInput, SelectMenu, Section, ValidationMessages };
  static props = {
    rule: { type: Object, optional: true },
    onExit: Function,
    onCloseSidePanel: { type: Function, optional: true },
    sheetId: { type: String, optional: false },
  };

  state = useState<State>({
    rule: this.defaultDataValidationRule,
    errors: [],
  });

  setup() {
    if (this.props.rule) {
      this.state.rule = {
        ...this.props.rule,
        ranges: this.props.rule.ranges.map((range) =>
          this.env.model.getters.getRangeString(range, this.props.sheetId)
        ),
      };
      this.state.rule.criterion.type = this.props.rule.criterion.type;
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

  onSave() {
    if (this.state.rule) {
      const result = this.env.model.dispatch("ADD_DATA_VALIDATION_RULE", this.dispatchPayload);
      if (!result.isSuccessful) {
        this.state.errors = result.reasons;
      } else {
        this.props.onExit();
      }
    }
  }

  get dispatchPayload(): Omit<AddDataValidationCommand, "type"> {
    const rule = { ...this.state.rule, ranges: undefined };
    const locale = this.env.model.getters.getLocale();

    const criterion = rule.criterion;
    const criterionEvaluator = dataValidationEvaluatorRegistry.get(criterion.type);

    const sheetId = this.props.sheetId;
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

  get isRangeReadonly(): boolean {
    return this.env.model.getters.getActiveSheetId() !== this.props.sheetId;
  }

  get dvCriterionMenuItems(): Action[] {
    return getDataValidationCriterionMenuItems((type) => this.onCriterionTypeChanged(type));
  }

  get selectedCriterionName(): string {
    const selectedType = this.state.rule.criterion.type;
    return dataValidationEvaluatorRegistry.get(selectedType).name;
  }

  get defaultDataValidationRule(): DataValidationRuleData {
    const sheetId = this.props.sheetId;
    const ranges = this.env.model.getters
      .getSelectedZones()
      .map((zone) => zoneToXc(this.env.model.getters.getUnboundedZone(sheetId, zone)));
    return {
      id: this.env.model.uuidGenerator.uuidv4(),
      criterion: { type: "textContains", values: [""] },
      ranges,
    };
  }

  get criterionComponent(): ComponentConstructor | undefined {
    return dataValidationPanelCriteriaRegistry.get(this.state.rule.criterion.type).component;
  }

  get errorMessages(): string[] {
    return this.state.errors.map((error) => this.errorMessage(error));
  }

  errorMessage(reason: CancelledReason): string {
    switch (reason) {
      case CommandResult.TargetOutOfSheet:
        return DVTerms.Errors[reason](this.props.sheetId, this.invalidRangeString);
      case CommandResult.InvalidRange:
        return DVTerms.Errors[reason](this.invalidRangeString);
      default:
        return DVTerms.Errors[reason]() || DVTerms.Errors.Unexpected();
    }
  }

  get invalidRangeString(): string[] {
    const sheetId = this.props.sheetId;
    return this.state.rule.ranges.filter((xc) => {
      const range = this.env.model.getters.getRangeDataFromXc(sheetId, xc);
      return range._sheetId != sheetId || !this.env.model.getters.isRangeValid(xc);
    });
  }
}
