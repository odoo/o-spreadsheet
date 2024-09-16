import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { deepCopy, deepEquals } from "../../../helpers";
import { CellProtectionRule, SpreadsheetChildEnv, UID } from "../../../types";
import { CellProtectionTerms } from "../../translations_terms";
import { BadgeSelection } from "../components/badge_selection/badge_selection";
import { Section } from "../components/section/section";
import { CellProtectionEditor } from "./cp_editor/cp_editor";
import { CellProtectionPreview } from "./cp_preview/cp_preview";

interface Props {
  onCloseSidePanel: () => void;
  rule?: CellProtectionRule;
}

interface State {
  mode: "list" | "edit";
  activeRule: CellProtectionRule | undefined;
}

export class CellProtectionPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CellProtectionPanel";
  static props = {
    onCloseSidePanel: Function,
    rule: { type: Object, optional: true },
  };
  static components = { CellProtectionEditor, CellProtectionPreview, BadgeSelection, Section };

  state = useState<State>({
    mode: this.props.rule ? "edit" : "list",
    activeRule: deepCopy(this.props.rule),
  });

  setup() {
    onWillUpdateProps((nextProps) => {
      if (!deepEquals(nextProps.rule, this.props.rule)) {
        this.state.mode = "edit";
        this.state.activeRule = deepCopy(nextProps.rule);
      }
    });
  }

  addCellProtectionRule() {
    this.state.mode = "edit";
    this.state.activeRule = undefined;
  }

  onExitEditMode() {
    this.state.mode = "list";
    this.state.activeRule = undefined;
  }

  onPreviewClick(id: UID) {
    const rule = this.env.model.getters.getCellProtectionRuleById(id);
    if (rule) {
      this.state.mode = "edit";
      this.state.activeRule = rule;
    }
  }

  getCheckboxLabel(attName: string): string {
    return CellProtectionTerms.Checkboxes[attName];
  }

  get cpRules() {
    return this.env.model.getters.getCellProtectionRules();
  }
}
