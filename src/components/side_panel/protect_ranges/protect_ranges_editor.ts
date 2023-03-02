import { Component, useState } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../types";
import { SelectionInput } from "../../selection_input/selection_input";

interface State {
  type: "range" | "sheet";
}

interface Props {}

export class ProtectRangesEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ProtectRangesEditor";
  static components = { SelectionInput };

  private state!: State;

  setup() {
    this.state = useState({ type: "range" });
  }
}

ProtectRangesEditor.props = {};
