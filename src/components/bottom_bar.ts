import * as owl from "@odoo/owl";
import { BACKGROUND_GRAY_COLOR, BOTTOMBAR_HEIGHT, HEADER_WIDTH } from "../constants";
import { uuidv4 } from "../helpers/index";
import { MenuItemRegistry, sheetMenuRegistry } from "../registries/index";
import { SpreadsheetEnv } from "../types";
import { LIST, PLUS, TRIANGLE_DOWN_ICON } from "./icons";
import { Menu, MenuState } from "./menu";
const Component = owl.Component;
const { xml, css } = owl.tags;
const { useState } = owl.hooks;

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet-bottom-bar">
    <div class="o-sheet-item o-add-sheet" t-on-click="addSheet">${PLUS}</div>
    <div class="o-sheet-item o-list-sheets" t-on-click="listSheets">${LIST}</div>
    <div class="o-all-sheets">
      <t t-foreach="getters.getSheets()" t-as="sheet" t-key="sheet.id">
        <div class="o-sheet-item o-sheet" t-on-click="activateSheet(sheet.id)"
             t-on-contextmenu.prevent="onContextMenu(sheet.id)"
             t-att-title="sheet.name"
             t-att-data-id="sheet.id"
             t-att-class="{active: sheet.id === getters.getActiveSheet()}">
          <span class="o-sheet-name" t-esc="sheet.name" t-on-dblclick="onDblClick(sheet.id)"/>
          <span class="o-sheet-icon" t-on-click.stop="onIconClick(sheet.id)">${TRIANGLE_DOWN_ICON}</span>
        </div>
      </t>
    </div>
    <t t-set="aggregate" t-value="getters.getAggregate()"/>
    <div t-if="aggregate !== null" class="o-aggregate">Sum: <t t-esc="aggregate"/></div>
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
    overflow: hidden;

    .o-add-sheet,
    .o-list-sheets {
      margin-right: 5px;
    }

    .o-sheet-item {
      display: flex;
      align-items: center;
      padding: 5px;
      cursor: pointer;
      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }

    .o-all-sheets {
      display: flex;
      align-items: center;
      max-width: 80%;
      overflow: hidden;
    }

    .o-sheet {
      color: #666;
      padding: 0 15px;
      padding-right: 10px;
      height: ${BOTTOMBAR_HEIGHT}px;
      line-height: ${BOTTOMBAR_HEIGHT}px;
      user-select: none;
      white-space: nowrap;

      &.active {
        color: #484;
        background-color: white;
        box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
      }

      .o-sheet-icon {
        margin-left: 5px;

        &:hover {
          background-color: rgba(0, 0, 0, 0.08);
        }
      }
    }

    .o-aggregate {
      background-color: white;
      margin-left: auto;
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

  mounted() {
    this.focusSheet();
  }

  patched() {
    this.focusSheet();
  }

  focusSheet() {
    const div = this.el!.querySelector(`[data-id="${this.getters.getActiveSheet()}"]`);
    if (div && div.scrollIntoView) {
      div.scrollIntoView();
    }
  }

  addSheet() {
    this.env.dispatch("CREATE_SHEET", { activate: true, id: uuidv4() });
  }

  listSheets(ev: MouseEvent) {
    const registry = new MenuItemRegistry();
    const from = this.getters.getActiveSheet();
    let i = 0;
    for (let sheet of this.getters.getSheets()) {
      registry.add(sheet.id, {
        name: sheet.name,
        sequence: i,
        action: (env) => env.dispatch("ACTIVATE_SHEET", { from, to: sheet.id }),
      });
      i++;
    }
    this.openContextMenu(ev.currentTarget as HTMLElement, registry);
  }

  activateSheet(name: string) {
    this.env.dispatch("ACTIVATE_SHEET", { from: this.getters.getActiveSheet(), to: name });
  }

  onDblClick(sheet: string) {
    this.env.dispatch("RENAME_SHEET", { interactive: true, sheet });
  }

  openContextMenu(target: HTMLElement, registry: MenuItemRegistry) {
    const x = target.offsetLeft;
    const y = target.offsetTop;
    this.menuState.isOpen = true;
    this.menuState.menuItems = registry.getAll().filter((x) => x.isVisible(this.env));
    this.menuState.position = {
      x,
      y,
      height: 400,
      width: this.el!.clientWidth,
    };
  }

  onIconClick(sheet: string, ev: MouseEvent) {
    if (this.getters.getActiveSheet() !== sheet) {
      this.activateSheet(sheet);
    }
    if (this.menuState.isOpen) {
      this.menuState.isOpen = false;
    } else {
      this.openContextMenu(
        (ev.currentTarget as HTMLElement).parentElement as HTMLElement,
        sheetMenuRegistry
      );
    }
  }

  onContextMenu(sheet: string, ev: MouseEvent) {
    if (this.getters.getActiveSheet() !== sheet) {
      this.activateSheet(sheet);
    }
    this.openContextMenu(ev.currentTarget as HTMLElement, sheetMenuRegistry);
  }
}
