import * as owl from "@odoo/owl";
import { BACKGROUND_GRAY_COLOR, BOTTOMBAR_HEIGHT, HEADER_WIDTH } from "../constants";
import { SpreadsheetEnv } from "../types";
import { PLUS } from "./icons";
import { MenuState, Menu } from "./menu";
import { sheetMenuRegistry } from "../registries/index";
import { uuidv4 } from "../helpers/index";
const { Component } = owl;
const { xml, css } = owl.tags;
const { useState } = owl.hooks;

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet-bottom-bar">
    <span class="o-add-sheet" t-on-click="addSheet">${PLUS}</span>
    <t t-foreach="getters.getSheets()" t-as="sheet" t-key="sheet.id">
      <span class="o-sheet" t-on-click="activateSheet(sheet.id)"
            t-on-contextmenu.prevent="onContextMenu(sheet.id)"
            t-att-class="{active: sheet.id === getters.getActiveSheet()}">
        <t t-esc="sheet.name"/>
      </span>
    </t>
    <t t-set="aggregate" t-value="getters.getAggregate()"/>
    <t t-if="aggregate !== null">
      <span class="o-space"/>
      <span class="o-aggregate">Sum: <t t-esc="aggregate"/></span>
    </t>
    <Menu t-if="menuState.isOpen"
          position="menuState.position"
          menuItems="menuState.menuItems"
          t-on-close="menuState.isOpen=false"/>
  </div>`;

const CSS = css/* scss */ `
  .o-spreadsheet-bottom-bar {
    background-color: ${BACKGROUND_GRAY_COLOR};
    padding-left: ${HEADER_WIDTH}px;
    display: flex;
    align-items: center;
    font-size: 15px;
    border-top: 1px solid lightgrey;

    .o-space {
      flex-grow: 1;
    }

    .o-add-sheet,
    .o-sheet {
      padding: 5px;
      display: inline-block;
      cursor: pointer;
      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }
    .o-add-sheet {
      margin-right: 5px;
    }

    .o-sheet {
      color: #666;
      padding: 0 15px;
      height: ${BOTTOMBAR_HEIGHT}px;
      line-height: ${BOTTOMBAR_HEIGHT}px;

      &.active {
        color: #484;
        background-color: white;
        box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
      }
    }

    .o-aggregate {
      background-color: white;
      font-size: 14px;
      margin-right: 20px;
      padding: 4px 8px;
      color: #333;
      border-radius: 3px;
      box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
    }
    .fade-enter-active {
      transition: opacity 0.5s;
    }

    .fade-enter {
      opacity: 0;
    }
  }
`;

export class BottomBar extends Component<{}, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { Menu };

  getters = this.env.getters;
  menuState: MenuState = useState({ isOpen: false, position: null, menuItems: [] });

  addSheet() {
    this.env.dispatch("CREATE_SHEET", { activate: true, id: uuidv4() });
  }

  activateSheet(name: string) {
    this.env.dispatch("ACTIVATE_SHEET", { from: this.getters.getActiveSheet(), to: name });
  }

  onContextMenu(sheet: string, ev: MouseEvent) {
    if (this.getters.getActiveSheet() !== sheet) {
      this.activateSheet(sheet);
    }
    const x = (ev.target as HTMLElement).offsetLeft;
    const y = (ev.target as HTMLElement).offsetTop;
    this.menuState.isOpen = true;
    this.menuState.menuItems = sheetMenuRegistry.getAll();
    this.menuState.position = {
      x,
      y,
      height: 0,
      width: this.el!.clientWidth,
    };
  }
}
