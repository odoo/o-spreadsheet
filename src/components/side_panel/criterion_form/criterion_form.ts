import { Component, onMounted } from "@odoo/owl";
import { useStore } from "../../../store_engine";
import { GenericCriterion, SpreadsheetChildEnv, UID } from "../../../types";
import { ComposerFocusStore } from "../../composer/composer_focus_store";

interface Props<T extends GenericCriterion> {
  criterion: T;
  onCriterionChanged: (criterion: T) => void;
  disableFormulas?: boolean;
  sheetId: UID;
}

export abstract class CriterionForm<
  T extends GenericCriterion = GenericCriterion
> extends Component<Props<T>, SpreadsheetChildEnv> {
  static props = {
    criterion: Object,
    onCriterionChanged: Function,
    disableFormulas: { type: Boolean, optional: true },
    sheetId: { type: String, optional: true },
  };
  setup() {
    const composerFocusStore = useStore(ComposerFocusStore);
    onMounted(() => {
      composerFocusStore.activeComposer.stopEdition();
    });
  }

  updateCriterion(criterion: Partial<T>) {
    const filteredCriterion = {
      ...this.props.criterion,
      ...criterion,
    };
    this.props.onCriterionChanged(filteredCriterion);
  }
}
