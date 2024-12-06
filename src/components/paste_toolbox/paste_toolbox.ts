import { Component, useRef, useState } from "@odoo/owl";
import { createActions } from "../../actions/action";
import { paste, pasteSpecialFormat, pasteSpecialValue } from "../../actions/edit_actions";
import { ComponentsImportance, ICON_EDGE_LENGTH } from "../../constants";
import { DOMCoordinates, SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss } from "../helpers/css";
import { Menu, MenuState } from "../menu/menu";

css/* scss */ `
  .o-paste {
    position: absolute;
    height: ${ICON_EDGE_LENGTH + 10}px;
    border: 1px solid lightgrey;
    box-sizing: border-box !important;
    background-color: white;
    cursor: pointer;
    z-index: ${ComponentsImportance.Clipboard};
    align-content: center;

    .o-icon {
      margin: auto;
    }
  }
`;

interface Props {
  position: DOMCoordinates;
  onClosed: () => void;
}

export class PasteToolbox extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PasteToolbox";
  static props = {
    position: Object,
    onClosed: Function,
  };
  static components = { Menu };

  private menuState: MenuState = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    menuItems: [],
  });

  private toolboxRef = useRef("toolboxButton");

  get style() {
    const { x, y } = this.props.position;
    return cssPropertiesToCss({
      left: `${x}px`,
      top: `${y + 5}px`,
    });
  }

  showMenu() {
    this.menuState.isOpen = true;
    const { x, y } = this.toolboxRef.el!.getBoundingClientRect();
    this.menuState.menuItems = this.getMenuItems();
    this.menuState.position = { x, y };
  }

  onMenuClosed() {
    this.menuState.isOpen = false;
    this.props.onClosed();
  }

  private getMenuItems() {
    return createActions([
      {
        ...paste,
        icon: undefined,
        id: "paste",
        execute: (env) => {
          env.model.dispatch("REQUEST_UNDO");
          paste.execute?.(this.env);
        },
      },
      {
        name: pasteSpecialValue.name,
        id: "paste_special_value",
        execute: (env) => {
          env.model.dispatch("REQUEST_UNDO");
          pasteSpecialValue.execute?.(env);
        },
      },
      {
        name: pasteSpecialFormat.name,
        id: "paste_special_format",
        execute: (env) => {
          env.model.dispatch("REQUEST_UNDO");
          pasteSpecialFormat.execute?.(env);
        },
      },
    ]);
  }
}
