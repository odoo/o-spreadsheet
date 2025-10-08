import { ICONS, ICON_SETS } from "@odoo/o-spreadsheet-engine/components/icons/icons";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheetChildEnv";
import { Component } from "@odoo/owl";

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
