import { props } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { useModel } from "../owl_plugins/model_plugin";
import { types } from "../props_validation";
import { PaintFormatStore } from "./paint_format_store";
export class PaintFormatButton extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PaintFormatButton";

  protected props = props({
    "class?": types.string(),
  });

  protected model = useModel();
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
