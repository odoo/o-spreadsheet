import { ComponentConstructor } from "@odoo/owl";
import { PropsOf } from "..";

type ToolBarItem<C extends ComponentConstructor = ComponentConstructor> = {
  component: C;
  props: PropsOf<C>;
  sequence: number;
};

export class ToolBarRegistry {
  content: { [key: string]: ToolBarItem[] } = {};
  add(key: string): ToolBarRegistry {
    this.content[key] = [];
    return this;
  }

  addChild(key: string, value: ToolBarItem): ToolBarRegistry {
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
