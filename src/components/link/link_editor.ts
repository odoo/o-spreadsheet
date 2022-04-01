import { Component, onMounted, useRef, useState, xml } from "@odoo/owl";
import { ContextMenu, menuProvider } from "../../controllers/menu_controller";
import { useSharedUI } from "../../controllers/providers";
import { markdownLink } from "../../helpers/index";
import { linkMenuRegistry } from "../../registries/menus/link_menu_registry";
import { Link, Position, SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers/css";
import { useAbsolutePosition } from "../helpers/position_hook";
import { GenericTerms, LinkEditorTerms } from "../translations_terms";
import { LIST } from "./../icons";
import { Menu } from "./../menu";

const MENU_OFFSET_X = 320;
const MENU_OFFSET_Y = 100;
const PADDING = 12;

const TEMPLATE = xml/* xml */ `
    <div class="o-link-editor" t-on-click.stop="() => this.contextMenu.close()" t-on-keydown.stop="onKeyDown" t-ref="linkEditor">
      <div class="o-section">
        <div t-esc="env._t('${LinkEditorTerms.Text}')" class="o-section-title"/>
        <div class="d-flex">
          <input type="text" class="o-input flex-grow-1" t-model="state.link.label"></input>
        </div>

        <div t-esc="env._t('${LinkEditorTerms.Link}')" class="o-section-title mt-3"/>
        <div class="o-link-url">
          <t t-if="state.isUrlEditable">
            <input type="text" t-ref="urlInput" t-model="state.link.url"></input>
          </t>
          <t t-else="">
            <input type="text" t-att-value="state.urlRepresentation" disabled="1"></input>
          </t>
          <button t-if="state.link.url" t-on-click="removeLink" class="o-remove-url">✖</button>
          <button t-if="!state.link.url" t-on-click.stop="openMenu" class="o-special-link">${LIST}</button>
        </div>
      </div>
      <div class="o-buttons">
        <button t-on-click="cancel" class="o-button o-cancel" t-esc="env._t('${GenericTerms.Cancel}')"></button>
        <button t-on-click="save" class="o-button o-save" t-esc="env._t('${GenericTerms.Confirm}')" t-att-disabled="!state.link.url" ></button>
      </div>
    </div>`;

css/* scss */ `
  .o-link-editor {
    font-size: 13px;
    background-color: white;
    box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
    padding: ${PADDING}px;
    display: flex;
    flex-direction: column;
    border-radius: 4px;
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
    input {
      box-sizing: border-box;
      width: 100%;
      border-radius: 4px;
      padding: 4px 23px 4px 10px;
      border: none;
      height: 24px;
      border: 1px solid lightgrey;
    }
    .o-link-url {
      position: relative;
      flex-grow: 1;
      button {
        position: absolute;
        right: 0px;
        top: 0px;
        border: none;
        height: 20px;
        width: 20px;
        background-color: #fff;
        margin: 2px 3px 1px 0px;
        padding: 0px 1px 0px 0px;
      }
      button:hover {
        cursor: pointer;
      }
    }
  }
`;

interface LinkEditorProps {
  cellPosition: Position;
  onLinkEditorClosed: () => void;
}

interface State {
  link: Link;
  urlRepresentation: string;
  isUrlEditable: boolean;
}

export class LinkEditor extends Component<LinkEditorProps, SpreadsheetChildEnv> {
  static template = TEMPLATE;
  static components = { Menu };
  menuItems = linkMenuRegistry.getAll();
  private contextMenu!: ContextMenu;
  private state: State = useState(this.defaultState);
  private linkEditorRef = useRef("linkEditor");
  private position = useAbsolutePosition(this.linkEditorRef);
  urlInput = useRef("urlInput");

  setup() {
    this.contextMenu = useSharedUI(menuProvider);
    onMounted(() => this.urlInput.el?.focus());
  }

  get defaultState(): State {
    const { col, row } = this.props.cellPosition;
    const sheetId = this.env.model.getters.getActiveSheetId();
    const cell = this.env.model.getters.getCell(sheetId, col, row);
    if (cell?.isLink()) {
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

  onSpecialLink(ev: CustomEvent<State>) {
    const { detail } = ev;
    this.state.link.url = detail.link.url;
    this.state.link.label = detail.link.label;
    this.state.isUrlEditable = detail.isUrlEditable;
    this.state.urlRepresentation = detail.urlRepresentation;
  }

  openMenu() {
    const position = {
      x: this.position.x + MENU_OFFSET_X - PADDING - 2,
      y: this.position.y + MENU_OFFSET_Y,
    };
    // onMenuItemClicked
    this.contextMenu.open(this.menuItems, position);
  }

  removeLink() {
    this.state.link.url = "";
    this.state.urlRepresentation = "";
    this.state.isUrlEditable = true;
  }

  save() {
    const { col, row } = this.props.cellPosition;
    const label = this.state.link.label || this.state.link.url;
    this.env.model.dispatch("UPDATE_CELL", {
      col: col,
      row: row,
      sheetId: this.env.model.getters.getActiveSheetId(),
      content: markdownLink(label, this.state.link.url),
    });
    this.props.onLinkEditorClosed();
  }

  cancel() {
    this.props.onLinkEditorClosed();
  }

  onKeyDown(ev: KeyboardEvent) {
    switch (ev.key) {
      case "Enter":
        if (this.state.link.url) {
          this.save();
        }
        break;
      case "Escape":
        this.cancel();
        break;
    }
  }
}
