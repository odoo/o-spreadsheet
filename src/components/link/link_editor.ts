import * as owl from "@odoo/owl";
import { MENU_WIDTH } from "../../constants";
import { buildSheetLink, hasLink, markdownLink } from "../../helpers";
import { linkMenuRegistry } from "../../registries/menus/link_menu_registry";
import { Coordinates, Link, Position, Sheet, SpreadsheetEnv } from "../../types";
import { menuComponentHeight } from "../helpers/menu";
import { usePositionInGrid } from "../helpers/position_hook";
import { Popover } from "../popover";
import { LIST } from "./../icons";
import { Menu } from "./../menu";
import { LinkEditorTerms } from "./../side_panel/translations_terms";
const { Component, tags, hooks, useState } = owl;
const { xml, css } = tags;
const { useRef } = hooks;

const WIDTH = 320;
const HEIGHT = 160;
const PADDING = 10;

const TEMPLATE = xml/* xml */ `
    <div class="o-link-editor" t-on-click.stop="" t-on-keydown.stop="onKeyDown">
      <div class="o-section">
        <div t-esc="env._t('${LinkEditorTerms.Text}')" class="o-section-title"/>
        <div class="d-flex">
          <input type="text" class="o-input flex-grow-1" t-model="state.link.label"></input>
        </div>

        <div t-esc="env._t('${LinkEditorTerms.Link}')" class="o-section-title mt-3"/>
        <div class="o-input-button-inside">
          <t t-if="state.isUrlEditable">
            <input type="text" t-ref="urlInput" class="o-input-inside" t-model="state.link.url"></input>
          </t>
          <t t-else="">
            <input type="text" t-att-value="state.urlRepresentation" class="o-input-inside" disabled="1"></input>
          </t>
          <button t-if="state.link.url" class="o-button-inside" t-on-click="removeLink">
            ✖
          </button>
          <button t-if="!state.link.url" class="o-button-inside" t-on-click="openMenu">
            ${LIST}
          </button>
        </div>
      </div>
      <Popover
        t-if="menuState.isOpen"
        position="menuPosition"
        childWidth="${MENU_WIDTH}"
        childHeight="menuComponentHeight"
      >
        <Menu
          menuItems="menuItems"
          t-on-menu-clicked="onSpecialLink"
          t-on-close.stop="menuState.isOpen=false"/>
      </Popover>
      <div class="o-buttons">
        <button t-on-click="cancel" class="o-button" t-esc="env._t('${LinkEditorTerms.Cancel}')"></button>
        <button t-on-click="save" t-att-disabled="!state.link.url" class="o-button" t-esc="env._t('${LinkEditorTerms.Confirm}')"></button>
      </div>
    </div>`;

const CSS = css/* scss */ `
  .o-link-editor {
    font-size: 13px;
    background-color: white;
    box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
    margin: 2px 10px 2px 10px;
    padding: ${PADDING};
    display: flex;
    flex-direction: column;
    .o-section {
      .o-section-title {
        font-weight: bold;
        color: dimgrey;
        margin-bottom: 5px;
      }
    }
    .o-buttons {
      padding-left: 16px;
      padding-top: 16px;
      padding-bottom: 16px;
      text-align: right;
      .o-button {
        border: 1px solid lightgrey;
        padding: 0px 20px 0px 20px;
        border-radius: 4px;
        font-weight: 500;
        font-size: 14px;
        height: 30px;
        line-height: 16px;
        background: white;
        margin-right: 8px;
        &:hover:enabled {
          background-color: rgba(0, 0, 0, 0.08);
        }
      }
      .o-button:enabled {
        cursor: pointer;
      }
      .o-button:last-child {
        margin-right: 0px;
      }
    }
    .o-input-button-inside {
      position: relative;
      border: 1px solid lightgrey;
      border-radius: 4px;
      flex-grow: 1;
      .o-input-inside {
        box-sizing: border-box;
        width: 100%;
        border-radius: 4px;
        padding: 4px 23px 4px 10px;
        border: none;
        height: 24px;
      }
      .o-button-inside {
        position: absolute;
        right: 0px;
        top: 0px;
        border: none;
        height: 20px;
        width: 20px;
        background-color: #fff;
        margin: 1px;
        padding: 1px;
      }
      .o-button-inside:hover {
        cursor: pointer;
      }
    }
  }
`;

export interface LinkEditorProps {
  position: Position;
}

interface State {
  link: Link;
  urlRepresentation: string;
  isUrlEditable: boolean;
}

export class LinkEditor extends Component<LinkEditorProps, SpreadsheetEnv> {
  static template = TEMPLATE;
  static components = { Menu, Popover };
  static style = CSS;
  private getters = this.env.getters;
  private state: State = useState(this.defaultState);
  private menus = linkMenuRegistry;
  private menuState: { isOpen: boolean } = useState({
    isOpen: false,
  });
  private position = usePositionInGrid();
  urlInput = useRef("urlInput");

  mounted() {
    this.urlInput.el?.focus();
  }

  get defaultState(): State {
    const { col, row } = this.props.position;
    const sheetId = this.getters.getActiveSheetId();
    const cell = this.getters.getCell(sheetId, col, row);
    if (hasLink(cell)) {
      return {
        link: { url: cell.link.url, label: cell.formattedValue },
        urlRepresentation: cell.urlRepresentation,
        isUrlEditable: cell.isUrlEditable,
      };
    }
    return {
      link: { url: "", label: cell?.formattedValue || "" },
      isUrlEditable: true,
      urlRepresentation: "",
    };
  }

  get menuPosition(): Coordinates {
    return {
      x: this.position.x + WIDTH - PADDING - 2,
      y: this.position.y + HEIGHT - 37, // 37 = Height of confirm/cancel buttons
    };
  }

  get menuItems() {
    return this.menus.getAll();
  }

  get menuComponentHeight(): number {
    return menuComponentHeight(this.menuItems);
  }

  onSpecialLink(ev: CustomEvent<State>) {
    const { detail } = ev;
    this.state.link = detail.link;
    this.state.isUrlEditable = detail.isUrlEditable;
    this.state.urlRepresentation = detail.urlRepresentation;
  }

  selectSheet(sheet: Sheet) {
    this.state.link.url = buildSheetLink(sheet.id);
    this.state.link.label = sheet.name;
  }

  openMenu() {
    this.menuState.isOpen = true;
  }

  removeLink() {
    this.state.link.url = "";
    this.state.urlRepresentation = "";
    this.state.isUrlEditable = true;
  }

  save() {
    const { col, row } = this.props.position;
    const label = this.state.link.label || this.state.link.url;
    this.env.dispatch("UPDATE_CELL", {
      col: col,
      row: row,
      sheetId: this.getters.getActiveSheetId(),
      content: markdownLink(label, this.state.link.url),
    });
    this.trigger("close-link-editor");
  }

  cancel() {
    this.trigger("close-link-editor");
  }

  onKeyDown(ev: KeyboardEvent) {
    switch (ev.key) {
      case "Enter":
        this.save();
        break;
      case "Escape":
        this.cancel();
        break;
    }
  }
}
