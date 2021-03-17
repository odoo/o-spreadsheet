import { Style, UID, WorkbookData } from "../../../types";
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

  import(data: WorkbookData) {
    for (const [id, style] of Object.entries(data.styles)) {
      this.content[id] = style;
    }
    // TODO Getnextid should be updated
  }

  export(data: WorkbookData) {
    for (const [id, style] of Object.entries(this.content)) {
      data.styles[id] = style;
    }
  }
}
