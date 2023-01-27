import { Component, onWillUpdateProps } from "@odoo/owl";
import { createMenuItem, MenuItemSpec } from "../../registries/menu_items_registry";
import { SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss } from "../helpers";

css/* scss */ `
  .o-menu-item-button {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 2px;
    padding: 0px 3px;
    border-radius: 2px;
    min-width: 20px;
  }
  .o-disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

interface Props {
  menuItemSpec: MenuItemSpec;
  hasTriangleDownIcon?: boolean;
  selectedColor?: string;
  class?: string;
  onClick?: (ev: MouseEvent) => void;
}

export class MenuItemButton extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-MenuItemButton";

  private menuItem = createMenuItem(this.props.menuItemSpec);

  setup() {
    onWillUpdateProps(() => (this.menuItem = createMenuItem(this.props.menuItemSpec)));
  }

  get isVisible() {
    return this.menuItem.isVisible(this.env);
  }

  get isEnabled() {
    return this.menuItem.isEnabled(this.env);
  }

  get isActive() {
    return this.menuItem.isActive?.(this.env);
  }

  get title() {
    const name = this.menuItem.name(this.env);
    const description = this.menuItem.description;
    return name + (description ? ` (${description})` : "");
  }

  get iconTitle() {
    return this.menuItem.icon;
  }

  onClick(ev: MouseEvent) {
    if (this.isEnabled) {
      this.props.onClick?.(ev);
      this.menuItem.action?.(this.env);
    }
  }

  get menuItemStyle() {
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
