import { props } from "@odoo/owl";
import { FONT_SIZES } from "../../constants";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { NumberEditor } from "../number_editor/number_editor";

import { Component } from "../../owl3_compatibility_layer";
import { types } from "../props_validation";
export class FontSizeEditor extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FontSizeEditor";
  static components = { NumberEditor };

  protected props = props(
    {
      currentFontSize: types.number(),
      onFontSizeChanged: types.function<(fontSize: number) => void>(),
      "onToggle?": types.function(),
      "onFocusInput?": types.function(),
      class: types.string(),
    },
    {
      onFocusInput: () => {},
    }
  );

  fontSizes: number[] = FONT_SIZES;
}
