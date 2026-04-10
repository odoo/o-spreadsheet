import { Checkbox } from "../../components/checkbox/checkbox";
import { Section } from "../../components/section/section";

import { Component } from "../../../../owl3_compatibility_layer";
import { _t } from "../../../../translation";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
interface Props {
  deferUpdate: boolean;
  isDirty: boolean;
  toggleDeferUpdate: (value: boolean) => void;
  discard: () => void;
  apply: () => void;
}

export class PivotDeferUpdate extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDeferUpdate";
  static props = {
    deferUpdate: Boolean,
    isDirty: Boolean,
    toggleDeferUpdate: Function,
    discard: Function,
    apply: Function,
  };
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
