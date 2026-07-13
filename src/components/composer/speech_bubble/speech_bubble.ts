import { signal, useEffect, useProps } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";
import { useSpreadsheetRect } from "../../helpers/position_hook";
import { types } from "../../props_validation";

const BUBBLE_ARROW_SIZE = 7;

export class SpeechBubble extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpeechBubble";
  static components = {};

  protected props = useProps({
    content: types.string(),
    anchorRect: types.Rect(),
  });

  private spreadsheetRect = useSpreadsheetRect();
  private bubbleRef = signal<HTMLElement | null>(null);

  setup(): void {
    useEffect(() => {
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
