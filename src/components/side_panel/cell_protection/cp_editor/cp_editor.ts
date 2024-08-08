import { Component, useState } from "@odoo/owl";
import { zoneToXc } from "../../../../helpers";
import {
  AddCellProtectionCommand,
  CellProtectionRule,
  CellProtectionRuleData,
  SpreadsheetChildEnv,
} from "../../../../types";
import { css } from "../../../helpers";
import { SelectionInput } from "../../../selection_input/selection_input";
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

interface State {
  rule: CellProtectionRuleData;
}

export class CellProtectionEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CellProtectionEditor";
  static components = { SelectionInput, SelectMenu, Section };
  static props = {
    rule: { type: Object, optional: true },
    onExit: Function,
    onCloseSidePanel: { type: Function, optional: true },
  };

  state = useState<State>({ rule: this.defaultCellProtectionRule });

  setup() {
    if (this.props.rule) {
      const sheetId = this.env.model.getters.getActiveSheetId();
      this.state.rule = {
        ...this.props.rule,
        ranges: this.props.rule.ranges.map((range) =>
          this.env.model.getters.getRangeString(range, sheetId)
        ),
      };
    }
  }

  onRangesChanged(ranges: string[]) {
    this.state.rule.ranges = ranges;
  }

  onDescriptionChanged(ev: InputEvent) {
    this.state.rule.description = (ev.target as HTMLInputElement).value;
  }

  onSave() {
    if (!this.canSave) {
      return;
    }
    this.env.model.dispatch("ADD_CELL_PROTECTION_RULE", this.dispatchPayload);
    this.props.onExit();
  }

  get canSave(): boolean {
    return this.env.model.canDispatch("ADD_CELL_PROTECTION_RULE", this.dispatchPayload)
      .isSuccessful;
  }

  onRuleTypeChanged(ev: InputEvent) {
    this.state.rule.type = (ev.target as HTMLInputElement).value as "range";
  }

  get dispatchPayload(): Omit<AddCellProtectionCommand, "type"> {
    const rule = { ...this.state.rule, ranges: undefined };
    const sheetId = this.env.model.getters.getActiveSheetId();
    return {
      sheetId,
      ranges: this.state.rule.ranges.map((xc) =>
        this.env.model.getters.getRangeDataFromXc(sheetId, xc)
      ),
      rule,
    };
  }

  get defaultCellProtectionRule(): CellProtectionRuleData {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const ranges = this.env.model.getters
      .getSelectedZones()
      .map((zone) => zoneToXc(this.env.model.getters.getUnboundedZone(sheetId, zone)));
    return {
      id: this.env.model.uuidGenerator.uuidv4(),
      type: this.props.rule?.type ?? "range",
      description: this.props.rule?.description ?? "",
      ranges,
    };
  }
}
