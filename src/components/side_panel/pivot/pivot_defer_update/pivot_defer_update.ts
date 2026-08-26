import { useProps } from "@odoo/owl";
import { _t } from "../../../../translation";
import { types } from "../../../props_validation";
import { SpreadsheetComponent } from "../../../spreadsheet/spreadsheet_component";
import { Checkbox } from "../../components/checkbox/checkbox";
import { Section } from "../../components/section/section";

export class PivotDeferUpdate extends SpreadsheetComponent {
  static template = "o-spreadsheet-PivotDeferUpdate";
  protected props = useProps({
    deferUpdate: types.boolean(),
    isDirty: types.boolean(),
    toggleDeferUpdate: types.function<(value: boolean) => void>(),
    discard: types.function(),
    apply: types.function(),
  });
  static components = {
    Section,
    Checkbox,
  };

  get deferUpdatesLabel() {
    return _t("Defer updates");
  }

  get deferUpdatesTooltip() {
    return _t("Changing the pivot definition requires to reload the data. It may take some time.");
  }
}
