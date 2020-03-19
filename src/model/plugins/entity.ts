import { BasePlugin } from "../base_plugin";
import { WorkbookData } from "../import_export";
import { GridCommand } from "../types";

export class EntityPlugin extends BasePlugin {
  static getters = ["getEntity", "getEntities"];

  entities: { [kind: string]: { [key: string]: any } } = {};

  import(data: WorkbookData) {
    if (data.entities) {
      this.entities = JSON.parse(JSON.stringify(data.entities));
    }
  }

  export(data: WorkbookData) {
    data.entities = JSON.parse(JSON.stringify(this.entities));
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

  getEntity(kind: string, key: string): any {
    if (!(kind in this.entities) || !(key in this.entities[kind])) {
      throw new Error(`Could not find ${kind}/${key} in entities.`);
    }
    return this.entities[kind] && this.entities[kind][key];
  }

  getEntities(kind: string): { [key: string]: any } {
    if (!(kind in this.entities)) {
      throw new Error(`Could not find ${kind} in entities.`);
    }
    return this.entities[kind];
  }
}
