import { FONT_SIZES } from "@odoo/o-spreadsheet-engine/constants";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { NumberEditor } from "../number_editor/number_editor";

interface Props {
  currentFontSize: number;
  class: string;
  onFontSizeChanged: (fontSize: number) => void;
  onToggle?: () => void;
  onFocusInput?: () => void;
}

export class FontSizeEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FontSizeEditor";
  static components = { NumberEditor };
  static props = {
    currentFontSize: Number,
    onFontSizeChanged: Function,
    onToggle: { type: Function, optional: true },
    onFocusInput: { type: Function, optional: true },
    class: String,
  };

  static defaultProps = {
    onFocusInput: () => {},
  };

  fontSizes: number[] = FONT_SIZES;
}
