import { useProps } from "@odoo/owl";
import { numberToLetters } from "../../../helpers/coordinates";
import { zoneToDimension } from "../../../helpers/zones";
import { Component } from "../../../owl3_compatibility_layer";
import { DataCleanupStore } from "../../../plugins/ui_feature/data_cleanup";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { _t } from "../../../translation";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { types } from "../../props_validation";
import { RemoveDuplicateTerms } from "../../translations_terms";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";

export class RemoveDuplicatesPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-RemoveDuplicatesPanel";
  static components = { ValidationMessages, Section, Checkbox };

  protected props = useProps({
    onCloseSidePanel: types.function(),
  });

  dataCleanupSore!: Store<DataCleanupStore>;

  setup() {
    this.dataCleanupSore = useLocalStore(DataCleanupStore);
  }

  toggleHasHeader() {
    this.dataCleanupSore.setHasHeader(!this.dataCleanupSore.hasHeader);
  }

  toggleAllColumns() {
    this.dataCleanupSore.toggleAllColumns();
  }

  toggleColumn(colIndex: number) {
    this.dataCleanupSore.toggleColumn(colIndex);
  }

  onRemoveDuplicates() {
    this.env.model.dispatch("REMOVE_DUPLICATES");
  }

  getColLabel(colKey: string): string {
    const col = parseInt(colKey);
    let colLabel = _t("Column %s", numberToLetters(col));
    if (this.dataCleanupSore.hasHeader) {
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
    return Object.values(this.dataCleanupSore.columns).every((value) => value);
  }

  get errorMessages(): string[] {
    const cancelledReasons = this.dataCleanupSore.removeDuplicateErrors;

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
}
