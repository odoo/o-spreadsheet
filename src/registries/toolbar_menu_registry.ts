import { ComponentConstructor } from "@odoo/owl";
import { PropsOf } from "..";

type ToolBarItem<C extends ComponentConstructor = ComponentConstructor> = {
  component: C;
  props: PropsOf<C>;
  sequence: number;
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

  getEntries(id: string): ToolBarItem[] {
    return this.content[id].sort((a, b) => a.sequence - b.sequence);
  }

  getCategories(): string[] {
    return Object.keys(this.content);
  }
}
