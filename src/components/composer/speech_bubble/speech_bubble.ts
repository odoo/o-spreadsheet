import { signal, useProps } from "@odoo/owl";
import { useLayoutEffect } from "../../../owl3_compatibility_layer";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";
import { useSpreadsheetRect } from "../../helpers/position_hook";
import { OSComponent } from "../../os_component";
import { types } from "../../props_validation";

const BUBBLE_ARROW_SIZE = 7;

export class SpeechBubble extends OSComponent {
  static template = "o-spreadsheet-SpeechBubble";
  static components = {};

  protected props = useProps({
    content: types.string(),
    anchorRect: types.Rect(),
  });

  private spreadsheetRect = useSpreadsheetRect();
  private bubbleRef = signal.ref();

  setup(): void {
    useLayoutEffect(() => {
      const el = this.bubbleRef();
      if (!el) {
        return;
      }
      const anchorRect = this.props.anchorRect;
      const rect = getBoundingRectAsPOJO(el);
      const x = anchorRect.x + anchorRect.width / 2 - rect.width / 2 - this.spreadsheetRect.x;
      const y = anchorRect.y - rect.height - BUBBLE_ARROW_SIZE - this.spreadsheetRect.y;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    });
  }
}
