import { _t } from "@odoo/o-spreadsheet-engine";
import { DVTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { canonicalizeContent } from "@odoo/o-spreadsheet-engine/helpers/locale";
import { criterionEvaluatorRegistry } from "@odoo/o-spreadsheet-engine/registries/criterion_registry";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, ComponentConstructor, useState } from "@odoo/owl";
import { Action } from "../../../../actions/action";
import { zoneToXc } from "../../../../helpers";
import {
  criterionComponentRegistry,
  getCriterionMenuItems,
} from "../../../../registries/criterion_component_registry";
import {
  AddDataValidationCommand,
  availableDataValidationOperators,
  CancelledReason,
  CommandResult,
  DataValidationCriterion,
  DataValidationCriterionType,
  DataValidationRule,
  DataValidationRuleData,
  UID,
} from "../../../../types";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ValidationMessages } from "../../../validation_messages/validation_messages";
import { Section } from "../../components/section/section";
import { SelectMenu } from "../../select_menu/select_menu";

interface Props {
  rule: DataValidationRule | undefined;
  onExit: () => void;
  onCloseSidePanel?: () => void;
  sheetId: UID;
}

interface State {
  rule: DataValidationRuleData;
  errors: CancelledReason[];
  isTypeUpdated: boolean;
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
    isTypeUpdated: false,
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

  get rangeTitle(): string {
    if (this.isRangeReadonly) {
      return _t(
        "Apply to ranges: (on %s)",
        this.env.model.getters.getSheetName(this.props.sheetId)
      );
    }
    return _t("Apply to ranges:");
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
        this.env.model.dispatch("ACTIVATE_SHEET", {
          sheetIdTo: this.props.sheetId,
          sheetIdFrom: this.env.model.getters.getActiveSheetId(),
        });
      }
    }
  }

  onCancel() {
    this.props.onExit();
    this.env.model.dispatch("ACTIVATE_SHEET", {
      sheetIdTo: this.props.sheetId,
      sheetIdFrom: this.env.model.getters.getActiveSheetId(),
    });
  }

  get dispatchPayload(): Omit<AddDataValidationCommand, "type"> {
    const rule = { ...this.state.rule, ranges: undefined };
    const locale = this.env.model.getters.getLocale();

    const criterion = rule.criterion;
    const criterionEvaluator = criterionEvaluatorRegistry.get(criterion.type);

    const values = criterion.values
      .slice(0, criterionEvaluator.numberOfValues(criterion))
      .map((value) => value?.trim())
      .filter((value) => value !== "" && value !== undefined)
      .map((value) => canonicalizeContent(value, locale));
    rule.criterion = { ...criterion, values };
    return {
      sheetId: this.props.sheetId,
      ranges: this.state.rule.ranges.map((xc) =>
        this.env.model.getters.getRangeDataFromXc(this.props.sheetId, xc)
      ),
      rule,
    };
  }

  get isRangeReadonly(): boolean {
    return this.env.model.getters.getActiveSheetId() !== this.props.sheetId;
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
    const sheetId = this.props.sheetId;
    const ranges = this.env.model.getters
      .getSelectedZones()
      .map((zone) => zoneToXc(this.env.model.getters.getUnboundedZone(sheetId, zone)));
    return {
      id: this.env.model.uuidGenerator.smallUuid(),
      criterion: { type: "containsText", values: [""] },
      ranges,
    };
  }

  get criterionComponent(): ComponentConstructor | undefined {
    return criterionComponentRegistry.get(this.state.rule.criterion.type).component;
  }

  get errorMessages(): string[] {
    return this.state.errors.map((error) => this.errorMessage(error));
  }

  errorMessage(reason: CancelledReason): string {
    switch (reason) {
      case CommandResult.TargetOutOfSheet:
        const sheetName = this.env.model.getters.getSheetName(this.props.sheetId);
        return DVTerms.Errors[reason](sheetName, this.invalidRangeString);
      case CommandResult.InvalidRange:
        return DVTerms.Errors[reason](this.invalidRangeString);
      default:
        return DVTerms.Errors[reason]?.() || DVTerms.Errors.Unexpected();
    }
  }

  get invalidRangeString(): string[] {
    const sheetId = this.props.sheetId;
    return this.state.rule.ranges.filter((xc) => {
      const range = this.env.model.getters.getRangeDataFromXc(sheetId, xc);
      return range._sheetId !== sheetId || !this.env.model.getters.isRangeValid(xc);
    });
  }
}
