import { Component, tags, hooks } from "@odoo/owl";
import { SpreadsheetEnv } from "../types";
import { FullMenuItem } from "../registries";
import { Menu, MenuPosition } from "./menu";
import { isChildEvent } from "./helpers/dom_helpers";

const { xml, css } = tags;
const { useState, useExternalListener, useRef } = hooks;

const TEMPLATE = xml/* xml */ `
  <div class="o-dropdown-menu">
    <t t-slot="default"/>
    <Menu t-ref="menu"
          t-if="state.isOpen"
          isOpen="state.isOpen"
          position="position"
          t-on-menu-item-clicked="state.isOpen=false"
          menuItems="props.menuItems()"/>
  </div>
`;

const CSS = css/*scss*/ ``;

interface Props {
  menuItems: () => FullMenuItem[];
  rightClick: boolean;
}

export class DropdownMenu extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { Menu };
  static defaultProps: Partial<Props> = {
    rightClick: false,
  };
  state = useState({
    isOpen: false,
  });
  private menuRef = useRef("menu");

  constructor() {
    super(...arguments);
    useExternalListener(window as any, "click", this.onClick, { capture: true });
  }

  get position(): MenuPosition {
    if (!this.state.isOpen || !this.el) {
      return {
        x: 0,
        y: 0,
        height: 0,
        width: 0,
      };
    }
    return {
      x: this.el.offsetLeft,
      y: this.el.offsetTop,
      height: 400, // ?
      width: 800, // ?
    };
  }

  private onClick(ev: MouseEvent) {
    if (this.state.isOpen && isChildEvent(this.menuRef.el!, ev)) {
      return;
    } else if (isChildEvent(this.el!, ev)) {
      this.state.isOpen = !this.state.isOpen;
      console.log("cvlick", this.state.isOpen);
    } else {
      this.state.isOpen = false;
    }
  }
}
