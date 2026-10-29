import { PluginInstance, providePlugins, usePlugin, useProps } from "@odoo/owl";
import { numberToLetters } from "../../../helpers/coordinates";
import { zoneToDimension } from "../../../helpers/zones";
import { DataCleanupPlugin } from "../../../owl_plugins/data_cleanup_plugin";
import { _t } from "../../../translation";
import { OSComponent } from "../../os_component";
import { types } from "../../props_validation";
import { RemoveDuplicateTerms } from "../../translations_terms";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";

export class RemoveDuplicatesPanel extends OSComponent {
  static template = "o-spreadsheet-RemoveDuplicatesPanel";
  static components = { ValidationMessages, Section, Checkbox };

  protected props = useProps({
    onCloseSidePanel: types.function(),
  });

  dataCleanupPlugin!: PluginInstance<typeof DataCleanupPlugin>;

  setup() {
    providePlugins([DataCleanupPlugin]);
    this.dataCleanupPlugin = usePlugin(DataCleanupPlugin);
  }

  toggleHasHeader() {
    this.dataCleanupPlugin.setHasHeader(!this.dataCleanupPlugin.hasHeader());
  }

  toggleAllColumns() {
    this.dataCleanupPlugin.toggleAllColumns();
  }

  toggleColumn(colIndex: number) {
    this.dataCleanupPlugin.toggleColumn(colIndex);
  }

  onRemoveDuplicates() {
    this.model().dispatch("REMOVE_DUPLICATES");
  }

  getColLabel(colKey: string): string {
    const col = parseInt(colKey);
    let colLabel = _t("Column %s", numberToLetters(col));
    if (this.dataCleanupPlugin.hasHeader()) {
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
    return Object.values(this.dataCleanupPlugin.columns()).every((value) => value);
  }

  get errorMessages(): string[] {
    const cancelledReasons = this.dataCleanupPlugin.removeDuplicateErrors;

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
}
