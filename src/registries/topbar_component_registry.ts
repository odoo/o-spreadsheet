import { UuidGenerator } from "@odoo/o-spreadsheet-utils";
import { UID } from "../types";
import { SpreadsheetChildEnv } from "../types/env";
import { Registry } from "./registry";

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

  add(name: string, value: Omit<TopbarComponent, "id">) {
    const component: TopbarComponent = { ...value, id: this.uuidGenerator.uuidv4() };
    return super.add(name, component);
  }

  getAllOrdered(): TopbarComponent[] {
    return this.getAll().sort((a, b) => a.sequence - b.sequence);
  }
}

export const topbarComponentRegistry = new TopBarComponentRegistry();
