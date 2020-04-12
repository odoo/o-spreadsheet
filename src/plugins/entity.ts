import { Command, WorkbookData } from "../types/index";
import { BasePlugin } from "../base_plugin";

export class EntityPlugin extends BasePlugin {
  static getters = ["getEntity", "getEntities"];

  private entities: { [kind: string]: { [key: string]: any } } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
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

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    if (data.entities) {
      this.entities = JSON.parse(JSON.stringify(data.entities));
    }
  }

  export(data: WorkbookData) {
    data.entities = JSON.parse(JSON.stringify(this.entities));
  }
}
