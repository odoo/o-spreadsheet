import { ClipboardMIMEType, OSClipboardContent } from "../../src";
import { AllowedImageMimeTypes } from "../../src/types/image";
import { MockClipboardItem, mockClipboard } from "../setup/clipboard.mock";
import { nextTick } from "./helpers";

/**
 * Read the OS clipboard directly from the mock, without going through
 * `NavigatorClipboardPlugin.read()`, so that a bug in the plugin cannot make an
 * assertion silently pass.
 */
export async function getOsClipboardContent(): Promise<OSClipboardContent> {
  const content: OSClipboardContent = {};
  for (const item of mockClipboard.items) {
    for (const type of item.types) {
      const blob = await item.getType(type);
      content[type] = AllowedImageMimeTypes.includes(type as (typeof AllowedImageMimeTypes)[number])
        ? blob
        : await blob.text();
    }
  }
  return content;
}

/** Fully replace the OS clipboard, as any application copying something would do */
export function setOsClipboardContent(content: OSClipboardContent) {
  mockClipboard.items = [new MockClipboardItem({ ...content } as Record<string, Blob | string>)];
}

export function setOsClipboardText(text: string) {
  setOsClipboardContent({ [ClipboardMIMEType.PlainText]: text });
}

/** The OS clipboard is filled asynchronously after a copy, it might take a few ticks */
export async function waitForOsClipboardContent(maxTicks = 20): Promise<OSClipboardContent> {
  for (let i = 0; i < maxTicks; i++) {
    const content = await getOsClipboardContent();
    if (Object.keys(content).length) {
      return content;
    }
    await nextTick();
  }
  throw new Error(`The OS clipboard is still empty after ${maxTicks} ticks`);
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
