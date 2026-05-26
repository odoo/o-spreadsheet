import { onWillPatch, props, signal, types } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Checkbox } from "../../side_panel/components/checkbox/checkbox";

export class FilterMenuValueItem extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenuValueItem";
  static components = { Checkbox };

  protected props = props({
    value: types.string(),
    isChecked: types.boolean(),
    isSelected: types.boolean(),
    onMouseMove: types.function([]),
    onClick: types.function([]),
    "scrolledTo?": types.or([types.literal("top"), types.literal("bottom")]),
  });

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
