import { Style, UID } from "../../../types";
import { Manager } from "./manager";

export class StyleManager extends Manager<Style> {
  register(style: Style): UID {
    const s = JSON.stringify(style);
    for (const id in this.content) {
      if (JSON.stringify(this.content[id]) === s) {
        return id;
      }
    }
    return super.register(style);
  }
}
