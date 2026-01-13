import { Component } from "@odoo/owl";

import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";

interface Choice {
  value: string;
  label: string;
  icon?: string;
}

interface Props {
  choices: Choice[];
  onChange: (value: string) => void;
  selectedValue: string;
}

export class BadgeSelection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.BadgeSelection";
  static props = {
    choices: Array,
    onChange: Function,
    selectedValue: String,
  };
}
