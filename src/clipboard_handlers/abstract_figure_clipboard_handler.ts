import { ClipboardFigureData } from "../types";
import { ClipboardHandler } from "./abstract_clipboard_handler";

export class AbstractFigureClipboardHandler<T> extends ClipboardHandler<T> {
  copy(data: ClipboardFigureData): T | undefined {
    return;
  }
}
