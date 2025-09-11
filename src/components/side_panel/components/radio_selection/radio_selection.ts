import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";

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

const CIRCLE_SVG = /*xml*/ `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'>
  <circle r="2" fill="#FFF"/>
</svg>
`;

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
