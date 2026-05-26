import { props } from "@odoo/owl";
import { ActionSpec } from "../../../../actions/action";
import { UuidGenerator } from "../../../../helpers/uuid";
import { Component } from "../../../../owl3_compatibility_layer";
import { _t } from "../../../../translation";
import { CommandResult } from "../../../../types/commands";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { types } from "../../../props_validation";
import { TextInput } from "../../../text_input/text_input";
import { CogWheelMenu } from "../../components/cog_wheel_menu/cog_wheel_menu";
import { Section } from "../../components/section/section";

export class PivotTitleSection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotTitleSection";
  static components = { CogWheelMenu, Section, TextInput };
  protected props = props({
    pivotId: types.UID(),
    flipAxis: types.function([]),
  });

  get cogWheelMenuItems(): ActionSpec[] {
    return [
      {
        name: _t("Flip axes"),
        icon: "o-spreadsheet-Icon.EXCHANGE",
        execute: this.props.flipAxis,
        isEnabledOnLockedSheet: true,
      },
      {
        name: _t("Duplicate"),
        icon: "o-spreadsheet-Icon.COPY",
        execute: () => this.duplicatePivot(),
        isEnabledOnLockedSheet: true,
      },
      {
        name: _t("Delete"),
        icon: "o-spreadsheet-Icon.TRASH",
        execute: () => this.delete(),
        isEnabledOnLockedSheet: true,
      },
    ];
  }

  get name() {
    return this.env.model.getters.getPivotName(this.props.pivotId);
  }

  get displayName() {
    return this.env.model.getters.getPivotDisplayName(this.props.pivotId);
  }

  duplicatePivot() {
    const newPivotId = UuidGenerator.smallUuid();
    const newSheetId = UuidGenerator.smallUuid();
    const result = this.env.model.dispatch("DUPLICATE_PIVOT_IN_NEW_SHEET", {
      pivotId: this.props.pivotId,
      newPivotId,
      newSheetId,
    });
    let text: string;
    if (result.isSuccessful) {
      text = _t("Pivot duplicated.");
    } else if (result.isCancelledBecause(CommandResult.PivotInError)) {
      text = _t("Cannot duplicate a pivot in error.");
    } else {
      text = _t("Pivot duplication failed.");
    }
    const type = result.isSuccessful ? "success" : "danger";
    this.env.notifyUser({
      text,
      sticky: false,
      type,
    });
    if (result.isSuccessful) {
      this.env.openSidePanel("PivotSidePanel", { pivotId: newPivotId });
    }
  }

  delete() {
    this.env.askConfirmation(_t("Are you sure you want to delete this pivot?"), () => {
      this.env.model.dispatch("REMOVE_PIVOT", { pivotId: this.props.pivotId });
    });
  }

  onNameChanged(name: string) {
    const pivot = this.env.model.getters.getPivotCoreDefinition(this.props.pivotId);
    this.env.model.dispatch("UPDATE_PIVOT", {
      pivotId: this.props.pivotId,
      pivot: {
        ...pivot,
        name,
      },
    });
  }
}
