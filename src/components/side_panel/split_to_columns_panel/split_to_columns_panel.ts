import { Component, onMounted, onWillUpdateProps, useState } from "@odoo/owl";
import { NEWLINE } from "../../../constants";
import { interactiveSplitToColumns } from "../../../helpers/ui/split_to_columns_interactive";
import { _lt } from "../../../translation";
import { CommandResult, SpreadsheetChildEnv } from "../../../types/index";
import { SplitToColumnsTerms } from "../../translations_terms";
import { SidePanelErrors } from "../side_panel_errors/side_panel_errors";

type SeparatorValue = "auto" | "custom" | " " | "," | ";" | typeof NEWLINE;

interface Separator {
  name: string;
  value: SeparatorValue;
}

const SEPARATORS: Separator[] = [
  { name: _lt("Detect automatically"), value: "auto" },
  { name: _lt("Custom separator"), value: "custom" },
  { name: _lt("Space"), value: " " },
  { name: _lt("Comma"), value: "," },
  { name: _lt("Semicolon"), value: ";" },
  { name: _lt("Line Break"), value: NEWLINE },
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
  static components = { SidePanelErrors };

  state = useState<State>({ separatorValue: "auto", addNewColumns: false, customSeparator: "" });

  setup() {
    onWillUpdateProps(() => {
      // The feature makes no sense if we are editing a cell, because then the selection isn't active
      // Stop the edition when the panel is mounted, and close the panel if the user start editing a cell
      if (this.env.model.getters.getEditionMode() !== "inactive") {
        this.props.onCloseSidePanel();
      }
    });

    onMounted(() => {
      this.env.model.dispatch("STOP_EDITION");
    });
  }

  onSeparatorChange(value: SeparatorValue) {
    this.state.separatorValue = value;
  }

  updateCustomSeparator(ev: InputEvent) {
    if (!ev.target) return;
    this.state.customSeparator = (ev.target as HTMLInputElement).value;
  }

  updateAddNewColumnsCheckbox(ev: Event) {
    if (!ev.target) return;
    this.state.addNewColumns = (ev.target as HTMLInputElement).checked;
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

SplitIntoColumnsPanel.props = {
  onCloseSidePanel: Function,
};
