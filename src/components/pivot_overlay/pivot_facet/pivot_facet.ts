import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";

interface Props {
  icon: "group" | "measure" | "add";
  label: string;
  name?: string;
  class?: string;
  onClickIcon: () => void;
  onClickRemove?: () => void;
}

export class PivotFacet extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotFacet";
  static props = {
    icon: String,
    label: String,
    name: { type: String, optional: true },
    class: { type: String, optional: true },
    onClickIcon: Function,
    onClickRemove: { type: Function, optional: true },
    disableHover: { type: Boolean, optional: true },
  };

  get icon() {
    if (this.props.icon === "add") {
      return "o-spreadsheet-Icon.PLUS";
    }
    return "o-spreadsheet-Icon.PIVOT_GROUP";
  }
}
