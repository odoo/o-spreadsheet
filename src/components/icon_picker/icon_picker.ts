import { Component } from "@odoo/owl";
import { ComponentsImportance } from "../../constants";
import { SpreadsheetChildEnv } from "../../types/env";
import { css } from "../helpers/css";
import { ICONS, ICON_SETS } from "../icons/icons";

interface Props {
  onIconPicked: (icon: string) => void;
}

css/* scss */ `
  .o-icon-picker {
    z-index: ${ComponentsImportance.IconPicker};
  }
  .o-icon-picker-item {
    &:hover {
      background-color: rgba(0, 0, 0, 0.08);
      outline: 1px solid gray;
    }
  }
`;

export class IconPicker extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-IconPicker";
  icons = ICONS;
  iconSets = ICON_SETS;

  onIconClick(icon: string) {
    if (icon) {
      this.props.onIconPicked(icon);
    }
  }
}
