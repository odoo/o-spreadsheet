import {
  UnusedDataSource,
  unusedDataSourceRegistry,
} from "../../../registries/data_source_registry";
import { SpreadsheetStore } from "../../../stores/spreadsheet_store";
import { Command } from "../../../types/commands";

interface UnusedDataSourceCategory {
  type: string;
  label: string;
  dataSources: UnusedDataSource[];
}

export class DataSourcesCleanupStore extends SpreadsheetStore {
  protected handle(cmd: Command): void {
    switch (cmd.type) {
      case "DELETE_DATA_SOURCES":
        for (const item of cmd.dataSources) {
          const dataSourceType = unusedDataSourceRegistry.get(item.type);
          dataSourceType.deleteDataSource(this.model.dispatch, item.id);
        }
    }
  }

  get unusedDataSourcesCategories(): UnusedDataSourceCategory[] {
    const unusedDataSourcesCategories: UnusedDataSourceCategory[] = [];
    for (const dataSourceType of unusedDataSourceRegistry.getAll()) {
      unusedDataSourcesCategories.push({
        type: dataSourceType.type,
        label: dataSourceType.unusedLabel,
        dataSources: dataSourceType.getUnusedInstances(this.getters),
      });
    }

    return unusedDataSourcesCategories;
  }
}
