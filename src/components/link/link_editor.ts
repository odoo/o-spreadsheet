import * as owl from "@odoo/owl";
import { BOTTOMBAR_HEIGHT, SCROLLBAR_WIDTH, TOPBAR_HEIGHT } from "../../constants";
import { hasLink } from "../../helpers";
import { linkMenuRegistry } from "../../registries/menus/link_menu_registry";
import { Link, MenuPosition, Position, Sheet, SpreadsheetEnv } from "../../types";
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
    <div class="o-link-editor" t-att-style="style" t-on-click.stop="">
      <div class="o-section">
        <div t-esc="env._t('${LinkEditorTerms.Label}')" class="o-section-title"/>
        <div class="d-flex">
          <input type="text" class="o-input flex-grow-1" t-model="linkEditorState.link.label"></input>
        </div>

        <div t-esc="env._t('${LinkEditorTerms.Link}')" class="o-section-title mt-3"/>
        <div class="o-input-button-inside">
          <input type="text" t-ref="urlInput" class="o-input-inside" t-model="linkEditorState.link.url"></input>
          <button t-if="linkEditorState.link.url" class="o-button-inside" t-on-click="removeLink">
            x
          </button>
          <button t-if="!linkEditorState.link.url" class="o-button-inside" t-ref="menuButton" t-on-click="openMenu">
            ${LIST}
          </button>
        </div>
      </div>
      <Menu t-if="menuState.isOpen"
        menuItems="menuItems"
        position="menuPosition"
        t-on-close.stop="menuState.isOpen=false"/>
      <div class="o-buttons">
        <button t-on-click="cancel" class="o-button" t-esc="env._t('${LinkEditorTerms.Cancel}')"></button>
        <button t-on-click="save" t-att-disabled="!linkEditorState.link.url" class="o-button" t-esc="env._t('${LinkEditorTerms.Confirm}')"></button>
      </div>
    </div>`;

const CSS = css/* scss */ `
  .o-link-editor {
    position: absolute;
    font-size: 13px;
    width: ${WIDTH};
    height: ${HEIGHT};
    background-color: white;
    box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
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

interface LinkEditorState {
  link: Link;
  position: Position;
}

export class LinkEditor extends Component<LinkEditorProps, SpreadsheetEnv> {
  static template = TEMPLATE;
  static components = { Menu };
  static style = CSS;
  private getters = this.env.getters;
  private linkEditorState: LinkEditorState = useState({
    link: this.link,
    position: this.props.position,
  });
  private menus = linkMenuRegistry;
  private menuState: { isOpen: boolean } = useState({
    isOpen: false,
  });
  menuButton = useRef("menuButton");
  urlInput = useRef("urlInput");

  mounted() {
    this.urlInput.el!.focus();
  }

  get link(): Link {
    const { col, row } = this.props.position;
    const sheetId = this.getters.getActiveSheetId();
    const cell = this.getters.getCell(sheetId, col, row);
    if (hasLink(cell)) {
      return { url: cell.link.url, label: cell.formattedValue };
    }
    return { url: "", label: "" };
  }

  get menuItems() {
    const sheets = this.env.getters.getSheets();
    this.menus.removeChildren(this.menus.content["sheet"]);
    sheets.forEach((sheet, i) => {
      this.menus.addChild(sheet.name, ["sheet"], {
        name: sheet.name,
        sequence: i,
        action: () => this.selectSheet(sheet),
      });
    });
    return this.menus.getAll();
  }

  selectSheet(sheet: Sheet) {
    console.log(sheet.name);
  }

  openMenu() {
    this.menuState.isOpen = true;
  }

  get style() {
    const { col, row } = this.props.position;
    const [leftCol, bottomRow] = this.getters.getBottomLeftCell(
      this.getters.getActiveSheetId(),
      col,
      row
    );
    const viewport = this.getters.getActiveSnappedViewport();
    const { width: viewportWidth, height: viewportHeight } = this.getters.getViewportDimension();
    const [x, y, width, height] = this.getters.getRect(
      { left: leftCol, top: bottomRow, right: leftCol, bottom: bottomRow },
      viewport
    );
    const hAlign = x + WIDTH + 30 < viewportWidth ? "left" : "right";
    const hOffset =
      hAlign === "left" ? x + 1 : viewportWidth - x + (SCROLLBAR_WIDTH + 2) - width + 1;
    let vAlign = y + HEIGHT + height + 20 < viewportHeight ? "top" : "bottom";
    const vOffset =
      vAlign === "top"
        ? y + height + TOPBAR_HEIGHT + 2
        : viewportHeight - y + (SCROLLBAR_WIDTH + 2) + 2 + BOTTOMBAR_HEIGHT;
    return `${hAlign}:${hOffset}px;${vAlign}:${vOffset}px`;
  }

  get menuPosition(): MenuPosition {
    return {
      x: WIDTH - PADDING - 2,
      y: HEIGHT - 37, // 37 = Height of confirm/cancel buttons
      offsetLeft: this.el!.offsetLeft,
      offsetTop: this.el!.offsetTop,
      width: this.el!.parentElement!.clientWidth,
      height: this.el!.parentElement!.clientHeight - BOTTOMBAR_HEIGHT - TOPBAR_HEIGHT,
    };
  }

  removeLink() {
    this.linkEditorState.link.url = "";
  }

  save() {
    const { col, row } = this.props.position;
    const label = this.linkEditorState.link.label || this.linkEditorState.link.url;
    this.env.dispatch("UPDATE_CELL", {
      col: col,
      row: row,
      sheetId: this.getters.getActiveSheetId(),
      content: `[${label}](${this.linkEditorState.link.url})`,
    });
    this.trigger("close-link-editor");
  }

  cancel() {
    this.trigger("close-link-editor");
  }
}
