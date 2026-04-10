import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";

import { Component } from "../../../../owl3_compatibility_layer";
interface Props {
  class?: string;
}

export class Section extends Component<Props, SpreadsheetChildEnv> {
  static template = "o_spreadsheet.Section";
  static props = {
    class: { type: String, optional: true },
    title: { type: String, optional: true },
    slots: Object,
  };
}
