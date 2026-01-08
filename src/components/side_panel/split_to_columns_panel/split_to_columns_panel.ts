import { SplitToColumnsTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { NEWLINE } from "@odoo/o-spreadsheet-engine/constants";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, useEffect, useState } from "@odoo/owl";
import { interactiveSplitToColumns } from "../../../helpers/ui/split_to_columns_interactive";
import { useStore } from "../../../store_engine";
import { CommandResult, ValueAndLabel } from "../../../types/index";
import { Select } from "../../select/select";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";
import { ComposerFocusStore } from "./../../composer/composer_focus_store";

type SeparatorValue = "auto" | "custom" | " " | "," | ";" | typeof NEWLINE;

const SEPARATORS: ValueAndLabel[] = [
  { label: _t("Detect automatically"), value: "auto" },
  { label: _t("Custom separator"), value: "custom" },
  { label: _t("Space"), value: " " },
  { label: _t("Comma"), value: "," },
  { label: _t("Semicolon"), value: ";" },
  { label: _t("Line Break"), value: NEWLINE },
];

interface Props {
  onCloseSidePanel: () => void;
}

interface State {
  separatorValue: SeparatorValue;
  customSeparator: string;
  addNewColumns: boolean;
}

export class SplitIntoColumnsPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SplitIntoColumnsPanel";
  static components = { ValidationMessages, Section, Checkbox, Select };
  static props = { onCloseSidePanel: Function };

  state = useState<State>({ separatorValue: "auto", addNewColumns: false, customSeparator: "" });

  setup() {
    const composerFocusStore = useStore(ComposerFocusStore);
    // The feature makes no sense if we are editing a cell, because then the selection isn't active
    // Stop the edition when the panel is mounted, and close the panel if the user start editing a cell
    useEffect(
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

  onSeparatorChange(value: SeparatorValue) {
    this.state.separatorValue = value;
  }

  updateCustomSeparator(ev: InputEvent) {
    if (!ev.target) {
      return;
    }
    this.state.customSeparator = (ev.target as HTMLInputElement).value;
  }

  updateAddNewColumnsCheckbox(addNewColumns: boolean) {
    this.state.addNewColumns = addNewColumns;
  }

  confirm() {
    const result = interactiveSplitToColumns(
      this.env,
      this.separatorValue,
      this.state.addNewColumns
    );

    if (result.isSuccessful) {
      this.props.onCloseSidePanel();
    }
  }

  get errorMessages(): string[] {
    const cancelledReasons = this.env.model.canDispatch("SPLIT_TEXT_INTO_COLUMNS", {
      separator: this.separatorValue,
      addNewColumns: this.state.addNewColumns,
      force: true,
    }).reasons;

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
    const cancelledReasons = this.env.model.canDispatch("SPLIT_TEXT_INTO_COLUMNS", {
      separator: this.separatorValue,
      addNewColumns: this.state.addNewColumns,
      force: false,
    }).reasons;

    if (cancelledReasons.includes(CommandResult.SplitWillOverwriteContent)) {
      warnings.push(SplitToColumnsTerms.Errors[CommandResult.SplitWillOverwriteContent]);
    }

    return warnings;
  }

  get separatorValue(): string {
    if (this.state.separatorValue === "custom") {
      return this.state.customSeparator;
    } else if (this.state.separatorValue === "auto") {
      return this.env.model.getters.getAutomaticSeparator();
    }
    return this.state.separatorValue;
  }

  get separators(): ValueAndLabel[] {
    return SEPARATORS;
  }

  get isConfirmDisabled(): boolean {
    return !this.separatorValue || this.errorMessages.length > 0;
  }
}
