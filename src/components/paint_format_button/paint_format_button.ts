import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheetChildEnv";
import { Component } from "@odoo/owl";
import { Store, useStore } from "../../store_engine";
import { PaintFormatStore } from "./paint_format_store";

interface Props {
  class?: string;
}

export class PaintFormatButton extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PaintFormatButton";
  static props = {
    class: { type: String, optional: true },
  };

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
