import {
  ClipboardInterface,
  ClipboardReadResult,
} from "../../src/helpers/clipboard/navigator_clipboard_wrapper";
import { ClipboardMIMEType, OSClipboardContent } from "../../src/types";

export class MockClipboard implements ClipboardInterface {
  private content: OSClipboardContent = {};

  async read(): Promise<ClipboardReadResult> {
    return {
      status: "ok",
      content: {
        [ClipboardMIMEType.PlainText]: this.content[ClipboardMIMEType.PlainText],
        [ClipboardMIMEType.Html]: this.content[ClipboardMIMEType.Html],
      },
    };
  }

  async writeText(text: string): Promise<void> {
    this.content[ClipboardMIMEType.PlainText] = text;
    this.content[ClipboardMIMEType.Html] = "";
  }

  async write(content: OSClipboardContent) {
    this.content = {
      [ClipboardMIMEType.PlainText]: content[ClipboardMIMEType.PlainText],
      [ClipboardMIMEType.Html]: content[ClipboardMIMEType.Html],
    };
  }
}

export class MockClipboardData {
  content: OSClipboardContent = {};

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
  const event = new Event(type, { bubbles: true, cancelable: true });
  //@ts-ignore
  event.clipboardData = clipboardData;
  return event;
}
