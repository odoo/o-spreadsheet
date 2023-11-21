import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../types";

interface Props {
  class?: string;
}

export class PaintFormatButton extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PaintFormatButton";
  static props = {
    class: { type: String, optional: true },
  };

  get isActive() {
    return this.env.model.getters.isPaintingFormat();
  }

  onDblClick() {
    this.env.model.dispatch("ACTIVATE_PAINT_FORMAT", { persistent: true });
  }

  togglePaintFormat() {
    if (this.isActive) {
      this.env.model.dispatch("CANCEL_PAINT_FORMAT");
    } else {
      this.env.model.dispatch("ACTIVATE_PAINT_FORMAT", { persistent: false });
    }
  }
}
