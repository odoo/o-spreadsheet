import { onWillPatch, signal } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Checkbox } from "../../side_panel/components/checkbox/checkbox";

interface Props {
  value: string;
  isChecked: boolean;
  isSelected: boolean;
  onClick: () => void;
  onMouseMove: () => void;
  scrolledTo: "top" | "bottom" | undefined;
}

export class FilterMenuValueItem extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenuValueItem";
  static components = { Checkbox };
  static props = {
    value: String,
    isChecked: Boolean,
    isSelected: Boolean,
    onMouseMove: Function,
    onClick: Function,
    scrolledTo: { type: String, optional: true },
  };

  itemRef = signal<HTMLElement | null>(null);

  setup() {
    onWillPatch(() => {
      if (this.props.scrolledTo) {
        this.scrollListToSelectedValue();
      }
    });
  }

  private scrollListToSelectedValue() {
    const el = this.itemRef();
    if (!el) {
      return;
    }
    el.scrollIntoView?.({
      block: "nearest",
    });
  }
}
