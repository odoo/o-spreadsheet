import { proxy } from "@odoo/owl";
import { StatSection } from "../../../helpers/data_statistics/statistics_items";
import { Component } from "../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { Section } from "../components/section/section";
import { DataAnalysisStore } from "./data_analysis_store";
import { CellValue } from "../../..";

export class DataStatistics extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataStatistics";
  static components = {
    Section,
  };

  store!: Store<DataAnalysisStore>;
  selectedCol = proxy({ index: 0 });

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  get activeColSection(): StatSection | undefined {
    return this.store.section;
  }

  onColChange(value: string) {
    this.selectedCol.index = Number(value);
  }

  async copyFormulaToClipboard(formula: string) {
    const value = this.env.model.getters.evaluateFormula(
      this.env.model.getters.getActiveSheetId(),
      formula
    ) as CellValue;
    this.env.model.dispatch("COPY_TO_CLIPBOARD", { data: { formula, value } });
    const osContent = await this.env.model.getters.getClipboardTextAndImageContent();
    await this.env.clipboard.write(osContent);
  }
}
