import { Component, onMounted, useRef, useState } from "@odoo/owl";
import { linkMenuRegistry } from "../../../registries/menus/link_menu_registry";
import { useLocalStore } from "../../../store_engine";
import { DOMCoordinates, Position, SpreadsheetChildEnv } from "../../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { css } from "../../helpers/css";
import { useAbsoluteBoundingRect } from "../../helpers/position_hook";
import { Menu } from "../../menu/menu";
import { LinkEditorStore } from "./link_editor_store";

const MENU_OFFSET_X = 320;
const MENU_OFFSET_Y = 100;
const PADDING = 12;
const LINK_EDITOR_WIDTH = 340;
const LINK_EDITOR_HEIGHT = 165;

css/* scss */ `
  .o-link-editor {
    font-size: 13px;
    background-color: white;
    box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
    padding: ${PADDING}px;
    display: flex;
    flex-direction: column;
    border-radius: 4px;
    height: ${LINK_EDITOR_HEIGHT}px;
    width: ${LINK_EDITOR_WIDTH}px;

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
  onClosed?: () => void;
}

export class LinkEditor extends Component<LinkEditorProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LinkEditor";
  static components = { Menu };
  menuItems = linkMenuRegistry.getMenuItems();
  private menu = useState({
    isOpen: false,
  });
  private linkEditorRef = useRef("linkEditor");
  private position: DOMCoordinates = useAbsoluteBoundingRect(this.linkEditorRef);
  urlInput = useRef("urlInput");
  store!: LinkEditorStore;

  setup() {
    onMounted(() => this.urlInput.el?.focus());
    // @ts-ignore
    this.store = useLocalStore(LinkEditorStore, this.props.cellPosition, this.props.onClosed);
  }

  get menuPosition(): DOMCoordinates {
    return {
      x: this.position.x + MENU_OFFSET_X - PADDING - 2,
      y: this.position.y + MENU_OFFSET_Y,
    };
  }

  openMenu() {
    this.menu.isOpen = true;
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

LinkEditor.props = {
  cellPosition: Object,
  onClosed: { type: Function, optional: true },
};
