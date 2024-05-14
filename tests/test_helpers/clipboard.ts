import {
  ClipboardInterface,
  ClipboardReadResult,
  ClipboardReadTextResult,
} from "../../src/helpers/clipboard/navigator_clipboard_wrapper";
import { ClipboardContent, ClipboardMIMEType } from "../../src/types";

export class MockClipboard implements ClipboardInterface {
  private content: ClipboardContent = {};

  async readText(): Promise<ClipboardReadTextResult> {
    return {
      status: "ok",
      content: this.content[ClipboardMIMEType.PlainText] ?? "",
    };
  }

  async read(): Promise<ClipboardReadResult> {
    return {
      status: "ok",
      content: {
        [ClipboardMIMEType.PlainText]: this.content[ClipboardMIMEType.PlainText],
        [ClipboardMIMEType.Html]: this.content[ClipboardMIMEType.Html],
        [ClipboardMIMEType.OSpreadsheet]: this.content[ClipboardMIMEType.OSpreadsheet],
      },
    };
  }

  async writeText(text: string): Promise<void> {
    this.content[ClipboardMIMEType.PlainText] = text;
    this.content[ClipboardMIMEType.Html] = "";
    this.content[ClipboardMIMEType.OSpreadsheet] = "";
  }

  async write(content: ClipboardContent) {
    this.content = {
      [ClipboardMIMEType.PlainText]: content[ClipboardMIMEType.PlainText],
      [ClipboardMIMEType.Html]: content[ClipboardMIMEType.Html],
      [ClipboardMIMEType.OSpreadsheet]: content[ClipboardMIMEType.OSpreadsheet],
    };
  }
}

export class MockClipboardData {
  content: ClipboardContent = {};

  setText(text: string) {
    this.content[ClipboardMIMEType.PlainText] = text;
  }

  getData(type: ClipboardMIMEType) {
    return this.content[type] || "";
  }

  setData(type: ClipboardMIMEType, content: string) {
    this.content[type] = content;
  }

  get types() {
    return Object.keys(this.content);
  }
}

export function getClipboardEvent(
  type: "copy" | "paste" | "cut",
  clipboardData: MockClipboardData
) {
  const event = new Event(type, { bubbles: true });
  //@ts-ignore
  event.clipboardData = clipboardData;
  return event;
}
