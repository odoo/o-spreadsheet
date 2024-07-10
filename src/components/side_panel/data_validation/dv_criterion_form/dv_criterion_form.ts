import { Component, onMounted } from "@odoo/owl";
import { useStore } from "../../../../store_engine";
import { DataValidationCriterion, SpreadsheetChildEnv } from "../../../../types";
import { ComposerFocusStore } from "../../../composer/composer_focus_store";

interface Props<T extends DataValidationCriterion> {
  criterion: T;
  onCriterionChanged: (criterion: DataValidationCriterion) => void;
}

export abstract class DataValidationCriterionForm<
  T extends DataValidationCriterion = DataValidationCriterion
> extends Component<Props<T>, SpreadsheetChildEnv> {
  static props = {
    criterion: Object,
    onCriterionChanged: Function,
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
