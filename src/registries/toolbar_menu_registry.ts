import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { ComponentConstructor } from "@odoo/owl";
import { PropsOf } from "../types/props_of";

type ToolBarItem<C extends ComponentConstructor = ComponentConstructor> = {
  id: string;
  component: C;
  props: PropsOf<C>;
  sequence: number;
  isVisible?: (env: SpreadsheetChildEnv) => boolean;
};

export class ToolBarRegistry {
  content: { [key: string]: ToolBarItem[] } = {};
  add(key: string): this {
    if (key in this.content) {
      throw new Error(`${key} is already present in this registry!`);
    }
    this.content[key] = [];
    return this;
  }

  addChild(key: string, value: ToolBarItem): this {
    this.content[key].push(value);
    return this;
  }

  replaceChild(childId: string, key: string, value: ToolBarItem): this {
    const items = this.content[key];
    const index = items.findIndex((item) => item.id === childId);
    if (index === -1) {
      throw new Error(`Could not find item with id ${childId} in category ${key}`);
    }
    this.content[key][index] = value;
    return this;
  }

  getEntries(id: string): ToolBarItem[] {
    return this.content[id].sort((a, b) => a.sequence - b.sequence);
  }

  getCategories(): string[] {
    return Object.keys(this.content);
  }
}
