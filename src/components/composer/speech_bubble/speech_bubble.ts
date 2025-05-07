import { Component, useEffect, useRef } from "@odoo/owl";
import { ComponentsImportance } from "../../../constants";
import { Rect, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";
import { useSpreadsheetRect } from "../../helpers/position_hook";

const BUBBLE_ARROW_SIZE = 7;

css/* scss */ `
  .o-spreadsheet {
    .o-speech-bubble {
      background-color: white;
      box-sizing: border-box;
      box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.15);
      border: 1px solid #ccc;
      z-index: ${ComponentsImportance.Popover};

      &::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        background-color: white;
        height: ${BUBBLE_ARROW_SIZE}px;
        width: ${BUBBLE_ARROW_SIZE}px;
        transform-origin: top left;
        transform: translate(0, -67%) rotate(45deg);
        border-right: 1px solid #ccc;
        border-bottom: 1px solid #ccc;
        box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.15);
      }
    }

    .o-speech-content {
      max-width: 300px;
    }
  }
`;

export interface Props {
  anchorRect: Rect;
  content: string;
}

export class SpeechBubble extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpeechBubble";
  static props = { content: String, anchorRect: Object };
  static components = {};

  private spreadsheetRect = useSpreadsheetRect();
  private bubbleRef = useRef("bubble");

  setup(): void {
    useEffect(() => {
      const el = this.bubbleRef.el;
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
