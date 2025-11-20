import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { useStore } from "../../../store_engine";
import { GenericCriterion, UID } from "../../../types";
import { ComposerFocusStore } from "../../composer/composer_focus_store";

interface Props<T extends GenericCriterion> {
  criterion: T;
  onCriterionChanged: (criterion: T) => void;
  disableFormulas?: boolean;
  autofocus?: boolean;
  sheetId: UID;
}

export abstract class CriterionForm<
  T extends GenericCriterion = GenericCriterion
> extends Component<Props<T>, SpreadsheetChildEnv> {
  static props = {
    criterion: Object,
    onCriterionChanged: Function,
    disableFormulas: { type: Boolean, optional: true },
    autofocus: { type: Boolean, optional: true },
    sheetId: { type: String, optional: true },
  };
  setup() {
    const composerFocusStore = useStore(ComposerFocusStore);
    if (composerFocusStore.activeComposer.editionMode !== "inactive") {
      composerFocusStore.activeComposer.stopEdition();
    }
  }

  updateCriterion(criterion: Partial<T>) {
    const filteredCriterion = {
      ...this.props.criterion,
      ...criterion,
    };
    this.props.onCriterionChanged(filteredCriterion);
  }
}
