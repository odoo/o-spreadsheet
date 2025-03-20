import { Component, onMounted, useRef, useState } from "@odoo/owl";
import { markdownLink } from "../../../helpers";
import { detectLink, urlRepresentation } from "../../../helpers/links";
import { canonicalizeNumberContent } from "../../../helpers/locale";
import { linkMenuRegistry } from "../../../registries/menus/link_menu_registry";
import { Link, Position, Rect, SpreadsheetChildEnv } from "../../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { css } from "../../helpers/css";
import { getRefBoundingRect } from "../../helpers/dom_helpers";
import { Menu } from "../../menu/menu";

const PADDING = 12;
const LINK_EDITOR_WIDTH = 340 + 2 * PADDING;

css/* scss */ `
  .o-link-editor {
    font-size: 13px;
    background-color: white;
    box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
    padding: ${PADDING}px;
    display: flex;
    flex-direction: column;
    border-radius: 4px;
    width: ${LINK_EDITOR_WIDTH}px;

    .o-section {
      .o-section-title {
        font-weight: bold;
        margin-bottom: 5px;
      }
    }
    .o-buttons {
      padding-left: 16px;
      padding-top: 16px;
      text-align: right;
    }
    input.o-input {
      width: 100%;
      padding: 0 23px 4px 0;
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
  onClosed?: () => void;
}

interface State {
  label: string;
  url: string;
  isUrlEditable: boolean;
}

export class LinkEditor extends Component<LinkEditorProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LinkEditor";
  static props = {
    cellPosition: Object,
    onClosed: { type: Function, optional: true },
  };
  static components = { Menu };
  menuItems = linkMenuRegistry.getMenuItems();
  private link: State = useState(this.defaultState);
  private menu = useState({
    isOpen: false,
  });
  private linkEditorMenuButtonRef = useRef("linkEditorMenuButton");
  urlInput = useRef("urlInput");

  setup() {
    onMounted(() => this.urlInput.el?.focus());
  }

  get defaultState(): State {
    const { col, row } = this.props.cellPosition;
    const sheetId = this.env.model.getters.getActiveSheetId();
    const cell = this.env.model.getters.getEvaluatedCell({ sheetId, col, row });
    if (cell.link) {
      return {
        url: cell.link.url,
        label: cell.formattedValue,
        isUrlEditable: cell.link.isUrlEditable,
      };
    }
    return {
      label: cell.formattedValue,
      url: "",
      isUrlEditable: true,
    };
  }

  get menuButtonRect(): Rect {
    return getRefBoundingRect(this.linkEditorMenuButtonRef);
  }

  onSpecialLink(ev: CustomEvent<string>) {
    const { detail: markdownLink } = ev;
    const link = detectLink(markdownLink);
    if (!link) {
      return;
    }
    this.link.url = link.url;
    this.link.label = link.label;
    this.link.isUrlEditable = link.isUrlEditable;
  }

  getUrlRepresentation(link: Link): string {
    return urlRepresentation(link, this.env.model.getters);
  }

  openMenu() {
    this.menu.isOpen = true;
  }

  removeLink() {
    this.link.url = "";
    this.link.isUrlEditable = true;
  }

  save() {
    const { col, row } = this.props.cellPosition;
    const locale = this.env.model.getters.getLocale();
    const label = this.link.label
      ? canonicalizeNumberContent(this.link.label, locale)
      : this.link.url;
    this.env.model.dispatch("UPDATE_CELL", {
      col: col,
      row: row,
      sheetId: this.env.model.getters.getActiveSheetId(),
      content: markdownLink(label, this.link.url),
    });
    this.props.onClosed?.();
  }

  cancel() {
    this.props.onClosed?.();
  }

  onKeyDown(ev: KeyboardEvent) {
    switch (ev.key) {
      case "Enter":
        if (this.link.url) {
          this.save();
        }
        ev.stopPropagation();
        ev.preventDefault();
        break;
      case "Escape":
        this.cancel();
        ev.stopPropagation();
        break;
    }
  }
}

export const LinkEditorPopoverBuilder: PopoverBuilders = {
  onOpen: (position, getters): CellPopoverComponent<typeof LinkEditor> => {
    return {
      isOpen: true,
      props: { cellPosition: position },
      Component: LinkEditor,
      cellCorner: "bottom-left",
    };
  },
};
