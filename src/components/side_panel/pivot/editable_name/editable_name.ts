/** @odoo-module */

import { Component, useState } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../..";

interface Props {
  name: string;
  displayName: string;
  onChanged: (name: string) => void;
}

export class EditableName extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-EditableName";
  static props = {
    name: String,
    displayName: String,
    onChanged: Function,
  };
  private state!: { isEditing: boolean; name: string };

  setup() {
    this.state = useState({
      isEditing: false,
      name: "",
    });
  }

  rename() {
    this.state.isEditing = true;
    this.state.name = this.props.name;
  }

  save() {
    this.props.onChanged(this.state.name.trim());
    this.state.isEditing = false;
  }
}
