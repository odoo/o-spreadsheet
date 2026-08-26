import { proxy } from "@odoo/owl";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { UID } from "../../../types/misc";
import { Store } from "../../../types/store_engine";
import { SpreadsheetComponent } from "../../spreadsheet/spreadsheet_component";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";
import { DataSourcesCleanupStore } from "./data_sources_cleanup_store";

interface State {
  uncheckedDataSources: Record<UID, boolean>;
}

export class DataSourcesCleanup extends SpreadsheetComponent {
  static template = "o-spreadsheet-DataSourcesCleanup";
  static components = { Section, Checkbox };

  state = proxy<State>({
    uncheckedDataSources: {},
  });

  store!: Store<DataSourcesCleanupStore>;

  setup() {
    this.store = useLocalStore(DataSourcesCleanupStore);
  }

  onToggleDataSource(type: string, id: UID, checked: boolean) {
    this.state.uncheckedDataSources[`${type}-${id}`] = !checked;
  }

  isDataSourceChecked(type: string, id: UID) {
    return !this.state.uncheckedDataSources[`${type}-${id}`];
  }

  get dataSourcesToDelete() {
    const dataSourcesToDelete: { type: string; id: UID }[] = [];
    for (const category of this.store.unusedDataSourcesCategories) {
      for (const dataSource of category.dataSources) {
        const stateKey = `${category.type}-${dataSource.id}`;
        if (!this.state.uncheckedDataSources[stateKey]) {
          dataSourcesToDelete.push({ type: category.type, id: dataSource.id });
        }
      }
    }
    return dataSourcesToDelete;
  }

  onRemoveUnusedDataSources() {
    this.env.model.dispatch("DELETE_DATA_SOURCES", { dataSources: this.dataSourcesToDelete });
  }
}
