import { Component, onMounted, useEffect, useState } from "@odoo/owl";
import { NEWLINE } from "../../../constants";
import { interactiveSplitToColumns } from "../../../helpers/ui/split_to_columns_interactive";
import { useStore } from "../../../store_engine";
import { _t } from "../../../translation";
import { CommandResult, SpreadsheetChildEnv } from "../../../types/index";
import { ComposerStore } from "../../composer/composer/composer_store";
import { SplitToColumnsTerms } from "../../translations_terms";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";

type SeparatorValue = "auto" | "custom" | " " | "," | ";" | typeof NEWLINE;

interface Separator {
  name: string;
  value: SeparatorValue;
}

const SEPARATORS: Separator[] = [
  { name: _t("Detect automatically"), value: "auto" },
  { name: _t("Custom separator"), value: "custom" },
  { name: _t("Space"), value: " " },
  { name: _t("Comma"), value: "," },
  { name: _t("Semicolon"), value: ";" },
  { name: _t("Line Break"), value: NEWLINE },
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
  static components = { ValidationMessages, Section, Checkbox };
  static props = { onCloseSidePanel: Function };

  state = useState<State>({ separatorValue: "auto", addNewColumns: false, customSeparator: "" });

  setup() {
    const composerStore = useStore(ComposerStore);
    // The feature makes no sense if we are editing a cell, because then the selection isn't active
    // Stop the edition when the panel is mounted, and close the panel if the user start editing a cell
    useEffect(
      (editionMode) => {
        if (editionMode !== "inactive") {
          this.props.onCloseSidePanel();
        }
      },
      () => [composerStore.editionMode]
    );

    onMounted(() => {
      composerStore.stopEdition();
    });
  }

  onSeparatorChange(value: SeparatorValue) {
    this.state.separatorValue = value;
  }

  updateCustomSeparator(ev: InputEvent) {
    if (!ev.target) return;
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

  get separators(): Separator[] {
    return SEPARATORS;
  }

  get isConfirmDisabled(): boolean {
    return !this.separatorValue || this.errorMessages.length > 0;
  }
}
