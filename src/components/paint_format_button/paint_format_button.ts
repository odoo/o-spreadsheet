import { OSComponent } from "../os_component";
import { PaintFormatPlugin } from "./paint_format_store";

import { usePlugin, useProps } from "@odoo/owl";
import { types } from "../props_validation";
export class PaintFormatButton extends OSComponent {
  static template = "o-spreadsheet-PaintFormatButton";

  protected props = useProps({
    class: types.string().optional(),
  });

  private paintFormatPlugin = usePlugin(PaintFormatPlugin);

  get isActive() {
    return this.paintFormatPlugin.isActive();
  }

  onDblClick() {
    this.paintFormatPlugin.activate({ persistent: true });
  }

  togglePaintFormat() {
    if (this.isActive) {
      this.paintFormatPlugin.cancel();
    } else {
      this.paintFormatPlugin.activate({ persistent: false });
    }
  }
}
