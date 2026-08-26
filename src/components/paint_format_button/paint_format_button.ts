import { useStore } from "../../store_engine/store_hooks";
import { Store } from "../../types/store_engine";
import { PaintFormatStore } from "./paint_format_store";

import { useProps } from "@odoo/owl";
import { types } from "../props_validation";
import { SpreadsheetComponent } from "../spreadsheet/spreadsheet_component";
export class PaintFormatButton extends SpreadsheetComponent {
  static template = "o-spreadsheet-PaintFormatButton";

  protected props = useProps({
    class: types.string().optional(),
  });

  private paintFormatStore!: Store<PaintFormatStore>;

  setup() {
    this.paintFormatStore = useStore(PaintFormatStore);
  }

  get isActive() {
    return this.paintFormatStore.isActive;
  }

  onDblClick() {
    this.paintFormatStore.activate({ persistent: true });
  }

  togglePaintFormat() {
    if (this.isActive) {
      this.paintFormatStore.cancel();
    } else {
      this.paintFormatStore.activate({ persistent: false });
    }
  }
}
