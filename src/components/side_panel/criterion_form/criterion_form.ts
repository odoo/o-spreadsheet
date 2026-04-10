import { useStore } from "../../../store_engine/store_hooks";
import { GenericCriterion } from "../../../types/generic_criterion";
import { ComposerFocusStore } from "../../composer/composer_focus_store";

import { Component } from "../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
interface Props<T extends GenericCriterion> {
  criterion: T;
  onCriterionChanged: (criterion: T) => void;
  disableFormulas?: boolean;
  autofocus?: boolean;
}

export abstract class CriterionForm<
  T extends GenericCriterion = GenericCriterion
> extends Component<Props<T>, SpreadsheetChildEnv> {
  static props = {
    criterion: Object,
    onCriterionChanged: Function,
    disableFormulas: { type: Boolean, optional: true },
    autofocus: { type: Boolean, optional: true },
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
