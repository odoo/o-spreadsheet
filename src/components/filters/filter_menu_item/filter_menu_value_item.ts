import { onWillPatch, signal, useProps } from "@odoo/owl";
import { types } from "../../props_validation";
import { Checkbox } from "../../side_panel/components/checkbox/checkbox";
import { SpreadsheetComponent } from "../../spreadsheet/spreadsheet_component";

export class FilterMenuValueItem extends SpreadsheetComponent {
  static template = "o-spreadsheet-FilterMenuValueItem";
  static components = { Checkbox };

  protected props = useProps({
    value: types.string(),
    isChecked: types.boolean(),
    isSelected: types.boolean(),
    onMouseMove: types.function<(ev: MouseEvent) => void>(),
    onClick: types.function<(ev: MouseEvent) => void>(),
    scrolledTo: types.or([types.literal("top"), types.literal("bottom")]).optional(),
  });

  itemRef = signal.ref();

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
