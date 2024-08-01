import { Component, onWillUpdateProps } from "@odoo/owl";
import type { ActionSpec } from "../../actions/action";
import { createAction } from "../../actions/action";
import type { SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss } from "../helpers";

css/* scss */ `
  .o-menu-item-button {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 2px;
    border-radius: 2px;
    min-width: 20px;
  }
  .o-disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

interface Props {
  action: ActionSpec;
  hasTriangleDownIcon?: boolean;
  selectedColor?: string;
  class?: string;
  onClick?: (ev: MouseEvent) => void;
}

export class ActionButton extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ActionButton";

  private actionButton = createAction(this.props.action);

  setup() {
    onWillUpdateProps((nextProps) => {
      if (nextProps.action !== this.props.action) {
        this.actionButton = createAction(this.props.action);
      }
    });
  }

  get isVisible() {
    return this.actionButton.isVisible(this.env);
  }

  get isEnabled() {
    return this.actionButton.isEnabled(this.env);
  }

  get isActive() {
    return this.actionButton.isActive?.(this.env);
  }

  get title() {
    const name = this.actionButton.name(this.env);
    const description = this.actionButton.description(this.env);
    return name + (description ? ` (${description})` : "");
  }

  get iconTitle() {
    return this.actionButton.icon(this.env);
  }

  onClick(ev: MouseEvent) {
    if (this.isEnabled) {
      this.props.onClick?.(ev);
      this.actionButton.execute?.(this.env);
    }
  }

  get buttonStyle() {
    if (this.props.selectedColor) {
      return cssPropertiesToCss({
        "border-bottom": `4px solid ${this.props.selectedColor}`,
        height: "16px",
        "margin-top": "2px",
      });
    }
    return "";
  }
}
ActionButton.props = {
  action: Object,
  hasTriangleDownIcon: { type: Boolean, optional: true },
  selectedColor: { type: String, optional: true },
  class: { type: String, optional: true },
  onClick: { type: Function, optional: true },
};
