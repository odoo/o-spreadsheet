import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { numberToLetters, zoneToDimension } from "../../../helpers";
import { _t } from "../../../translation";
import { HeaderIndex, SpreadsheetChildEnv } from "../../../types/index";
import { css } from "../../helpers";
import { RemoveDuplicateTerms } from "../../translations_terms";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";

css/* scss */ `
  .o-checkbox-selection {
    height: 150px;
  }
`;

interface Props {
  onCloseSidePanel: () => void;
}

interface RemoveDuplicatesState {
  hasHeader: boolean;
  columns: { [colIndex: number]: boolean };
}
export class RemoveDuplicatesPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-RemoveDuplicatesPanel";
  static components = { ValidationMessages, Section, Checkbox };
  static props = { onCloseSidePanel: Function };

  state: RemoveDuplicatesState = useState({
    hasHeader: false,
    columns: {},
  });

  setup() {
    onWillUpdateProps(() => this.updateColumns());
  }

  toggleHasHeader() {
    this.state.hasHeader = !this.state.hasHeader;
  }

  toggleAllColumns() {
    const newState = !this.isEveryColumnSelected;
    for (const index in this.state.columns) {
      this.state.columns[index] = newState;
    }
  }

  toggleColumn(colIndex: number) {
    this.state.columns[colIndex] = !this.state.columns[colIndex];
  }

  onRemoveDuplicates() {
    this.env.model.dispatch("REMOVE_DUPLICATES", {
      hasHeader: this.state.hasHeader,
      columns: this.getColsToAnalyze(),
    });
  }

  getColLabel(colKey: string): string {
    const col = parseInt(colKey);
    let colLabel = _t("Column %s", numberToLetters(col));
    if (this.state.hasHeader) {
      const sheetId = this.env.model.getters.getActiveSheetId();
      const row = this.env.model.getters.getSelectedZone().top;
      const colHeader = this.env.model.getters.getEvaluatedCell({ sheetId, col, row });
      if (colHeader.type !== "empty") {
        colLabel += ` - ${colHeader.value}`;
      }
    }
    return colLabel;
  }

  get isEveryColumnSelected(): boolean {
    return Object.values(this.state.columns).every((value) => value === true);
  }

  get errorMessages(): string[] {
    const cancelledReasons = this.env.model.canDispatch("REMOVE_DUPLICATES", {
      hasHeader: this.state.hasHeader,
      columns: this.getColsToAnalyze(),
    }).reasons;

    const errors = new Set<string>();

    for (const reason of cancelledReasons) {
      errors.add(RemoveDuplicateTerms.Errors[reason] || RemoveDuplicateTerms.Errors.Unexpected);
    }
    return Array.from(errors);
  }

  get selectionStatisticalInformation(): string {
    const dimension = zoneToDimension(this.env.model.getters.getSelectedZone());
    return _t("%(row_count)s rows and %(column_count)s columns selected", {
      row_count: dimension.numberOfRows,
      column_count: dimension.numberOfCols,
    });
  }

  get canConfirm(): boolean {
    return this.errorMessages.length === 0;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private updateColumns() {
    const zone = this.env.model.getters.getSelectedZone();
    const oldColumns = this.state.columns;
    const newColumns = {};
    for (let i = zone.left; i <= zone.right; i++) {
      newColumns[i] = i in oldColumns ? oldColumns[i] : true;
    }
    this.state.columns = newColumns;
  }

  private getColsToAnalyze(): HeaderIndex[] {
    return Object.keys(this.state.columns)
      .filter((colIndex) => this.state.columns[colIndex])
      .map((colIndex) => parseInt(colIndex));
  }
}
