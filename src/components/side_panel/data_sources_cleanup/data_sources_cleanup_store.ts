import { computed } from "@odoo/owl";
import { OwlPluginWithModel } from "../../../owl_plugins/owl_plugin_with_model";
import {
  UnusedDataSource,
  unusedDataSourceRegistry,
} from "../../../registries/data_source_registry";
import { Command } from "../../../types/commands";

interface UnusedDataSourceCategory {
  type: string;
  label: string;
  dataSources: UnusedDataSource[];
}

export class DataSourcesCleanupPlugin extends OwlPluginWithModel {
  protected handle(cmd: Command): void {
    switch (cmd.type) {
      case "DELETE_DATA_SOURCES":
        for (const item of cmd.dataSources) {
          const dataSourceType = unusedDataSourceRegistry.get(item.type);
          dataSourceType.deleteDataSource(this.model().dispatch, item.id);
        }
    }
  }

  unusedDataSourcesCategories = computed<UnusedDataSourceCategory[]>(() => {
    const unusedDataSourcesCategories: UnusedDataSourceCategory[] = [];
    for (const dataSourceType of unusedDataSourceRegistry.getAll()) {
      unusedDataSourcesCategories.push({
        type: dataSourceType.type,
        label: dataSourceType.unusedLabel,
        dataSources: dataSourceType.getUnusedInstances(this.model().getters),
      });
    }

    return unusedDataSourcesCategories;
  });
}
