import { useProps } from "@odoo/owl";
import { TitleDesign } from "../../../../../types/chart/chart";
import { TextInput } from "../../../../text_input/text_input";
import { Section } from "../../../components/section/section";
import { TextStyler } from "../text_styler/text_styler";

import { types } from "../../../../props_validation";
import { SpreadsheetComponent } from "../../../../spreadsheet/spreadsheet_component";
export class ChartTitle extends SpreadsheetComponent {
  static template = "o-spreadsheet.ChartTitle";
  static components = { Section, TextStyler, TextInput };

  protected props = useProps({
    class: types.string().optional(),
    title: types.string().optional(""),
    placeholder: types.string().optional(""),
    updateTitle: types.function<(title: string) => void>(),
    name: types.string().optional(),
    style: types.TitleDesign(),
    defaultStyle: types.object<Partial<TitleDesign>>().optional(),
    updateStyle: types.function<(style: TitleDesign) => void>(),
  });

  updateTitle(value: string) {
    this.props.updateTitle(value);
  }
}
