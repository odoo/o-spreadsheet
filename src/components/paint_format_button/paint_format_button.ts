import { useStore } from "../../store_engine/store_hooks";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { PaintFormatStore } from "./paint_format_store";

import { useProps } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { LockSheetStore } from "../../stores/lock_sheet_store";
import { types } from "../props_validation";
export class PaintFormatButton extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PaintFormatButton";

  protected props = useProps({
    class: types.string().optional(),
  });

  private paintFormatStore!: Store<PaintFormatStore>;
  lockSheetStore!: Store<LockSheetStore>;

  setup() {
    this.paintFormatStore = useStore(PaintFormatStore);
    this.lockSheetStore = useStore(LockSheetStore);
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
