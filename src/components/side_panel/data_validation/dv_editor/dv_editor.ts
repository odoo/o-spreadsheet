import { props, proxy } from "@odoo/owl";
import { canonicalizeContent, localizeDataValidationRule } from "../../../../helpers/locale";
import { getFullReference, splitReference } from "../../../../helpers/references";
import { zoneToXc } from "../../../../helpers/zones";
import { Component, ComponentConstructor } from "../../../../owl3_compatibility_layer";
import {
  criterionComponentRegistry,
  getCriterionValueAndLabels,
} from "../../../../registries/criterion_component_registry";
import { criterionEvaluatorRegistry } from "../../../../registries/criterion_registry";
import { _t } from "../../../../translation";
import { CancelledReason, CommandResult } from "../../../../types/commands";
import {
  availableDataValidationOperators,
  DataValidationCriterion,
  DataValidationCriterionType,
  DataValidationRule,
} from "../../../../types/data_validation";
import { UID, ValueAndLabel } from "../../../../types/misc";
import { RangeData } from "../../../../types/range";
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
    "onCancel?": types.function(),
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

  switchSheetOnClose() {
    const currentSheetName = this.env.model.getters.getActiveSheetName();
    const hasCurrentSheetName = this.state.rule.ranges.some((xc) => {
      const { sheetName } = splitReference(xc);
      return sheetName === currentSheetName;
    });
    if (!hasCurrentSheetName) {
      this.env.model.dispatch("ACTIVATE_SHEET", {
        sheetIdTo: this.props.sheetId,
        sheetIdFrom: this.env.model.getters.getActiveSheetId(),
      });
    }
  }

  onCancel() {
    this.props.onCancel?.();
    this.switchSheetOnClose();
    this.env.replaceSidePanel("DataValidation", `DataValidationEditor_${this.props.ruleId}`);
  }

  onSave() {
    const dispatchPayload = this.dispatchPayload;
    if (!dispatchPayload) {
      return;
    }
    const result = this.env.model.dispatch("ADD_DATA_VALIDATION_RULES", {
      sheetIdsToAdd: dispatchPayload,
    });
    if (!result.isSuccessful) {
      this.state.errors = result.reasons;
      return;
    }
    this.switchSheetOnClose();
    this.env.replaceSidePanel("DataValidation", `DataValidationEditor_${this.props.ruleId}`);
  }

  get dispatchPayload():
    | undefined
    | {
        [key: UID]: { rule: Omit<DataValidationRule, "ranges">; ranges: RangeData[] };
      } {
    const rule = { ...this.state.rule, ranges: undefined };
    const ranges = this.state.rule.ranges.map((xc) => {
      const { sheetName } = splitReference(xc);
      const sheetId = this.env.model.getters.getSheetIdByName(sheetName);
      if (sheetName && !sheetId) {
        return this.env.model.getters.getRangeDataFromXc(undefined, xc);
      }
      return this.env.model.getters.getRangeDataFromXc(this.props.sheetId, xc);
    });
    if (!ranges.length) {
      this.state.errors = [CommandResult.EmptyRange];
      return;
    }
    this.state.errors = [];
    const rangesBySheet = Object.groupBy(ranges, (range) => range._sheetId);

    const locale = this.env.model.getters.getLocale();

    const criterion = rule.criterion;
    const criterionEvaluator = criterionEvaluatorRegistry.get(criterion.type);

    const values = criterion.values
      .slice(0, criterionEvaluator.numberOfValues(criterion))
      .filter((value) => value && value.trim() !== "")
      .map((value) => canonicalizeContent(value, locale));
    rule.criterion = { ...criterion, values };

    const payload = {};
    for (const sheetId in rangesBySheet) {
      payload[sheetId] = { ranges: rangesBySheet[sheetId], rule };
    }

    return payload;
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
