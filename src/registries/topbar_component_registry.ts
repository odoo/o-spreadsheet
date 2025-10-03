import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
import { UuidGenerator } from "../helpers";
import { UID } from "../types";
import { SpreadsheetChildEnv } from "../types/env";

//------------------------------------------------------------------------------
// Topbar Component Registry
//------------------------------------------------------------------------------
export interface TopbarComponent {
  id: UID;
  component: any;
  isVisible?: (env: SpreadsheetChildEnv) => boolean;
  sequence: number;
}

class TopBarComponentRegistry extends Registry<TopbarComponent> {
  mapping: { [key: string]: Function } = {};
  uuidGenerator = new UuidGenerator();

  replace(name: string, value: Omit<TopbarComponent, "id">) {
    const component: TopbarComponent = { ...value, id: this.uuidGenerator.uuidv4() };
    return super.replace(name, component);
  }

  getAllOrdered(): TopbarComponent[] {
    return this.getAll().sort((a, b) => a.sequence - b.sequence);
  }
}

export const topbarComponentRegistry = new TopBarComponentRegistry();
