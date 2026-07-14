import { Component } from "@odoo/owl";

import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";

interface Choice {
  value: unknown;
  label: string;
}

interface Props {
  choices: Choice[];
  onChange: (value: unknown) => void;
  selectedValue: string;
  name: string;
  direction: "horizontal" | "vertical";
}

export class RadioSelection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.RadioSelection";
  static props = {
    choices: Array,
    onChange: Function,
    selectedValue: { optional: false },
    name: String,
    direction: { type: String, optional: true },
  };
  static defaultProps = {
    direction: "horizontal",
  };
}
