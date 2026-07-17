import { useProps } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";

import { Component } from "../../../../owl3_compatibility_layer";
import { types } from "../../../props_validation";
interface Choice {
  value: unknown;
  label: string;
}

// FIXME Encoding version used in css
// const CIRCLE_SVG = /*xml*/ `
// <svg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'>
//   <circle r="2" fill="#FFF"/>
// </svg>
// `;

export class RadioSelection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet.RadioSelection";

  protected props = useProps({
    choices: types.ArrayOf<Choice>(),
    onChange: types.function<(value: unknown) => void>(),
    selectedValue: types.string(),
    name: types.string(),
    direction: types
      .or([types.literal("horizontal"), types.literal("vertical")])
      .optional("horizontal"),
  });
}
