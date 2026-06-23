import { useStore } from "../../../store_engine/store_hooks";
import { GenericCriterion } from "../../../types/generic_criterion";
import { UID } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { ComposerFocusStore } from "../../composer/composer_focus_store";

import { props } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { types } from "../../props_validation";

interface CriterionFormProps<T extends GenericCriterion> {
  criterion: T;
  onCriterionChanged: (criterion: T) => void;
  disableFormulas?: boolean;
  autofocus?: boolean;
  sheetId: UID;
}

export abstract class CriterionForm<
  T extends GenericCriterion = GenericCriterion
> extends Component<SpreadsheetChildEnv> {
  protected props: CriterionFormProps<T> = props({
    criterion: types.object(),
    onCriterionChanged: types.function<(criterion: T) => void>(),
    disableFormulas: types.boolean().optional(),
    autofocus: types.boolean().optional(),
    sheetId: types.UID(),
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
