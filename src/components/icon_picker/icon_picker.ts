import { Component } from "@odoo/owl";
import { ACTION_COLOR, BADGE_SELECTED_COLOR, ComponentsImportance } from "../../constants";
import { SpreadsheetChildEnv } from "../../types/env";
import { css } from "../helpers/css";
import { ICONS, ICON_SETS } from "../icons/icons";

interface Props {
  onIconPicked: (icon: string) => void;
}

css/* scss */ `
  .o-icon-picker {
    position: absolute;
    z-index: ${ComponentsImportance.IconPicker};
    box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
    background-color: white;
    padding: 2px 1px;
  }
  .o-cf-icon-line {
    display: flex;
    padding: 0 6px;
  }
  .o-icon-picker-item {
    cursor: pointer;
    &:hover {
      background-color: ${BADGE_SELECTED_COLOR};
      outline: ${ACTION_COLOR} solid 1px;
    }
  }
`;

export class IconPicker extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-IconPicker";
  static props = {
    onIconPicked: Function,
  };
  icons = ICONS;
  iconSets = ICON_SETS;

  onIconClick(icon: string) {
    if (icon) {
      this.props.onIconPicked(icon);
    }
  }
}
