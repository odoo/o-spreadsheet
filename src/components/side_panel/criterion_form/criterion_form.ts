import { useStore } from "../../../store_engine/store_hooks";
import { GenericCriterion } from "../../../types/generic_criterion";
import { ComposerFocusStore } from "../../composer/composer_focus_store";

import { useProps } from "@odoo/owl";
import { types } from "../../props_validation";
import { SpreadsheetComponent } from "../../spreadsheet/spreadsheet_component";

interface CriterionFormProps<T extends GenericCriterion> {
  criterion: T;
  onCriterionChanged: (criterion: T) => void;
  disableFormulas?: boolean;
  autofocus?: boolean;
}

export abstract class CriterionForm<
  T extends GenericCriterion = GenericCriterion
> extends SpreadsheetComponent {
  protected props: CriterionFormProps<T> = useProps({
    criterion: types.object(),
    onCriterionChanged: types.function<(criterion: T) => void>(),
    disableFormulas: types.boolean().optional(),
    autofocus: types.boolean().optional(),
  }) as unknown as CriterionFormProps<T>;

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
