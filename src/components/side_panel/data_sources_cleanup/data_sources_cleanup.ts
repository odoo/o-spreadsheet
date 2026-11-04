import { proxy } from "@odoo/owl";
import { provideAndUsePlugin } from "../../../helpers/owl3_helpers";
import { UID } from "../../../types/misc";
import { OSComponent } from "../../os_component";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";
import { DataSourcesCleanupPlugin } from "./data_sources_cleanup_store";

interface State {
  uncheckedDataSources: Record<UID, boolean>;
}

export class DataSourcesCleanup extends OSComponent {
  static template = "o-spreadsheet-DataSourcesCleanup";
  static components = { Section, Checkbox };

  state = proxy<State>({
    uncheckedDataSources: {},
  });

  datasourceCleanupPlugin = provideAndUsePlugin(DataSourcesCleanupPlugin);

  onToggleDataSource(type: string, id: UID, checked: boolean) {
    this.state.uncheckedDataSources[`${type}-${id}`] = !checked;
  }

  isDataSourceChecked(type: string, id: UID) {
    return !this.state.uncheckedDataSources[`${type}-${id}`];
  }

  get dataSourcesToDelete() {
    const dataSourcesToDelete: { type: string; id: UID }[] = [];
    for (const category of this.datasourceCleanupPlugin.unusedDataSourcesCategories()) {
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
    this.model().dispatch("DELETE_DATA_SOURCES", { dataSources: this.dataSourcesToDelete });
  }
}
