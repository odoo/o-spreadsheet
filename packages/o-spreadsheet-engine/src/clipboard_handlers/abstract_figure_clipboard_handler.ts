import { Rect } from "..";
import { isDefined } from "../helpers";
import { rectUnion } from "../helpers/rectangle";
import { ClipboardFigureData } from "../types/clipboard";
import { ClipboardHandler } from "./abstract_clipboard_handler";

export class AbstractFigureClipboardHandler<T> extends ClipboardHandler<T> {
  copy(data: ClipboardFigureData): T | undefined {
    return;
  }

  getCopyRect(data: ClipboardFigureData): Rect {
    const figuresUI = data.figureIds
      .map((id) => this.getters.getFigure(data.sheetId, id))
      .filter(isDefined)
      .map((f) => this.getters.getFigureUI(data.sheetId, f));
    return rectUnion(...figuresUI);
  }
}
