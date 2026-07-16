import { onMounted, useProps } from "@odoo/owl";
import { NEWLINE } from "../../../constants";
import { interactiveSplitToColumns } from "../../../helpers/ui/split_to_columns_interactive";
import { Component, useLayoutEffect } from "../../../owl3_compatibility_layer";
import { useStore } from "../../../store_engine/store_hooks";
import { _t } from "../../../translation";
import { CommandResult } from "../../../types/commands";
import { ValueAndLabel } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { types } from "../../props_validation";
import { Select } from "../../select/select";
import { SplitToColumnsTerms } from "../../translations_terms";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";
import { ComposerFocusStore } from "./../../composer/composer_focus_store";
import { SplitToColumnsSeparatorValue, SplitToColumnsStore } from "./split_to_columns_store";

const SEPARATORS: ValueAndLabel[] = [
  { label: _t("Detect automatically"), value: "auto" },
  { label: _t("Custom separator"), value: "custom" },
  { label: _t("Space"), value: " " },
  { label: _t("Comma"), value: "," },
  { label: _t("Semicolon"), value: ";" },
  { label: _t("Line Break"), value: NEWLINE },
];

export class SplitIntoColumnsPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SplitIntoColumnsPanel";
  static components = { ValidationMessages, Section, Checkbox, Select };

  protected props = useProps({
    onCloseSidePanel: types.function(),
  });

  store!: Store<SplitToColumnsStore>;

  setup() {
    const composerFocusStore = useStore(ComposerFocusStore);
    this.store = useStore(SplitToColumnsStore);
    // The feature makes no sense if we are editing a cell, because then the selection isn't active
    // Stop the edition when the panel is mounted, and close the panel if the user start editing a cell
    useLayoutEffect(
      (editionMode) => {
        if (editionMode !== "inactive") {
          this.props.onCloseSidePanel();
        }
      },
      () => [composerFocusStore.focusMode]
    );

    onMounted(() => {
      composerFocusStore.activeComposer.stopEdition();
    });
  }

  onSeparatorChange(value: SplitToColumnsSeparatorValue) {
    this.store.setSeparatorValue(value);
  }

  updateCustomSeparator(ev: InputEvent) {
    if (!ev.target) {
      return;
    }
    this.store.setCustomSeparator((ev.target as HTMLInputElement).value);
  }

  updateAddNewColumnsCheckbox(addNewColumns: boolean) {
    this.store.setShouldAddNewColumns(addNewColumns);
  }

  confirm() {
    const result = interactiveSplitToColumns(this.env);

    if (result.isSuccessful) {
      this.props.onCloseSidePanel();
    }
  }

  get errorMessages(): string[] {
    const cancelledReasons = this.store.canSplitIntoColumns({ force: true }).reasons;

    const errors = new Set<string>();

    for (const reason of cancelledReasons) {
      switch (reason) {
        case CommandResult.SplitWillOverwriteContent:
        case CommandResult.EmptySplitSeparator:
          break;
        default:
          errors.add(SplitToColumnsTerms.Errors[reason] || SplitToColumnsTerms.Errors.Unexpected);
      }
    }
    return Array.from(errors);
  }

  get warningMessages(): string[] {
    const warnings: string[] = [];
    const cancelledReasons = this.store.canSplitIntoColumns({ force: false }).reasons;

    if (cancelledReasons.includes(CommandResult.SplitWillOverwriteContent)) {
      warnings.push(SplitToColumnsTerms.Errors[CommandResult.SplitWillOverwriteContent]);
    }

    return warnings;
  }

  get separators(): ValueAndLabel[] {
    return SEPARATORS;
  }

  get isConfirmDisabled(): boolean {
    return !this.store.separatorString || this.errorMessages.length > 0;
  }
}
