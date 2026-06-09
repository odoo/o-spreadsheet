import { props } from "@odoo/owl";
import { _t } from "../../../../../translation";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";

import { Component } from "../../../../../owl3_compatibility_layer";
import { types } from "../../../../props_validation";
export class ChartLabelRange extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartLabelRange";
  static components = { SelectionInput, Checkbox, Section };

  protected props = props(
    {
      "title?": types.string(),
      range: types.string(),
      "class?": types.string(),
      isInvalid: types.boolean(),
      onSelectionChanged: types.function<(range: string) => void>(),
      onSelectionConfirmed: types.function(),
      "options?": types.ArrayOf<{
        name: string;
        label: string;
        value: boolean;
        onChange: (value: boolean) => void;
      }>(),
    },
    {
      title: _t("Categories / Labels"),
      options: [],
    }
  );

  get sectionClass() {
    return "o-data-labels" + (this.props.class ? ` ${this.props.class}` : "");
  }
}
