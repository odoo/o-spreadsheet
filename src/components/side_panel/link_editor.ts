import * as owl from "@odoo/owl";
import { linkMenuRegistry } from "../../registries/menus/link_menu_registry";
import { CellPosition, Link, SpreadsheetEnv } from "../../types";
import { ColorPicker } from "../color_picker";
import { LIST } from "../icons";
import { Menu } from "../menu";
import { LinkEditorTerms } from "./translations_terms";

const { Component, tags, useState } = owl;
const { useRef } = owl.hooks;
const { xml, css } = tags;
const TEMPLATE = xml/* xml */ `
  <div class="o-link">
    <div class="o-section">
      <div t-esc="env._t('${LinkEditorTerms.Label}')" class="o-section-title"/>
      <div class="d-flex">
        <input type="text" class="o-input flex-grow-1" t-model="link.label"></input>
      </div>

      <div t-esc="env._t('${LinkEditorTerms.Link}')" class="o-section-title mt-3"/>
      <div class="o-input-button-inside">
        <input type="text" class="o-input-inside" t-model="link.url"></input>
        <!-- <button class="o-button-inside" t-on-click="removeLink">
          x
        </button> -->
        <button class="o-button-inside" t-ref="menuButton" t-on-click="openMenu">
          ${LIST}
        </button>
      </div>
      <Menu t-if="menuState.isOpen"
        menuItems="menuItems"
        position="menuPosition"
        t-on-close.stop="menuState.isOpen=false"/>
    </div>
    <div class="o-sidePanelButtons">
        <button t-on-click="save" class="o-sidePanelButton" t-esc="env._t('${LinkEditorTerms.Confirm}')"></button>
    </div>
  </div>
`;

const CSS = css/* scss */ `
  .o-link {
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
    .o-button {
      display: block;
      border: 1px solid lightgrey;
      border-radius: 4px;
      padding: 0px 5px 0px 5px;
      height: 20px;
      background-color: #fff;
      margin-top: 3px;
    }
  }
`;
interface Props {
  position: CellPosition;
  link: Link;
}

export class LinkEditor extends Component<Props, SpreadsheetEnv> {
  static components = { Menu, ColorPicker };
  static style = CSS;
  static template = TEMPLATE;
  static defaultProps = {
    link: { label: "", url: "" },
  };
  private menus = linkMenuRegistry;
  private link: Link = useState({ ...this.props.link });
  private menuState: { isOpen: boolean } = useState({
    isOpen: false,
  });
  menuButton = useRef("menuButton");

  get menuItems() {
    const sheets = this.env.getters.getSheets();
    this.menus.removeChildren(this.menus.content["sheet"]);
    sheets.forEach((sheet, i) => {
      this.menus.addChild(sheet.name, ["sheet"], {
        name: sheet.name,
        sequence: i,
        action: () => console.log("miam" + i),
      });
    });
    return this.menus.getAll();
  }

  get menuPosition() {
    const rect = this.menuButton.el?.getBoundingClientRect();
    if (!rect) {
      return {
        x: 0,
        y: 0,
        width: this.el!.clientWidth,
        height: this.el!.clientHeight,
      };
    }
    const x = rect.x + rect.width;
    const y = rect.y + rect.height;
    return {
      x,
      y,
      width: this.el!.clientWidth,
      height: this.el!.clientHeight,
    };
  }

  openMenu() {
    this.menuState.isOpen = true;
  }

  save() {
    this.env.dispatch("UPDATE_CELL", {
      col: this.props.position.col,
      row: this.props.position.row,
      sheetId: this.props.position.sheetId,
      content: `[${this.link.label}](${this.link.url})`,
    });
    this.trigger("close-side-panel");
  }
}
