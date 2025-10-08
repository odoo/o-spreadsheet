import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheetChildEnv";
import { Component, useState } from "@odoo/owl";
import { FunctionDescription } from "../../../types";
import { Collapse } from "../../side_panel/components/collapse/collapse";

interface Props {
  functionDescription: FunctionDescription;
  argsToFocus: number[];
}

export class FunctionDescriptionProvider extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FunctionDescriptionProvider";
  static props = {
    functionDescription: Object,
    argsToFocus: Array,
  };
  static components = { Collapse };

  private state: { isCollapsed: boolean } = useState({
    isCollapsed: true,
  });

  toggle() {
    this.state.isCollapsed = !this.state.isCollapsed;
  }

  getContext(): Props {
    return this.props;
  }

  get formulaArgSeparator() {
    return this.env.model.getters.getLocale().formulaArgSeparator + " ";
  }
}
