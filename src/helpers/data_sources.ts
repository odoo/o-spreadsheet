import { EventBus } from "@odoo/owl";
import { ModelConfig } from "../model";

type DataSourceConstructor = new (custom: ModelConfig["custom"], params: unknown) => unknown;

export class DataSources extends EventBus {
  private dataSources: Record<string, unknown> = {};

  constructor(private custom: ModelConfig["custom"]) {
    super();
  }

  add(id: string, cls: DataSourceConstructor, params: unknown) {
    this.dataSources[id] = new cls(this.custom, params);
    return this.dataSources[id];
  }

  get(id: string) {
    return this.dataSources[id];
  }

  contains(id: string) {
    return id in this.dataSources;
  }

  getAll() {
    return Object.values(this.dataSources);
  }
}
