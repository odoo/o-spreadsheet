import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/env";
import { Component } from "@odoo/owl";
import { ICONS, ICON_SETS } from "../icons/icons";

interface Props {
  onIconPicked: (icon: string) => void;
}

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
