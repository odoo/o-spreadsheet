import { Component, ComponentConstructor, useState } from "@odoo/owl";
import { Action } from "../../../../actions/action";
import { zoneToXc } from "../../../../helpers";
import { canonicalizeContent } from "../../../../helpers/locale";
import { dataValidationEvaluatorRegistry } from "../../../../registries/data_validation_registry";
import {
  AddDataValidationCommand,
  DataValidationCriterion,
  DataValidationCriterionType,
  DataValidationRule,
  DataValidationRuleData,
  SpreadsheetChildEnv,
} from "../../../../types";
import { css } from "../../../helpers";
import { SelectionInput } from "../../../selection_input/selection_input";
import { Section } from "../../components/section/section";
import { SelectMenu } from "../../select_menu/select_menu";
import {
  dataValidationPanelCriteriaRegistry,
  getDataValidationCriterionMenuItems,
} from "../data_validation_panel_helper";

css/* scss */ `
  .o-sidePanel .o-sidePanelBody .o-dv-form {
    .o-section {
      padding: 16px 16px 0 16px;
    }
  }
`;
interface Props {
  rule: DataValidationRule | undefined;
  onExit: () => void;
}

interface State {
  rule: DataValidationRuleData;
}

export class DataValidationEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationEditor";
  static components = { SelectionInput, SelectMenu, Section };

  state = useState<State>({ rule: this.defaultDataValidationRule });

  setup() {
    if (this.props.rule) {
      const sheetId = this.env.model.getters.getActiveSheetId();
      this.state.rule = {
        ...this.props.rule,
        ranges: this.props.rule.ranges.map((range) =>
          this.env.model.getters.getRangeString(range, sheetId)
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
    if (!this.canSave) {
      return;
    }
    this.env.model.dispatch("ADD_DATA_VALIDATION_RULE", this.dispatchPayload);
    this.props.onExit();
  }

  get canSave(): boolean {
    return this.env.model.canDispatch("ADD_DATA_VALIDATION_RULE", this.dispatchPayload)
      .isSuccessful;
  }

  get dispatchPayload(): Omit<AddDataValidationCommand, "type"> {
    const rule = { ...this.state.rule, ranges: undefined };
    const locale = this.env.model.getters.getLocale();

    const criterion = rule.criterion;
    const criterionEvaluator = dataValidationEvaluatorRegistry.get(criterion.type);

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
    return getDataValidationCriterionMenuItems((type) => this.onCriterionTypeChanged(type));
  }

  get selectedCriterionName(): string {
    const selectedType = this.state.rule.criterion.type;
    return dataValidationEvaluatorRegistry.get(selectedType).name;
  }

  get defaultDataValidationRule(): DataValidationRuleData {
    const sheetId = this.env.model.getters.getActiveSheetId();
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
}

DataValidationEditor.props = {
  rule: { type: Object, optional: true },
  onExit: Function,
};
