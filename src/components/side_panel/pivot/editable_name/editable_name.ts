/** @odoo-module */

import { Component, onPatched, useRef, useState } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";

interface Props {
  name: string;
  displayName: string;
  onChanged: (name: string) => void;
}

interface State {
  isEditing: boolean;
  name: string;
}

export class EditableName extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-EditableName";
  static props = {
    name: String,
    displayName: String,
    onChanged: Function,
  };

  private state: State = useState({ isEditing: false, name: "" });
  private inputRef = useRef<HTMLInputElement>("inputRef");
  private editionState: "initializing" | "editing" = "initializing";

  setup() {
    onPatched(() => {
      if (this.state.isEditing && this.editionState === "initializing") {
        this.editionState = "editing";
        this.focusInputAndSelectContent();
      }
    });
  }

  rename() {
    this.state.isEditing = true;
    this.state.name = this.props.name;
    this.editionState = "initializing";
  }

  save() {
    this.props.onChanged(this.state.name.trim());
    this.state.isEditing = false;
    this.editionState = "initializing";
  }

  cancel() {
    this.state.isEditing = false;
    this.editionState = "initializing";
  }

  handleKeyDown(ev: KeyboardEvent) {
    if (!this.state.isEditing) return;

    switch (ev.key) {
      case "Enter":
        this.save();
        break;
      case "Escape":
        this.cancel();
        break;
    }
  }

  private focusInputAndSelectContent() {
    if (this.state.isEditing && this.inputRef.el) {
      const input = this.inputRef.el;
      input.focus();
      input.select();
    }
  }
}
