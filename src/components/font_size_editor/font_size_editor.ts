import { useProps } from "@odoo/owl";
import { FONT_SIZES } from "../../constants";
import { NumberEditor } from "../number_editor/number_editor";

import { types } from "../props_validation";
import { SpreadsheetComponent } from "../spreadsheet/spreadsheet_component";
export class FontSizeEditor extends SpreadsheetComponent {
  static template = "o-spreadsheet-FontSizeEditor";
  static components = { NumberEditor };

  protected props = useProps({
    currentFontSize: types.number(),
    onFontSizeChanged: types.function<(fontSize: number) => void>(),
    onToggle: types.function().optional(),
    onFocusInput: types.function().optional(() => () => {}),
    class: types.string(),
  });

  fontSizes: number[] = FONT_SIZES;
}
