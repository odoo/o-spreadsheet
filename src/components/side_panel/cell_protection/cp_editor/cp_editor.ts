import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { deepCopy, deepEquals, zoneToXc } from "../../../../helpers";
import {
  AddCellProtectionCommand,
  AddRangeCellProtectionCommand,
  AddSheetCellProtectionCommand,
  CellProtectionRule,
  CellProtectionRuleData,
  RangeCellProtectionRuleData,
  SheetCellProtectionRuleData,
  SpreadsheetChildEnv,
  UID,
} from "../../../../types";
import { css } from "../../../helpers";
import { SelectionInput } from "../../../selection_input/selection_input";
import { CellProtectionTerms } from "../../../translations_terms";
import { ValidationMessages } from "../../../validation_messages/validation_messages";
import { Checkbox } from "../../components/checkbox/checkbox";
import { Section } from "../../components/section/section";
import { SelectMenu } from "../../select_menu/select_menu";

css/* scss */ `
  .o-sidePanel .o-sidePanelBody .o-dv-form {
    .o-section {
      padding: 16px 16px 0 16px;
    }
  }
`;
interface Props {
  rule: CellProtectionRule | undefined;
  onExit: () => void;
  onCloseSidePanel?: () => void;
}

type RuleCategory = "none" | "entireSheet" | "entireSheetExceptCertainCells" | "onlyCertainCells";

interface State {
  rule: CellProtectionRuleData;
  ruleCategory: RuleCategory;
}

export class CellProtectionEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CellProtectionEditor";
  static components = { SelectionInput, SelectMenu, Section, Checkbox, ValidationMessages };
  static props = {
    rule: { type: Object, optional: true },
    onExit: Function,
    onCloseSidePanel: { type: Function, optional: true },
  };

  state = useState<State>({
    rule: this.defaultCellProtectionRule,
    ruleCategory: this.defaultRuleCategory,
  });

  setup() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    if (this.props.rule) {
      if (this.props.rule.type === "range") {
        this.state.rule = {
          ...this.props.rule,
          ranges: this.props.rule.ranges.map((range) =>
            this.env.model.getters.getRangeString(range, sheetId)
          ),
        };
      }
    } else {
      this.state.rule = {
        id: this.env.model.uuidGenerator.uuidv4(),
        sheetId: "",
        type: "sheet",
        excludeRanges: [],
      };
    }
    onWillUpdateProps((nextProps) => {
      if (!deepEquals(nextProps.rule, this.props.rule)) {
        this.state.rule = deepCopy(nextProps.rule);
      }
    });
  }

  get defaultRuleCategory(): RuleCategory {
    if (!this.props.rule) {
      return "entireSheet";
    }
    if (this.props.rule.type === "range") {
      return "onlyCertainCells";
    } else if (!this.props.rule.excludeRanges.length) {
      return "entireSheet";
    }
    return "entireSheetExceptCertainCells";
  }

  onRangesChanged(ranges: string[]) {
    if (this.state.rule.type === "range") {
      this.state.rule.ranges = ranges;
    } else {
      this.state.rule.excludeRanges = ranges;
    }
  }

  onSheetChanged(ev: InputEvent) {
    const sheetId = (ev.target as HTMLInputElement).value;
    this.state.rule.sheetId = sheetId;
    this.env.model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: this.env.model.getters.getActiveSheetId(),
      sheetIdTo: sheetId,
    });
  }

  onRuleCategoryChanged(ev: InputEvent) {
    const sheetId = this.state.rule.sheetId;
    const ranges = this.env.model.getters
      .getSelectedZones()
      .map((zone) => zoneToXc(this.env.model.getters.getUnboundedZone(sheetId, zone)));
    const newValue = (ev.target as HTMLInputElement).value as RuleCategory;
    this.state.ruleCategory = newValue;
    const rule = {
      id: this.state.rule.id,
      sheetId: sheetId,
    };
    switch (newValue) {
      case "entireSheet":
        this.state.rule = {
          ...rule,
          type: "sheet",
          excludeRanges: [],
        };
        break;
      case "entireSheetExceptCertainCells":
        this.state.rule = {
          ...rule,
          type: "sheet",
          excludeRanges: ranges,
        };
        break;
      case "onlyCertainCells":
        this.state.rule = {
          ...rule,
          type: "range",
          ranges,
        };
        break;
    }
  }

  onSave() {
    if (!this.canSave) {
      return;
    }
    if (this.state.ruleCategory === "none") {
      this.env.model.dispatch("REMOVE_CELL_PROTECTION_RULE", { sheetId: this.state.rule.sheetId });
    } else if (this.state.rule.type === "range") {
      this.env.model.dispatch(
        "ADD_RANGE_CELL_PROTECTION_RULE",
        this.dispatchPayload as Omit<AddRangeCellProtectionCommand, "type">
      );
    } else {
      this.env.model.dispatch(
        "ADD_SHEET_CELL_PROTECTION_RULE",
        this.dispatchPayload as Omit<AddSheetCellProtectionCommand, "type">
      );
    }
    this.props.onExit();
  }

  getCheckboxLabel(attName: string): string {
    return CellProtectionTerms.Checkboxes[attName];
  }

  get canSave(): boolean {
    if (this.state.rule.type === "range") {
      return this.env.model.canDispatch(
        "ADD_RANGE_CELL_PROTECTION_RULE",
        this.dispatchPayload as Omit<AddRangeCellProtectionCommand, "type">
      ).isSuccessful;
    } else {
      return this.env.model.canDispatch(
        "ADD_SHEET_CELL_PROTECTION_RULE",
        this.dispatchPayload as Omit<AddSheetCellProtectionCommand, "type">
      ).isSuccessful;
    }
  }

  get sheets() {
    const protectdSheets = this.env.model.getters.getProtectedSheetIds();
    return this.env.model.getters
      .getSheetIds()
      .filter((id) => !protectdSheets.includes(id))
      .map((id) => ({ id: id, name: this.env.model.getters.getSheetName(id) }));
  }

  get sheetName() {
    if (!this.props.rule) {
      return;
    }
    return `Protection rule for ${this.env.model.getters.getSheetName(this.props.rule.sheetId)}`;
  }

  getRangeProtectionRuleDispatchPayload(
    sheetId: UID,
    rule: RangeCellProtectionRuleData
  ): Omit<AddRangeCellProtectionCommand, "type"> {
    return {
      rule: {
        ...rule,
        ranges: rule.ranges.map((xc) => this.env.model.getters.getRangeDataFromXc(sheetId, xc)),
      },
    };
  }

  getSheetProtectionRuleDispatchPayload(
    sheetId: UID,
    rule: SheetCellProtectionRuleData
  ): Omit<AddSheetCellProtectionCommand, "type"> {
    return {
      rule: {
        ...rule,
        excludeRanges: rule.excludeRanges.map((xc) =>
          this.env.model.getters.getRangeDataFromXc(sheetId, xc)
        ),
      },
    };
  }

  get dispatchPayload(): Omit<AddCellProtectionCommand, "type"> {
    const sheetId = this.env.model.getters.getActiveSheetId();
    if (this.state.rule.type === "range") {
      return this.getRangeProtectionRuleDispatchPayload(sheetId, this.state.rule);
    } else {
      return this.getSheetProtectionRuleDispatchPayload(sheetId, this.state.rule);
    }
  }

  get defaultCellProtectionRule(): CellProtectionRuleData {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const ranges = this.env.model.getters
      .getSelectedZones()
      .map((zone) => zoneToXc(this.env.model.getters.getUnboundedZone(sheetId, zone)));
    if (this.props.rule) {
      if (this.props.rule.type === "range") {
        return {
          ...this.props.rule,
          ranges: this.props.rule.ranges.map((range) =>
            this.env.model.getters.getRangeString(range, range.sheetId)
          ),
        };
      } else {
        return {
          ...this.props.rule,
          excludeRanges: this.props.rule.excludeRanges.map((range) =>
            this.env.model.getters.getRangeString(range, range.sheetId)
          ),
        };
      }
    } else {
      return {
        id: this.env.model.uuidGenerator.uuidv4(),
        type: "range",
        sheetId: "",
        ranges,
      };
    }
  }
}
