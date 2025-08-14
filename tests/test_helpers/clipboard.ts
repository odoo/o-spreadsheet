import {
  ClipboardInterface,
  ClipboardReadResult,
} from "../../packages/o-spreadsheet/src/helpers/clipboard/navigator_clipboard_wrapper";
import { ClipboardMIMEType, OSClipboardContent } from "../../packages/o-spreadsheet/src/types";

export class MockClipboard implements ClipboardInterface {
  content: OSClipboardContent = {};

  async read(): Promise<ClipboardReadResult> {
    return {
      status: "ok",
      content: { ...this.content },
    };
  }

  async writeText(text: string): Promise<void> {
    this.content[ClipboardMIMEType.PlainText] = text;
    this.content[ClipboardMIMEType.Html] = "";
  }

  async write(content: OSClipboardContent) {
    this.content = { ...content };
  }
}

// jsDom does not support the creation of FileList
// https://github.com/jsdom/jsdom/blame/main/lib/jsdom/living/file-api/FileList-impl.js#L7
class MockFileList extends Array<File> implements FileList {
  item(index: number): File | null {
    return this[index] || null;
  }
}

export class MockClipboardData {
  content: OSClipboardContent = {};
  files: MockFileList = new MockFileList();

  setText(text: string) {
    this.content[ClipboardMIMEType.PlainText] = text;
  }

  getData<T extends keyof OSClipboardContent>(type: T): OSClipboardContent[T] {
    return this.content[type];
  }

  setData<T extends keyof OSClipboardContent>(type: T, content: OSClipboardContent[T]) {
    this.content[type] = content;
    if (type.startsWith("image")) {
      this.files.push(content as File);
    }
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
