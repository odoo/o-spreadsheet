import { Component, tags } from "@odoo/owl";
import { GridModel } from "../model/index";
import { SCROLLBAR_WIDTH } from "../constants";
import { Cell } from "../types";
import { SpreadsheetEnv } from "./spreadsheet";
import { Registry } from "../registry";

const { xml, css } = tags;

//------------------------------------------------------------------------------
// Context Menu Registry
//------------------------------------------------------------------------------

export type ContextMenuType = "COLUMN" | "ROW" | "CELL";

export interface ContextMenuItem {
  type: "separator" | "action";
  name: string;
  description: string;
  isEnabled?: (cell: Cell | null) => boolean;
  isVisible?: (type: ContextMenuType) => boolean;
  action: (model: GridModel, subEnv: SpreadsheetEnv) => void;
}

export const contextMenuRegistry = new Registry<ContextMenuItem>()
  .add("cut", {
    type: "action",
    name: "cut",
    description: "Cut",
    action(model) {
      model.dispatch({ type: "CUT", target: model.state.selection.zones });
    }
  })
  .add("copy", {
    type: "action",
    name: "copy",
    description: "Copy",
    action(model) {
      model.dispatch({ type: "COPY", target: model.state.selection.zones });
    }
  })
  .add("paste", {
    type: "action",
    name: "paste",
    description: "Paste",
    action(model) {
      model.dispatch({
        type: "PASTE",
        target: model.state.selection.zones,
        onlyFormat: false
      });
    }
  })
  .add("clear_cell", {
    type: "action",
    name: "clear_cell",
    description: "Clear cell",
    action(model: GridModel) {
      model.dispatch({ type: "SET_VALUE", xc: model.state.activeXc, text: "" });
    },
    isVisible: (type: ContextMenuType): boolean => {
      return type === "CELL";
    },
    isEnabled: (cell: Cell | null) => {
      return Boolean(cell && cell.content);
    }
  })
  .add("conditional_formatting", {
    type: "action",
    name: "conditional_formatting",
    description: "Conditional Format",
    action(model, subEnv: SpreadsheetEnv) {
      subEnv.openSidePanel("ConditionalFormatting");
    }
  });

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
    <div class="o-context-menu" t-att-style="style" tabindex="-1" t-on-blur="trigger('close')">
        <t t-foreach="menuItems" t-as="menuItem" t-key="menuItem.name">
          <t t-set="isEnabled" t-value="!menuItem.isEnabled or menuItem.isEnabled(model.state.selectedCell)"/>
          <div
            t-att-data-name="menuItem.name"
            t-on-click="activateMenu(menuItem.name)"
            class="o-menuitem"
            t-att-class="{disabled: !isEnabled}">
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

      &.disabled {
        color: grey;
      }
    }
  }
`;

interface Props {
  model: GridModel;
  position: { x: number; y: number };
}

export class ContextMenu extends Component<Props, any> {
  static template = TEMPLATE;
  static style = CSS;

  model: GridModel = this.props.model;

  menuItems: ContextMenuItem[] = contextMenuRegistry
    .getAll()
    .filter(item => !item.isVisible || item.isVisible("CELL"));

  mounted() {
    this.el!.focus();
  }

  get style() {
    const { x, y } = this.props.position;
    const width = this.model.state.width;
    const height = this.model.state.height;
    const hAlign = x < width - 220 ? "left" : "right";
    const hStyle = hAlign + ":" + (hAlign === "left" ? x : width - x + SCROLLBAR_WIDTH);
    const vAlign = y < height - 220 ? "top" : "bottom";
    const vStyle = vAlign + ":" + (vAlign === "top" ? y : height - y);
    return `${vStyle}px;${hStyle}px`;
  }

  activateMenu(name: string) {
    const menu = this.menuItems.find(m => m.name === name);
    if (menu && (!menu.isEnabled || menu.isEnabled(this.model.state.selectedCell))) {
      menu.action(this.model, this.env.spreadsheet);
    }
  }
}
