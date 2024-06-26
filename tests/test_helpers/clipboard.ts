import {
  ClipboardInterface,
  ClipboardReadResult,
} from "../../src/helpers/clipboard/navigator_clipboard_wrapper";
import { ClipboardContent, ClipboardMIMEType } from "../../src/types";

export class MockClipboard implements ClipboardInterface {
  private content: string | undefined = "Some random clipboard content";

  async readText(): Promise<ClipboardReadResult> {
    return { status: "ok", content: this.content || "" };
  }

  async writeText(text: string): Promise<void> {
    this.content = text;
  }

  async write(content: ClipboardContent) {
    this.content = content[ClipboardMIMEType.PlainText];
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
  const event = new Event(type, { bubbles: true, cancelable: true });
  //@ts-ignore
  event.clipboardData = clipboardData;
  return event;
}
