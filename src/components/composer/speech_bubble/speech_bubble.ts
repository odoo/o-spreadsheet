import { signal, useEffect } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { Rect } from "../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";
import { useSpreadsheetRect } from "../../helpers/position_hook";

const BUBBLE_ARROW_SIZE = 7;

export interface Props {
  anchorRect: Rect;
  content: string;
}

export class SpeechBubble extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpeechBubble";
  static props = { content: String, anchorRect: Object };
  static components = {};

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
