import { Component } from "@odoo/owl";
import { ActionSpec } from "../../../../actions/action";
import { _t } from "../../../../translation";
import { SpreadsheetChildEnv, UID } from "../../../../types";
import { CogWheelMenu } from "../../components/cog_wheel_menu/cog_wheel_menu";
import { Section } from "../../components/section/section";
import { EditableName } from "../editable_name/editable_name";

interface Props {
  pivotId: UID;
  flipAxis: () => void;
}

export class PivotTitleSection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotTitleSection";
  static components = { CogWheelMenu, Section, EditableName };
  static props = {
    pivotId: String,
    flipAxis: Function,
  };

  get cogWheelMenuItems(): ActionSpec[] {
    return [
      {
        name: _t("Flip axes"),
        icon: "o-spreadsheet-Icon.EXCHANGE",
        execute: this.props.flipAxis,
      },
      {
        name: _t("Duplicate"),
        icon: "o-spreadsheet-Icon.COPY",
        execute: () => this.duplicatePivot(),
      },
      {
        name: _t("Delete"),
        icon: "o-spreadsheet-Icon.TRASH",
        execute: () => this.delete(),
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
    const newPivotId = this.env.model.uuidGenerator.uuidv4();
    const newSheetId = this.env.model.uuidGenerator.uuidv4();
    const result = this.env.model.dispatch("DUPLICATE_PIVOT_IN_NEW_SHEET", {
      pivotId: this.props.pivotId,
      newPivotId,
      newSheetId,
    });
    const text = result.isSuccessful ? _t("Pivot duplicated.") : _t("Pivot duplication failed");
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
