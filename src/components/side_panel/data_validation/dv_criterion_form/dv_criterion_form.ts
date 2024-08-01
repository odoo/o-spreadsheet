import { Component, onMounted } from "@odoo/owl";
import { interactiveStopEdition } from "../../../../helpers/ui/stop_edition_interactive";
import type { DataValidationCriterion, SpreadsheetChildEnv } from "../../../../types";

interface Props<T extends DataValidationCriterion> {
  criterion: T;
  onCriterionChanged: (criterion: DataValidationCriterion) => void;
}

export abstract class DataValidationCriterionForm<
  T extends DataValidationCriterion = DataValidationCriterion
> extends Component<Props<T>, SpreadsheetChildEnv> {
  setup() {
    onMounted(() => {
      interactiveStopEdition(this.env);
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

DataValidationCriterionForm.props = {
  criterion: Object,
  onCriterionChanged: Function,
};
