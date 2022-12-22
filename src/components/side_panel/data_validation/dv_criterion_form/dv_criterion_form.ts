import { Component, onMounted } from "@odoo/owl";
import { useStore } from "../../../../store_engine";
import { DataValidationCriterion, SpreadsheetChildEnv } from "../../../../types";
import { ComposerStore } from "../../../composer/composer/composer_store";

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
    const composerStore = useStore(ComposerStore);
    onMounted(() => {
      composerStore.stopEdition();
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
