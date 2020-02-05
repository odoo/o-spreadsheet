import { Component, tags } from "@odoo/owl";
import { GridModel } from "../model/index";
import { SCROLLBAR_WIDTH } from "../constants";

const { xml, css } = tags;

const TEMPLATE = xml/* xml */ `
    <div class="o-context-menu" t-att-style="style" tabindex="-1" t-on-blur="trigger('close')">
        <t t-foreach="menuItems" t-as="menuItem" t-key="menuItem.name">
          <div
            t-att-data-name="menuItem.name"
            t-on-click="activateMenu(menuItem.name)"
            class="o-menuitem">
              <t t-esc="menuItem.description"/>
          </div>
        </t>
    </div>`;

const CSS = css/* scss */ `
  .o-context-menu {
    position: absolute;
    width: 180px;
    background-color: white;
    box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
    font-size: 14px;
    &:focus {
      outline: none;
    }
    .o-menuitem {
      padding: 10px 25px;
      cursor: pointer;

      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }
  }
`;

interface MenuItem {
  type: "separator" | "action";
  name: string;
  description: string;
  action: (model: GridModel) => void;
}

export const menuItems: MenuItem[] = [
  {
    type: "action",
    name: "cut",
    description: "Cut",
    action(model) {
      model.cut();
    }
  },
  {
    type: "action",
    name: "copy",
    description: "Copy",
    action(model) {
      model.copy();
    }
  },
  {
    type: "action",
    name: "paste",
    description: "Paste",
    action(model) {
      model.paste();
    }
  }
];

export class ContextMenu extends Component<any, any> {
  static template = TEMPLATE;
  static style = CSS;

  model: GridModel = this.props.model;

  menuItems: MenuItem[] = menuItems;

  mounted() {
    this.el!.focus();
  }

  get style() {
    const { x, y } = this.props.position;
    const width = this.model.state.clientWidth;
    const height = this.model.state.clientHeight;
    const hAlign = x < width - 220 ? "left" : "right";
    const hStyle = hAlign + ":" + (hAlign === "left" ? x : width - x + SCROLLBAR_WIDTH);
    const vAlign = y < height - 220 ? "top" : "bottom";
    const vStyle = vAlign + ":" + (vAlign === "top" ? y : height - y);
    return `${vStyle}px;${hStyle}px`;
  }

  activateMenu(name) {
    const menu = this.menuItems.find(m => m.name === name);
    if (menu) {
      menu.action(this.model);
    }
  }
}
