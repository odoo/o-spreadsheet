import { props } from "@odoo/owl";
import { TitleDesign } from "../../../../../types/chart/chart";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { TextInput } from "../../../../text_input/text_input";
import { Section } from "../../../components/section/section";
import { TextStyler } from "../text_styler/text_styler";

import { Component } from "../../../../../owl3_compatibility_layer";
import { types } from "../../../../props_validation";
export class ChartTitle extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartTitle";
  static components = { Section, TextStyler, TextInput };

  protected props = props(
    {
      "title?": types.string(),
      "placeholder?": types.string(),
      updateTitle: types.function<[title: string]>([types.string()]),
      "name?": types.string(),
      style: types.TitleDesign(),
      "defaultStyle?": types.object({}) as Partial<TitleDesign>,
      updateStyle: types.function<[style: TitleDesign]>([types.object({})]),
    },
    {
      title: "",
      placeholder: "",
    }
  );

  updateTitle(value: string) {
    this.props.updateTitle(value);
  }
}
