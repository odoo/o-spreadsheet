import { proxy, useProps } from "@odoo/owl";
import { adaptFormulaToSheet } from "../../../../helpers/formulas";
import { UuidGenerator } from "../../../../helpers/uuid";
import { zoneToXc } from "../../../../helpers/zones";
import { ComponentConstructor } from "../../../../owl3_compatibility_layer";
import {
  criterionComponentRegistry,
  getCriterionValueAndLabels,
} from "../../../../registries/criterion_component_registry";
import { criterionEvaluatorRegistry } from "../../../../registries/criterion_registry";
import { useStore } from "../../../../store_engine/store_hooks";
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
import { Store } from "../../../../types/store_engine";
import { DataValidationRuleData } from "../../../../types/workbook_data";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";
import { Select } from "../../../select/select";
import { SelectionInput } from "../../../selection_input/selection_input";
import { DVTerms } from "../../../translations_terms";
import { ValidationMessages } from "../../../validation_messages/validation_messages";
import { Section } from "../../components/section/section";
import { SidePanelStore } from "../../side_panel/side_panel_store";

interface State {
  rule: DataValidationRuleData;
  errors: CancelledReason[];
  isTypeUpdated: boolean;
}

interface RulesBySheetId {
  [key: UID]: { rule: Omit<DataValidationRule, "ranges">; ranges: RangeData[] };
}

export class DataValidationEditor extends OSComponent {
  static template = "o-spreadsheet-DataValidationEditor";
  static components = { SelectionInput, Select, Section, ValidationMessages };
  protected props = useProps({
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
  private sidePanelStore!: Store<SidePanelStore>;

  setup() {
    this.sidePanelStore = useStore(SidePanelStore);
    const rule = this.model().getters.getDataValidationRule(this.props.sheetId, this.props.ruleId);
    if (rule) {
      this.state.rule = {
        ...rule,
        ranges: rule.ranges.map((range) =>
          this.model().getters.getRangeString(range, this.props.sheetId)
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
    this.sidePanelStore.replace("DataValidation", `DataValidationEditor_${this.props.ruleId}`);
  }

  onSave() {
    const rulesBySheetId = this.rulesBySheetId;
    if (!rulesBySheetId) {
      return;
    }
    const sheetId = this.props.sheetId;
    const ruleId = this.props.ruleId;
    const doesRuleExistOnOriginalSheet = !!this.model().getters.getDataValidationRule(
      sheetId,
      ruleId
    );
    const sheetIdsToRemove =
      doesRuleExistOnOriginalSheet && !(sheetId in rulesBySheetId) ? [sheetId] : [];
    const result = this.model().dispatch("UPDATE_DATA_VALIDATION_RULES", {
      ruleId,
      sheetIdsToRemove,
      rulesBySheetId,
    });
    if (!result.isSuccessful) {
      this.state.errors = result.reasons;
      return;
    }
    this.sidePanelStore.replace("DataValidation", `DataValidationEditor_${this.props.ruleId}`);
  }

  get rulesBySheetId(): RulesBySheetId | undefined {
    const rule = { ...this.state.rule, ranges: undefined };
    const getters = this.model().getters;
    const ranges = this.state.rule.ranges.map((xc) =>
      getters.getRangeFromSheetXC(this.props.sheetId, xc)
    );
    if (ranges.some((range) => range.invalidXc || range.invalidSheetName)) {
      this.state.errors = [CommandResult.InvalidRange];
      return;
    }
    if (!ranges.length) {
      this.state.errors = [CommandResult.EmptyRange];
      return;
    }
    this.state.errors = [];
    const rangesBySheet = Object.groupBy(
      ranges.map((range) => getters.getRangeData(range)),
      (range) => range._sheetId
    );

    const criterion = rule.criterion;
    const criterionEvaluator = criterionEvaluatorRegistry.get(criterion.type);

    const values = criterion.values
      .slice(0, criterionEvaluator.numberOfValues(criterion))
      .filter((value) => value && value.trim() !== "");
    rule.criterion = { ...criterion, values };

    const payload: RulesBySheetId = {};
    for (const sheetId in rangesBySheet) {
      // Copies on other sheets get their own id to avoid overwriting an existing rule there
      const id = sheetId === this.props.sheetId ? rule.id : UuidGenerator.smallUuid();
      const ranges = rangesBySheet[sheetId];
      if (!ranges) {
        continue;
      }
      const criterion =
        sheetId === this.props.sheetId
          ? rule.criterion
          : this.adaptCriterionToSheet(rule.criterion, sheetId);
      payload[sheetId] = { ranges, rule: { ...rule, id, criterion } };
    }

    return payload;
  }

  private adaptCriterionToSheet(
    criterion: DataValidationCriterion,
    toSheetId: UID
  ): DataValidationCriterion {
    const getters = this.model().getters;
    const values = criterion.values.map((value) =>
      criterion.type === "isValueInRange" || value.startsWith("=")
        ? adaptFormulaToSheet(getters, value, toSheetId, this.props.sheetId)
        : value
    );
    return { ...criterion, values };
  }

  get dvCriterionOptions(): ValueAndLabel[] {
    return getCriterionValueAndLabels(availableDataValidationOperators);
  }

  get defaultDataValidationRule(): DataValidationRuleData {
    const sheetId = this.model().getters.getActiveSheetId();
    const ranges = this.model()
      .getters.getSelectedZones()
      .map((zone) => zoneToXc(this.model().getters.getUnboundedZone(sheetId, zone)));
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
