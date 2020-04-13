import { Component, tags } from "@odoo/owl";
import { Model } from "../../model";
import {
  ContextMenuType,
  ContextMenuItem,
  contextMenuRegistry,
  ActionContextMenuItem
} from "./context_menu_registry";

const { xml, css } = tags;

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
    <div class="o-context-menu" t-att-style="style" tabindex="-1" t-on-blur="trigger('close')">
        <t t-foreach="menuItems" t-as="menuItem" t-key="menuItem.name">
          <t t-set="isEnabled" t-value="!menuItem.isEnabled or menuItem.isEnabled(model.getters.getActiveCell())"/>
          <div
            t-if="menuItem.type === 'action'"
            t-att-data-name="menuItem.name"
            t-on-click="activateMenu(menuItem)"
            class="o-menuitem"
            t-att-class="{disabled: !isEnabled}">
              <t t-esc="menuItem.description"/>
          </div>
          <div t-else="" class="o-menuitem separator" />
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

      &.disabled {
        color: grey;
      }

      &.separator {
        height: 1px;
        background-color: rgba(0, 0, 0, 0.12);
        margin: 0 8px;
        padding: 0;
      }
    }
  }
`;

interface Props {
  model: Model;
  position: { x: number; y: number; width: number; height: number };
  type: ContextMenuType;
}

export class ContextMenu extends Component<Props, any> {
  static template = TEMPLATE;
  static style = CSS;

  model: Model = this.props.model;

  mounted() {
    this.el!.focus();
  }

  get menuItems(): ContextMenuItem[] {
    return contextMenuRegistry
      .getAll()
      .filter(item => !item.isVisible || item.isVisible(this.props.type));
  }

  get style() {
    const { x, y, width, height } = this.props.position;
    const hAlign = x < width - 220 ? "left" : "right";
    const hStyle = hAlign + ":" + (hAlign === "left" ? x : width - x);
    const vAlign = y < height - 220 ? "top" : "bottom";
    const vStyle = vAlign + ":" + (vAlign === "top" ? y : height - y);
    return `${vStyle}px;${hStyle}px`;
  }

  activateMenu(menu: ActionContextMenuItem) {
    if (!menu.isEnabled || menu.isEnabled(this.model.getters.getActiveCell())) {
      menu.action(this.model, this.env.spreadsheet);
    }
  }
}
