import { UuidGenerator } from "../helpers";
import { Registry } from "../registry";
import { UID } from "../types";
import { SpreadsheetChildEnv } from "../types/env";

//------------------------------------------------------------------------------
// Topbar Component Registry
//------------------------------------------------------------------------------
export interface TopbarComponent {
  id: UID;
  component: any;
  isVisible?: (env: SpreadsheetChildEnv) => boolean;
}

class TopBarComponentRegistry extends Registry<TopbarComponent> {
  mapping: { [key: string]: Function } = {};
  uuidGenerator = new UuidGenerator();

  add(name: string, value: Omit<TopbarComponent, "id">) {
    const component: TopbarComponent = { ...value, id: this.uuidGenerator.smallUuid() };
    return super.add(name, component);
  }
}

export const topbarComponentRegistry = new TopBarComponentRegistry();
