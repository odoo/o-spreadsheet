import { BasePlugin } from "../base_plugin";
import { Workbook, GridCommand } from "../types";
import { PartialWorkbookDataWithVersion, WorkbookData } from "../import_export";

export class EntityPlugin extends BasePlugin {
  entities: { [key: string]: { [key: string]: any } } = {};

  getters = {
    getEntity: (kind: string, key: string) => this.getEntity(kind, key)
  };

  constructor(workbook: Workbook, data: PartialWorkbookDataWithVersion) {
    super(workbook, data);
    if (data.entities) {
      this.entities = JSON.parse(JSON.stringify(data.entities));
    }
  }

  dispatch(cmd: GridCommand) {
    switch (cmd.type) {
      case "ADD_ENTITY":
        if (!(cmd.kind in this.entities)) {
          this.entities[cmd.kind] = {};
        }
        this.entities[cmd.kind][cmd.key] = cmd.value;
        break;

      case "REMOVE_ENTITY":
        if (!(cmd.kind in this.entities) || !(cmd.key in this.entities[cmd.kind])) {
          return;
        }
        delete this.entities[cmd.kind][cmd.key];
        break;
    }
  }

  export(data: WorkbookData) {
    data.entities = JSON.parse(JSON.stringify(this.entities));
  }

  getEntity(type: string, key: string): any {
    if (!(type in this.entities) || !(key in this.entities[type])) {
      throw new Error(`Could not find ${type}/${key} in entities.`);
    }
    return this.entities[type] && this.entities[type][key];
  }

  getEntities(type: string): { [key: string]: any } {
    if (!(type in this.entities)) {
      throw new Error(`Could not find ${type} in entities.`);
    }
    return this.entities[type];
  }
}
