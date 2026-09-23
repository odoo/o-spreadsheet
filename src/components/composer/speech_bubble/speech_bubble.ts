import { signal, useEffect, usePlugin, useProps } from "@odoo/owl";
import { SpreadsheetRectPlugin } from "../../../owl_plugins/spreadsheet_rect_plugin";
import { useElementRect } from "../../helpers/position_hook";
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

  private spreadsheetRect = usePlugin(SpreadsheetRectPlugin);
  private bubbleRef = signal.ref();
  private bubbleDimensions = useElementRect(this.bubbleRef);

  setup(): void {
    useEffect(() => {
      const el = this.bubbleRef();
      if (!el) {
        return;
      }
      const anchorRect = this.props.anchorRect;
      const spreadsheetRect = this.spreadsheetRect.rect();
      const rect = this.bubbleDimensions();
      const x = anchorRect.x + anchorRect.width / 2 - rect.width / 2 - spreadsheetRect.x;
      const y = anchorRect.y - rect.height - BUBBLE_ARROW_SIZE - spreadsheetRect.y;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    });
  }
}
