import { useStore } from "../../../store_engine/store_hooks";
import { GenericCriterion } from "../../../types/generic_criterion";
import { ComposerFocusStore } from "../../composer/composer_focus_store";

import { props } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { types } from "../../props_validation";

export abstract class CriterionForm<
  T extends GenericCriterion = GenericCriterion
> extends Component<SpreadsheetChildEnv> {
  protected props = props({
    criterion: types.object({}) as unknown as T,
    onCriterionChanged: types.function<(criterion: T) => void>(),
    "disableFormulas?": types.boolean(),
    "autofocus?": types.boolean(),
  });

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
