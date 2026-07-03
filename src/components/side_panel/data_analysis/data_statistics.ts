import { proxy } from "@odoo/owl";
import { Select } from "../../../components/select/select";
import { StatSection } from "../../../helpers/data_statistics/statistics_items";
import { Component } from "../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { Section } from "../components/section/section";
import { DataAnalysisStore } from "./data_analysis_store";

export class DataStatistics extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataStatistics";
  static components = {
    Section,
    Select,
  };

  store!: Store<DataAnalysisStore>;
  selectedCol = proxy({ index: 0 });
  openDescriptionKey = proxy({ value: "" });

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  get activeColSection(): StatSection | undefined {
    return this.store.section;
  }

  onColChange(value: string) {
    this.selectedCol.index = Number(value);
    this.openDescriptionKey.value = "";
  }

  toggleDescription(key: string) {
    this.openDescriptionKey.value = this.openDescriptionKey.value === key ? "" : key;
  }
}
