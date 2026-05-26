import { props } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";
import { _t } from "../../../../translation";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { types } from "../../../props_validation";
import { Checkbox } from "../../components/checkbox/checkbox";
import { Section } from "../../components/section/section";

export class PivotDeferUpdate extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDeferUpdate";
  protected props = props({
    deferUpdate: types.boolean(),
    isDirty: types.boolean(),
    toggleDeferUpdate: types.function<[value: boolean]>([types.boolean()]),
    discard: types.function([]),
    apply: types.function([]),
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
