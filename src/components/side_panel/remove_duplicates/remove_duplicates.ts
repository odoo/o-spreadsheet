import { onWillUpdateProps, props, proxy } from "@odoo/owl";
import { numberToLetters } from "../../../helpers/coordinates";
import { zoneToDimension } from "../../../helpers/zones";
import { Component } from "../../../owl3_compatibility_layer";
import { _t } from "../../../translation";
import { HeaderIndex } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { useModel } from "../../owl_plugins/model_plugin";
import { types } from "../../props_validation";
import { RemoveDuplicateTerms } from "../../translations_terms";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";

interface RemoveDuplicatesState {
  hasHeader: boolean;
  columns: { [colIndex: number]: boolean };
}
export class RemoveDuplicatesPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-RemoveDuplicatesPanel";
  static components = { ValidationMessages, Section, Checkbox };

  protected props = props({
    onCloseSidePanel: types.function([]),
  });

  state: RemoveDuplicatesState = proxy({
    hasHeader: false,
    columns: {},
  });

  private model = useModel();
  setup() {
    this.updateColumns();
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
    this.model().dispatch("REMOVE_DUPLICATES", {
      hasHeader: this.state.hasHeader,
      columns: this.getColsToAnalyze(),
    });
  }

  getColLabel(colKey: string): string {
    const col = parseInt(colKey);
    let colLabel = _t("Column %s", numberToLetters(col));
    if (this.state.hasHeader) {
      const sheetId = this.model().getters.getActiveSheetId();
      const row = this.model().getters.getSelectedZone().top;
      const colHeader = this.model().getters.getEvaluatedCell({ sheetId, col, row });
      if (colHeader.type !== "empty") {
        colLabel += ` - ${colHeader.value}`;
      }
    }
    return colLabel;
  }

  get isEveryColumnSelected(): boolean {
    return Object.values(this.state.columns).every((value) => value);
  }

  get errorMessages(): string[] {
    const cancelledReasons = this.model().canDispatch("REMOVE_DUPLICATES", {
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
    const dimension = zoneToDimension(this.model().getters.getSelectedZone());
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
    const zone = this.model().getters.getSelectedZone();
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
