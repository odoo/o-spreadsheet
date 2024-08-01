import type { ClipboardContent } from "./../../types/clipboard";
import { ClipboardMIMEType } from "./../../types/clipboard";

export type ClipboardReadResult =
  | { status: "ok"; content: string }
  | { status: "permissionDenied" | "notImplemented" };

export interface ClipboardInterface {
  write(clipboardContent: ClipboardContent): Promise<void>;
  writeText(text: string): Promise<void>;
  readText(): Promise<ClipboardReadResult>;
}

export function instantiateClipboard(): ClipboardInterface {
  return new WebClipboardWrapper(navigator.clipboard);
}

class WebClipboardWrapper implements ClipboardInterface {
  // Can be undefined because navigator.clipboard doesn't exist in old browsers
  constructor(private clipboard: Clipboard | undefined) {}

  async write(clipboardContent: ClipboardContent): Promise<void> {
    try {
      this.clipboard?.write(this.getClipboardItems(clipboardContent));
    } catch (e) {}
  }

  async writeText(text: string): Promise<void> {
    try {
      this.clipboard?.writeText(text);
    } catch (e) {}
  }

  async readText(): Promise<ClipboardReadResult> {
    let permissionResult: PermissionStatus | undefined = undefined;
    try {
      //@ts-ignore - clipboard-read is not implemented in all browsers
      permissionResult = await navigator.permissions.query({ name: "clipboard-read" });
    } catch (e) {}
    try {
      const clipboardContent = await this.clipboard!.readText();
      return { status: "ok", content: clipboardContent };
    } catch (e) {
      const status = permissionResult?.state === "denied" ? "permissionDenied" : "notImplemented";
      return { status };
    }
  }

  private getClipboardItems(content: ClipboardContent): ClipboardItems {
    return [
      new ClipboardItem({
        [ClipboardMIMEType.PlainText]: this.getBlob(content, ClipboardMIMEType.PlainText),
        [ClipboardMIMEType.Html]: this.getBlob(content, ClipboardMIMEType.Html),
      }),
    ];
  }

  private getBlob(clipboardContent: ClipboardContent, type: ClipboardMIMEType): Blob {
    return new Blob([clipboardContent[type] || ""], {
      type,
    });
  }
}
