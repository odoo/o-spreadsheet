import { Component, onMounted, useRef, useState } from "@odoo/owl";
import { markdownLink } from "../../../helpers";
import { linkMenuRegistry } from "../../../registries/menus/link_menu_registry";
import { DOMCoordinates, Link, Position, SpreadsheetChildEnv } from "../../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { css } from "../../helpers/css";
import { useAbsolutePosition } from "../../helpers/position_hook";
import { Menu } from "../../menu/menu";

const MENU_OFFSET_X = 320;
const MENU_OFFSET_Y = 100;
const PADDING = 12;
const LINK_EDITOR_WIDTH = 340;
const LINK_EDITOR_HEIGHT = 180;

css/* scss */ `
  .o-link-editor {
    input {
      outline: 0;
      box-sizing: border-box;
      border: 0;
      border-bottom: 1px solid grey;
    }
  }
`;

interface LinkEditorProps {
  cellPosition: Position;
  onClosed?: () => void;
}

interface State {
  link: Link;
  urlRepresentation: string;
  isUrlEditable: boolean;
}

export class LinkEditor extends Component<LinkEditorProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LinkEditor";
  static size = { width: LINK_EDITOR_WIDTH, height: LINK_EDITOR_HEIGHT };
  static components = { Menu };
  menuItems = linkMenuRegistry.getAll();
  private state: State = useState(this.defaultState);
  private menu = useState({
    isOpen: false,
  });
  private linkEditorRef = useRef("linkEditor");
  private position = useAbsolutePosition(this.linkEditorRef);
  urlInput = useRef("urlInput");

  setup() {
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

  get menuPosition(): DOMCoordinates {
    return {
      x: this.position.x + MENU_OFFSET_X - PADDING - 2,
      y: this.position.y + MENU_OFFSET_Y,
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
    this.menu.isOpen = true;
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
    this.props.onClosed?.();
  }

  cancel() {
    this.props.onClosed?.();
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

export const LinkEditorPopoverBuilder: PopoverBuilders = {
  onOpen: (position, getters): CellPopoverComponent<typeof LinkEditor> => {
    return {
      isOpen: true,
      props: { cellPosition: position },
      Component: LinkEditor,
      cellCorner: "BottomLeft",
    };
  },
};
