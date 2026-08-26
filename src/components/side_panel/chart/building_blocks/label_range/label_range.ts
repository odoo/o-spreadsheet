import { useProps } from "@odoo/owl";
import { _t } from "../../../../../translation";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";

import { types } from "../../../../props_validation";
import { SpreadsheetComponent } from "../../../../spreadsheet/spreadsheet_component";
export class ChartLabelRange extends SpreadsheetComponent {
  static template = "o-spreadsheet.ChartLabelRange";
  static components = { SelectionInput, Checkbox, Section };

  protected props = useProps({
    title: types.string().optional(_t("Categories / Labels")),
    range: types.string(),
    class: types.string().optional(),
    isInvalid: types.boolean(),
    onSelectionChanged: types.function<(range: string) => void>(),
    onSelectionConfirmed: types.function(),
    options: types
      .ArrayOf<{
        name: string;
        label: string;
        value: boolean;
        onChange: (value: boolean) => void;
      }>()
      .optional([]),
  });

  get sectionClass() {
    return "o-data-labels" + (this.props.class ? ` ${this.props.class}` : "");
  }
}
