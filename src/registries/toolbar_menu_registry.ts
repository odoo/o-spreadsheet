import { PropsOf } from "../types/props_of";
import { SpreadsheetChildEnv } from "../types/spreadsheet_env";

import { ComponentConstructor } from "../owl3_compatibility_layer";
import { Registry } from "./registry";

type ToolBarItem<C extends ComponentConstructor = ComponentConstructor> = {
  name: string;
  component: C;
  props: PropsOf<C>;
  sequence: number;
  isVisible?: (env: SpreadsheetChildEnv) => boolean;
};

export class ToolBarRegistry extends Registry<ToolBarItem[]> {
  add(key: string): this {
    return super.add(key, []);
  }

  addChild(category: string, item: ToolBarItem): this {
    if (!(category in this.content)) {
      throw new Error(`${category} is not present in this registry!`);
    }
    this.content[category].push(item);
    return this;
  }

  replaceChild(category: string, item: ToolBarItem): this {
    if (!(category in this.content)) {
      throw new Error(`${category} is not present in this registry!`);
    }
    const index = this.content[category].findIndex((elt) => elt.name === item.name);
    if (index !== -1) {
      this.content[category][index] = item;
    }
    return this;
  }

  removeChild(category: string, itemName: string): this {
    if (!(category in this.content)) {
      throw new Error(`${category} is not present in this registry!`);
    }
    const index = this.content[category].findIndex((elt) => elt.name === itemName);
    if (index !== -1) {
      this.content[category].splice(index, 1);
    }
    return this;
  }

  getEntries(category: string): ToolBarItem[] {
    return this.content[category].sort((a, b) => a.sequence - b.sequence);
  }

  getCategories(): string[] {
    return Object.keys(this.content);
  }
}
